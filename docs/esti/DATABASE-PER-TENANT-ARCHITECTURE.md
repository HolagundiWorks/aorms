# Database-per-tenant architecture (2026-09-19)

## Why this doc exists, and how it relates to the RLS multi-tenancy work

Earlier in this same build cycle, AORMS shipped **real multi-tenancy** via
Postgres RLS: every business table in the `aorms-web` Supabase project
grew a `firm_id` column, scoped by `current_firm_id()` (resolved from the
signed-in profile), so multiple Studios could share one database safely.
That work (migrations `0053`–`0068`) is live and unchanged by this doc.

The direction has since changed: instead of many Studios sharing one
database with row-level isolation, **each Studio/firm/company gets its own
dedicated database**. Identity, licensing, support, and platform-admin
data stay shared, in `aorms-platform`, exactly as today.

**This is not a rewrite of the RLS work — it's a superset.** The plan
below keeps `aorms-web` as the *default tenant*: any Studio without a
dedicated database registered keeps working exactly as it does today,
isolated from other Studios by the RLS policies already shipped. A
Studio only moves to true physical isolation once it has a real
provisioned database of its own. Nothing regresses; nothing is thrown
away.

## Target model

| Data | Lives in |
| --- | --- |
| Identity (accounts, sessions), licensing ("sysdex"), support tickets ("helpdex"), platform admin/activity log, Studio directory | `aorms-platform` (unchanged — this is "our Supabase" per the new direction) |
| Marketing/site content (landing pages, blog) | Stays wherever it lives today — not tenant business data, out of scope for this move |
| Each Studio's AORMS Office Hub data (clients, projects, tasks, invoices, proposals, estimates, drawings, HR, etc. — the ~98 tables under `web/supabase/migrations/`) | **A dedicated database per Studio**, registered in `aorms-platform.tenant_databases` |

## What's built so far (this pass)

1. **`platform.tenant_databases`** (migration
   [`0034_tenant_databases.sql`](../../platform/supabase/migrations/0034_tenant_databases.sql),
   applied live to `aorms-platform`) — the registry. One row per Studio:
   which provider it's on, its API URL, and its secrets — never stored in
   plaintext, always a `vault.secrets` id. Read is gated to the Studio's
   own `OWNER` or platform staff (`is_studio_owner()` / `is_platform_admin()`,
   the same helpers `studios`-adjacent tables already use); write is
   platform-staff only. `get_tenant_db_secret(studio_id, kind)` is the one
   sanctioned way to read a decrypted secret through RLS.
2. **`web/scripts/provision-tenant-db.mjs`** — given a Studio id and an
   already-created target Supabase project's ref + keys, applies every
   file in `web/supabase/migrations/` to it (same Management-API pattern
   this whole build has used all along — no new runtime dependency), then
   registers the result in `tenant_databases` with `status = READY`. Only
   handles a Supabase-project target so far (see Provisioning below for
   why a raw self-hosted-Postgres target is a separate, unwritten path).

**Deliberately not touched yet:** `web/lib/supabase/server.ts`'s
`createClient()` — the single choke point nearly every Server
Action/Route Handler uses to reach the database. See § Why connection
routing isn't flipped yet.

## The real blocker: where do tenant databases actually run?

Confirmed live via the Supabase Management API this pass: this
organization ("STUDIO DB", `hbkkehjcuzuarnyxlmub`) is on the **free
plan**, already hosting the two projects it's allowed
(`aorms-web`, `aorms-platform`). A free-plan org gets two projects, full
stop — a third project requires upgrading to a paid plan, which is a real
recurring cost per project. I can't authorize that spend or enter payment
details on the org's behalf (those are both outside what I'm allowed to
do unilaterally, regardless of "autopilot" framing) — this is the one
genuine decision only the account owner can make.

Two realistic paths, both still open:

1. **One Supabase project per Studio.** Simplest to build (the
   provisioning script above already works against this target
   unmodified) and keeps `web/`'s existing `@supabase/ssr`-based code
   nearly untouched. Cost scales linearly with Studio count — Supabase
   Pro pricing, per project, not a one-time cost.
