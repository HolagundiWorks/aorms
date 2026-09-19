# Lightweight AORMS architecture — master plan (2026-09-20)

## Principle

AORMS orchestrates; Supabase stores structured data; Google Drive stores
files; customer AI does intelligence; an optional desktop agent does
heavy/local computation; a lightweight event/workflow layer connects all
of it. No Kafka/Redis/Kubernetes/dedicated vector DB/dedicated workflow
SaaS at this scale — those get reconsidered only once real usage proves
the plain-Postgres versions below can't keep up, not before.

This doc is the single tracker for that direction. Each phase links to
its own design doc (written as the phase lands, not speculatively ahead
of it) and states plainly what's live, what's stubbed, and what's
blocked. Nothing here is marked done until it's been verified against a
real Supabase project with real rows — this repo's standing discipline
all session, not new for this doc.

## Phase status

| Phase | Status | Doc |
| --- | --- | --- |
| 1. Multi-tenancy (RLS, shared DB) | ✅ Live | ROADMAP.md's multi-tenancy entry |
| 2. Database-per-tenant registry + connector modes | ✅ Live (Mode A/B; Mode C schema-only) | [DATABASE-PER-TENANT-ARCHITECTURE.md](DATABASE-PER-TENANT-ARCHITECTURE.md), [EVENTS-AND-CONNECTOR-MODES.md](EVENTS-AND-CONNECTOR-MODES.md) |
| 3. Events table + real triggers | ✅ Live, 4 events wired | [EVENTS-AND-CONNECTOR-MODES.md](EVENTS-AND-CONNECTOR-MODES.md) |
| 4. Workflow engine (events → conditions → actions) | ✅ Live, verified end-to-end | this doc, § Workflow engine |
| 5. AI provider abstraction (chat/embed/transcribe/vision) | ⏳ Not started | — |
| 6. Esti tool layer (Esti calls AORMS, not the reverse) | ⏳ Not started, depends on 5 | — |
| 7. Google Drive document layer | 🔴 Blocked — needs a Google Cloud OAuth app | this doc, § Blockers |
| 8. Desktop Agent (Ollama/Whisper/CAD/local files) | 🔴 Blocked — new codebase, distribution/signing decisions | this doc, § Blockers |
| 9. RAG over Drive documents | ⏳ Not started, depends on 7 | — |
| 10. CAD/architecture automation (DWG/Revit tooling) | ⏳ Not started, depends on 8 | — |

Phases 1-3 predate and are unaffected by this doc — it formalizes where
they fit in the bigger picture, not a rewrite.

## What's genuinely done vs. what only looks done

Read this section before assuming any phase above is finished:

- **Events (phase 3)** fire on 4 specific writes only (task created/
  completed, drawing uploaded, project created). Nothing else emits an
  event yet — extending coverage is cheap (same trigger pattern) but
  deliberately wasn't done blanket-wide before a real consumer exists to
  prove which events actually matter.
- **Connector modes (phase 2)** — Mode B (`customer_supabase`) is fully
  wired end-to-end (`provision-tenant-db.mjs`). Mode C (`customer_api`)
  is columns-only: creating a `tenant_databases` row with that provider
  does not make AORMS call anything. No live connection-routing exists
  yet regardless of mode — `web/lib/supabase/server.ts`'s `createClient()`
  still always talks to the shared `aorms-web` project. See
  DATABASE-PER-TENANT-ARCHITECTURE.md's own section on why (the
  auth-handoff design, not just routing, is the real remaining work).

## Workflow engine (phase 4 — done this pass)

Live on `aorms-web` (`0071_workflow_engine.sql`), verified end-to-end with
real rows: a "notify on CRITICAL task" workflow correctly fired for a
CRITICAL-priority task and correctly did *not* fire for a MEDIUM one; a
"follow up on uploaded drawings" workflow correctly created a real
follow-up task with the right project/priority/due-date resolved from
the triggering event's payload. Both runs correctly marked their source
events `PROCESSED`. All test data cleaned up afterward.

