# Events system + connector modes (2026-09-20)

## Where this fits

This is the first buildable slice of a lightweight event/workflow
architecture proposed as a deliberate simplification: keep the cloud
footprint small (Supabase + Next.js, no Kafka/Redis/Kubernetes/dedicated
vector DB/dedicated workflow SaaS at this scale), move heavy work and
storage out to Google Drive, the customer's own infrastructure, and an
optional desktop agent. That full architecture is many stages — modular
core refactor, Google Drive document layer, AI provider abstraction,
desktop agent, RAG, CAD automation — and isn't attempted here. This slice
is deliberately narrow: **the events table + real triggers proving it
works, and formalizing the three database connector modes.** No workflow
engine consumes events yet; that's a separate, later migration.

It also resolves an ambiguity from earlier direction ("every firm needs
its own database"): that was never meant to be mandatory for every
Studio. It's one of three connector modes, with the shared, RLS-scoped
`aorms-web` project (migrations 0053-0068,
[DATABASE-PER-TENANT-ARCHITECTURE.md](DATABASE-PER-TENANT-ARCHITECTURE.md))
staying the *default*. Nothing built under that doc is superseded — this
slice's connector-mode migration
(`platform/supabase/migrations/0035_tenant_database_connector_modes.sql`)
extends the `tenant_databases` registry it introduced, not replaces it.

## Events

`public.events` (aorms-web, migration
[`0069_events.sql`](../../web/supabase/migrations/0069_events.sql)):
`firm_id`, `event_type` (e.g. `task.created`), `entity_type`/`entity_id`,
`payload` (jsonb), `status` (`PENDING`/`PROCESSED`/`ERROR`),
`created_at`/`processed_at`. No client-facing INSERT policy — every row
comes from a security-definer trigger function or `emit_event()`, never a
raw `.insert()` from the app, so there's nothing for a write policy to
gate; read is staff-only, firm-scoped, same as every other table.

**Two write paths, both live and verified against the real `aorms-web`
project (real rows inserted, checked, deleted — not just policy text
read):**

1. **Triggers on business tables** — read `firm_id` straight off `NEW`,
   so they fire correctly whether the write came from a live session or a
   service-role job (e.g. the nightly demo-data reset), matching
   `next_ref()`'s own `NEW`-firm_id handling. Wired on 6 events:
   `task.created`, `task.completed` (guarded so a no-op update — status
   already `DONE` — doesn't re-fire), `document.uploaded` (on
   `drawings`), `project.created` (on `project_offices`),
   `snag.created`, `site_instruction.created` (added 2026-09-20, once the
   workflow engine existed as a real consumer — a deliberately later
   addition than the first 4, not an oversight).
2. **`emit_event(event_type, entity_type, entity_id, payload)`** — a
   security-definer RPC for future Server Actions that need to emit an
   event outside a table write (workflow completions, Esti tool calls).
   Not called from application code yet — built now as the sanctioned
   surface, the same way `switch_active_firm()`/`next_ref()` were built
   ahead of every caller that uses them today.

`mark_event_processed(event_id, status, error)` exists for whichever
future consumer processes the queue — also not wired to anything yet,
explicitly not declared "done," just ready.

**What's deliberately not here:** anything that reads `PENDING` events
and acts on them. That's the workflow engine
(`events -> workflow_definitions -> workflow_steps`, condition/action/
approval/delay), a separate future migration once this table has proven
itself. Building the consumer before there's a real event stream to
consume would be guessing at its shape.

## Connector modes

`tenant_databases.provider` (aorms-platform, migration
[`0035_tenant_database_connector_modes.sql`](../../platform/supabase/migrations/0035_tenant_database_connector_modes.sql))
now has 4 values:

| Mode | Value | Status |
| --- | --- | --- |
| A — AORMS managed | `aorms_managed` | **Default** — no row needed at all; the shared `aorms-web` project via RLS |
| B — Customer Supabase | `customer_supabase` | **Built** — `web/scripts/provision-tenant-db.mjs` applies the full migration set to a target project |
| C — Customer API | `customer_api` | **Schema-ready only** — `api_base_url`/`api_auth_secret_id` columns exist; no code path calls out to a customer's API yet |
| — | `self_hosted_postgres` | **Planned** — see DATABASE-PER-TENANT-ARCHITECTURE.md's hosting options; no migration runner written |

A Studio can still have an explicit `aorms_managed` row (not just infer it
from absence) — useful for a future Settings page to show "Database:
AORMS Supabase, Connected" without special-casing "no row."

## What's still not done

- No UI surfaces any of this yet (no Infrastructure Settings page).
- No workflow engine reads `events`.
- `customer_api` mode has no runtime behavior — inserting a row with that
  provider doesn't make AORMS call anything.
- `web/lib/supabase/server.ts`'s `createClient()` is still not
  tenant-aware — see DATABASE-PER-TENANT-ARCHITECTURE.md's own section on
  why that's a separate, later step (the auth-handoff design).