2. **Self-hosted Postgres + PostgREST + GoTrue (the open-source Supabase
   stack) on the existing Hostinger VPS, one stack per Studio, or one
   Postgres cluster with one database per Studio fronted by per-tenant
   PostgREST instances.** No new recurring cloud cost, and it's the same
   stack this repo already knows how to run (`web/supabase/` and
   `platform/supabase/` both ran as local Supabase CLI stacks earlier in
   this project, via Podman). Needs real provisioning automation
   (spin up containers, apply migrations, wire a gateway/routing layer)
   that nobody has written yet, and — critically — **this session has no
   remote execution access to that VPS** (no SSH/exec tool available), so
   I can't stand this up myself right now even in autopilot mode.

Neither path was picked here. `provision-tenant-db.mjs` is written to
need only "a target that already exists" — whichever path is chosen, the
script (or its self-hosted-Postgres sibling, not yet written) is the
on-ramp, not the blocker.

## Why connection routing isn't flipped yet — the auth consequence

This is the part worth being explicit about, because it's not obvious
from "each Studio gets its own database" alone: **Supabase Auth issues
JWTs scoped to one project.** A session token minted by `aorms-web`'s
Auth won't authenticate against a different project's PostgREST — RLS's
`auth.uid()` only resolves within the same project that issued the
token. So the moment a Studio's business data moves to its own project,
that Studio's users need their session to come from *that project's* Auth,
not a shared one.

Concretely, this means the plain email+password sign-in that most current
users (including the public demo account) rely on today would need to
become **per-tenant** — the identity portal (`aorms-platform`, which stays
shared) resolves *which* Studio a person belongs to, then hands them off
into a session against that Studio's own tenant project. That handoff
mechanism (a signed one-time link, or a service-role-minted session on the
tenant project) doesn't exist yet and is a real design-and-build task of
its own — comparable in size to the original AORMS Identity federation
work already in this codebase (`web/lib/platform/*`), not a small addition.

Flipping `createClient()` to route per-tenant before that handoff exists
would either do nothing (no Studio has a `tenant_databases` row yet, so
every request still falls back to `aorms-web`) or, if forced, strand
every current session with a token that doesn't match the project it's
suddenly being pointed at. Given nobody would be watching production
while this session's user is away, that's not a risk worth taking blind —
so `createClient()` stays exactly as it is until the auth handoff is
designed, not just the routing table.

## Staged rollout (mirrors how the RLS multi-tenancy batches worked)

1. ✅ **Registry** — `tenant_databases` + secret access function (this pass).
2. ✅ **Migration runner** — `provision-tenant-db.mjs`, Supabase-project
   target (this pass).
3. **Hosting decision** — pick Supabase-project-per-tenant vs.
   self-hosted-per-tenant. Needs the account owner (cost/infra call).
4. **Auth handoff design** — how a platform-identity session becomes a
   tenant-project session. Its own design pass, not a drive-by addition.
5. **`createClient()` becomes tenant-aware** — reads the active Studio's
   `tenant_databases` row (via a platform service-role lookup, not the
   browser-facing RLS path) and builds the Supabase client against it;
   falls back to `aorms-web`'s current env vars when no row exists yet.
   Single choke point, so every existing Server Action/Route Handler picks
   this up automatically — no per-file changes needed.
5. **Self-hosted-Postgres provisioning path**, if path 2 above is chosen —
   a sibling script to `provision-tenant-db.mjs` using a raw Postgres
   driver instead of the Management API, plus whatever container
   orchestration stands up Postgres+PostgREST+GoTrue per Studio.
6. **Migrate the first real Studio** off the shared `aorms-web` fallback
   onto its own dedicated database, end-to-end, verified live — the same
   "verify with two real sessions, not just policy text" discipline the
   RLS rollout used.
7. **Backfill remaining Studios**, one at a time, each independently
   verified.

Nothing here requires touching `aorms-web`'s existing data or breaking
any current session before step 5 — steps 1–2 (done) and the eventual
self-hosted script are pure additions.