**A real gap found and fixed while verifying it, worth knowing about
generally:** `revoke execute on function ... from anon, authenticated`
does **not** actually close anon/authenticated access — Postgres grants
EXECUTE to the `PUBLIC` pseudo-role by default on function creation, and
every role inherits through `PUBLIC` membership regardless of what's
separately revoked from it by name. `information_schema.routine_
privileges` still showed `('PUBLIC', 'EXECUTE')` after the first revoke;
the real fix (`0072_fix_public_execute_grant_gap.sql`) targets `PUBLIC`
directly. Re-verified live afterward — zero rows for `PUBLIC`/`anon`/
`authenticated`, `service_role` untouched, triggers still fire correctly.
**This same gap almost certainly exists on other pre-existing
internal-only functions from earlier in this build** — `reset_demo_data()`
confirmed still `PUBLIC`-executable via the same check, i.e. still
callable by an anonymous request today. Not fixed here (out of scope for
this pass, and a wider audit of which functions are meant to be
internal-only vs. genuinely user-callable deserves its own pass rather
than a drive-by fix) — flagged for a dedicated follow-up.

Design:

```
workflow_definitions
  id, firm_id, name, trigger_event_type, enabled, created_by

workflow_steps
  id, workflow_id, step_order, step_type, config (jsonb)
  step_type ∈ (condition, action, notification, delay)
```

A small dispatcher function, `run_due_workflows()`, reads `PENDING`
`events`, matches `workflow_definitions.trigger_event_type`, evaluates
each `condition` step against the event's `payload` (a fixed, small
operator set — `equals`/`gt`/`lt`/`contains` on a payload key — not a
general expression language), and runs `action` steps that match
(currently: `create_task`, `notify` — both writing to tables the app
already has, `tasks`/a new lightweight `notification_log`). Marks the
event `PROCESSED` (or `ERROR` with the failure recorded) via
`mark_event_processed()`.

**Not a cron job yet** — `run_due_workflows()` is a callable function,
not a scheduled one. Wiring it to actually run periodically needs either
Supabase's `pg_cron` (available, not yet enabled on either project) or an
external scheduled call (a Next.js Route Handler + Vercel Cron/an
external pinger, matching `app/api/pulse/recompute/route.ts`'s existing
on-demand-or-cron pattern). Flagged as a real remaining step, not
silently wired.

## Blockers — need your decision, can't proceed alone

1. **Google Drive (phase 7)** needs a Google Cloud project with the
   Drive API enabled and an OAuth 2.0 client (client ID + secret). I
   can't create a new Google Cloud account/project — that's outside what
   I'm allowed to do unilaterally regardless of autopilot framing.
   Once you create one (Google Cloud Console → APIs & Services →
   Credentials → OAuth client ID, type "Web application", redirect URI
   `https://aorms.in/api/drive/oauth/callback`) and share the client ID/
   secret, I can wire the connector.
2. **Desktop Agent (phase 8)** is a new, separate codebase (not a web/
   addition) — a local Windows/Mac app that talks to Ollama/Whisper/CAD
   tools and exposes them to AORMS over a secure connection. Before
   writing it I need your call on: distribution (installer vs. a
   background service the user runs manually), whether it needs code
   signing (unsigned .exe triggers Windows SmartScreen warnings — a real
   adoption blocker for a firm's IT-cautious staff), and how it
   authenticates back to AORMS (a paired device token, most likely,
   mirroring `ai_devices`/`ai-devices.ts`, which already exists for a
   related purpose — worth reusing rather than inventing a second
   pairing flow).
3. **Hostinger deploy** — the `hosting-deploy-nodejs-app` skill is
   available, but its underlying MCP tools aren't authorized in this
   session (confirmed by trying to load them — none are reachable).
   Authorize it via your claude.ai connector settings, then I can deploy
   `web/` directly instead of asking you to trigger it via hPanel.
4. **Supabase org is still on the free plan** (confirmed live via the
   Supabase MCP connector, 2026-09-20) — capped at 2 projects. This
   doesn't block anything in phases 1-6 (all live in the existing 2
   projects), but it's the wall phase 2's Mode B hits at scale: every
   additional Studio that wants `customer_supabase` isolation needs its
   own paid-plan project. Worth knowing before more than a couple of
   Studios actually opt into that mode.

## Non-blockers — proceeding without asking

Everything in phases 4-6 that stays inside the existing two Supabase
projects and existing web/ codebase — no new external accounts, no new
credentials, no irreversible action. Each still gets its own live
verification (real rows, real triggers fired, cleaned up afterward) and
its own commit before moving to the next, same discipline as every prior
migration this session.
