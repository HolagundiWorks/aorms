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
| 5. AI provider abstraction (chat only — see below) | ✅ Built, not yet wired into live call sites | this doc, § AI provider abstraction |
| 6. Esti tool layer (Esti calls AORMS, not the reverse) | ✅ Wired into `askEsti()` | this doc, § Esti tool layer wired in |
| 7. Google Drive document layer | ✅ OAuth flow + metadata schema live; unblocked 2026-09-20 | this doc, § Google Drive |
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

**A real gap found and fixed while verifying it — took two follow-up
passes to actually close, worth knowing the full shape of:**
`revoke execute on function ... from anon, authenticated` does **not**
actually close anon/authenticated access on its own — Postgres also
grants EXECUTE to the `PUBLIC` pseudo-role by default on function
creation, and every role inherits through `PUBLIC` membership regardless
of what's separately revoked from it by name (`0072_fix_public_execute_
grant_gap.sql` closed this for the events/workflow functions).

**That wasn't the whole story.** Two brand-new functions in the Google
Drive migration (`0073`) were created with `revoke ... from public`
*only* (no separate `anon, authenticated` revoke), and
`information_schema.routine_privileges` still showed `anon`/
`authenticated` as **direct** grantees afterward — not inherited through
`PUBLIC` at all. The `0072` fixes had only worked because those functions
*also* already had an explicit `anon, authenticated` revoke from an
earlier migration (`0070`) — two fixes stacking, not one sufficient fix.
Near as can be determined, Supabase manages a default-privilege grant
(`ALTER DEFAULT PRIVILEGES ... GRANT EXECUTE ... TO anon, authenticated,
service_role`) that fires directly on every new `public`-schema function
at creation time, independent of the `PUBLIC` pseudo-role.

**The real, complete fix, going forward:** revoke from all three in one
statement — `revoke execute on function X from public, anon,
authenticated;` — for anything not meant to be end-user-callable, in the
*same* migration that creates it. Verify with a direct
`information_schema.routine_privileges` query every time; `get_advisors`
is a useful summary but its cached view can miss the direct-grant case,
so don't treat it alone as ground truth. Fixed live for `0073`'s two
functions (`0074_fix_drive_functions_grant_gap.sql`), re-verified.

**This gap likely exists on other pre-existing internal-only functions
from earlier in this build** — `reset_demo_data()` confirmed still
callable by an anonymous request today via the `PUBLIC` path (not
independently re-checked for the direct-grant path). Not fixed here —
flagged for the dedicated audit already spun off as a background task,
which has been sent this corrected methodology.

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

## AI provider abstraction (phase 5)

`web/lib/ai/provider.ts` — a minimal `AIProvider` interface, one
capability (`chat`) since that's the only one any real call site uses
today (embed/transcribe/vision aren't declared until something actually
needs them). `providers/ollama-provider.ts` wraps the existing
`lib/ai/ollama.ts` calls behind it — same self-hosted-in-production/
native-in-dev Ollama this repo has always used, zero behavior change.
`resolve-provider.ts` always returns it for now, structured as a
resolver so a firm-level connector choice (mirroring `tenant_databases`'
connector modes) can select a `customer_api` or `desktop_agent` provider
later without touching any caller. `run-chat.ts` centralizes the
health-check → chat → redact → fallback shape that `askEsti`/
`generateAiDraft`/`generateDailyBrief` each currently hand-roll
identically and separately.

**Deliberately not wired into those 3 call sites yet.** They're live,
shipped, working features — migrating them onto `runChat()` is a small,
separate, carefully-reviewed change, not bundled into adding the
abstraction itself; doing both at once risks a subtle regression in a
production feature with nobody watching to catch it. `tsc --noEmit` and
`eslint` both clean on the new files; not yet runtime-tested against a
live Ollama instance (the wrapped functions are 1:1 delegations to
already-used, unmodified code, so the risk surface is low, but this is
still real and worth stating plainly rather than implying more
verification happened than did).

## Google Drive (phase 7 — unblocked 2026-09-20)

Real Google OAuth 2.0 credentials (client ID + secret, "Web application"
type) were provided and stored — locally in `web/.env` (gitignored, never
committed), not yet set in Hostinger's production environment variables
(see below for why that step is deliberately separate). Built and
live-verified this pass:

- `drive_connections` / `documents` (`0073_google_drive_connector.sql`,
  aorms-web) — one Drive connection per firm, refresh token always via
  `vault.secrets`, document metadata only (no file bytes ever touch
  Supabase), matching AORMS-V2-DEVELOPER-GUIDELINES.md § 7 almost
  field-for-field (see that doc's own § Reconciling for the one
  deliberate difference: `firm_id`, not `company_id`, to stay consistent
  with the other ~98 tables).
- `web/lib/drive/oauth.ts` — the OAuth web-server flow, verified against
  Google's own docs (not guessed): authorize-URL construction, code-for-
  tokens exchange, refresh-token exchange. Requests `drive.file` scope
  only (files AORMS creates or the user explicitly picks via a Picker),
  not full `drive` access — the narrower, least-privilege default; a
  future "map an existing folder structure" feature (guidelines § 8)
  would need to request broader access explicitly, as its own documented
  scope escalation.
- `startDriveConnection()` (`lib/actions/drive.ts`) + the callback Route
  Handler (`app/api/drive/oauth/callback/route.ts`) — the callback uses
  the signed-in user's own session client, so `store_drive_refresh_
  token()`'s internal `has_capability('write')` + firm-match check is
  what actually authorizes the write, not a special-cased service-role
  path.
- Auth URL construction, state encode/decode, and the token-exchange
  request shape were runtime-tested (not just type-checked) against
  Google's documented format. The full live round trip (real Google
  consent screen → real refresh token → real Drive API call) has **not**
  been exercised — that needs a real browser click-through, not something
  this session did.

**Deliberately not done yet:** no UI surfaces `startDriveConnection()`
anywhere (no button on `/firm-settings`); no Drive-file-listing/sync code
exists (`documents` rows have nowhere to come from yet); production
Hostinger env vars don't have the Google credentials set — that replace-
the-whole-set endpoint is destructive (see below) and there's no live
feature yet that would need them in production.

## Desktop Agent (phase 8 — still blocked)

A new, separate codebase (not a `web/` addition) — a local Windows/Mac
app that talks to Ollama/Whisper/CAD tools and exposes them to AORMS over
a secure connection. Before writing it, need a decision on: distribution
(installer vs. a background service the user runs manually), whether it
needs code signing (unsigned `.exe` triggers Windows SmartScreen
warnings — a real adoption blocker for IT-cautious staff), and how it
authenticates back to AORMS (a paired device token, most likely,
mirroring `ai_devices`/`ai-devices.ts`, which already exists for a
related purpose — worth reusing rather than inventing a second pairing
flow). AORMS-V2-DEVELOPER-GUIDELINES.md § 26-27 sets the shape (outbound-
only connection, explicit per-capability permissions, no unrestricted
shell by default) but not these deployment specifics.

## Esti tool layer wired in (phase 6 — done)

`askEsti()` (`lib/actions/ai.ts`) now calls `runAgenticChat()` with the 3
tools from phase 5 (`get_studio_snapshot`, `list_open_tasks`,
`search_project_records`) instead of always baking a fixed "Live
snapshot" block into every prompt — ESTI decides per question whether it
needs a tool at all. Safe to do because `askEsti` remains unreachable
from any live page (confirmed via a fresh grep, same finding as earlier
this session — the header's own "Ask ESTI" was replaced by "Daily Brief"
on 2026-09-10, and nothing else calls it), so this carries zero
regression risk to a working feature. `ai_runs.sources` now reflects
which tools actually ran, replacing the previously-always-empty array
`daily-brief.ts`'s own comment had flagged.

`tsc --noEmit` and `eslint` both clean. **Not runtime-tested against a
live model** — no Ollama instance is reachable in this environment
(confirmed: `curl http://127.0.0.1:11434/api/tags` returns nothing), so
only the graceful-fallback path (no health → `MOCK_FALLBACK`) has real
runtime verification, from `runChat`/`runAgenticChat`'s own standalone
tests. The tool-calling round trip itself needs a real Ollama + a
tool-capable model (llama3.1+) to actually exercise, and/or a UI surface
to reach `askEsti` from at all — both real remaining steps, not silently
declared done.

## Google Sign-In (§5 — code and Supabase config both live; one Google Cloud step left)

Built and verified end-to-end against the real `aorms-platform` Supabase
Auth endpoint (not just type-checked): `signInWithGoogle()`
(`lib/actions/platform.ts`) calls `signInWithOAuth({ provider: "google"
})` against the Platform project (not `aorms-web` directly — the frozen
spec's flow lands in "AORMS User" then "Create/Join Practice," which is
the Platform's job). Reuses the existing generic PKCE callback
(`app/(platform)/platform-auth-callback/route.ts`, originally built for
magic links/password reset — `exchangeCodeForSession` is the same
mechanism OAuth uses, so it needed zero changes) rather than writing a
second callback. "Continue with Google" added to both `/platform-login`
and `/platform-signup` (the same action serves both — Google OAuth
creates the account on first use, no separate signup step).

**The provider is now enabled** (`PATCH /v1/projects/qbgbnhthchhbammzeebg/
config/auth` with `external_google_enabled/client_id/secret`, approved
2026-09-20 — took roughly 2 minutes to actually propagate to the live
Auth endpoint after the config API confirmed the change; a same-second
retry still 400s with "provider is not enabled," don't read that as
failure). Verified live on **production** (`identity.aorms.in`), not
just locally: clicking "Continue with Google" now reaches Google's real
consent screen with the correct client ID and `redirect_uri`
(`https://qbgbnhthchhbammzeebg.supabase.co/auth/v1/callback`) — Google
itself then blocks it with `Error 400: redirect_uri_mismatch`, because
that URI isn't registered on the Google Cloud OAuth client yet.

**One remaining step, only the account owner can do it**: Google Cloud
Console → APIs & Services → Credentials → the OAuth client (the one
whose ID/secret are in `web/.env`) → Authorized redirect URIs → add
`https://qbgbnhthchhbammzeebg.supabase.co/auth/v1/callback` → Save. No
code or Supabase-side changes needed after that — the flow is otherwise
fully wired and live.

## Hostinger deploy — a manual deploy was never actually needed

The Hostinger connector is now genuinely connected (387 tools — hosting,
VPS, DNS, domains, mail, billing). Confirmed live: `aorms.in` and 3 other
subdomains (`identity.`, `connectdex.`, `sysdex.`) are all the same
`web/` deployment, routed by hostname (see `lib/platform/subdomains.ts`).

**Important finding, 2026-09-20:** this site already has **Git
auto-deploy configured** (`hosting_getGitAutoDeploymentSettingsV1` on
`aorms.in` → `HolagundiWorks/aorms`, branch `main`, `is_enabled: true`) —
`hosting_listNodeJSBuildsV1` shows a completed build for *every commit
this entire session pushed*, automatically, within minutes of each push.
The Google-provider-toggle permission block earlier led to a manual
`git archive` → TUS upload → `hosting_startNode_jsBuildV1` deploy attempt
that turned out to be unnecessary work — once approved and run to
completion, it just re-deployed content that auto-deploy had already
shipped. Confirmed by checking the live site directly: the landing page
V2 content and the "Continue with Google" button were both already live
on `aorms.in`/`identity.aorms.in` before the manual build even finished.
**For any future session: check `hosting_getGitAutoDeploymentSettingsV1`
before attempting a manual deploy** — if `is_enabled: true`, pushing to
`main` is the entire deploy step.

**Production env vars, deliberately not touched**:
`hosting_replaceNode_jsEnvironmentVariablesV1` is a **full replace** —
anything not included gets deleted, and existing values come back
masked, so there's no way to safely read-then-merge. Setting the new
Google OAuth vars there now, before any Drive UI exists to use them,
would risk wiping the live Supabase/Ollama/other secrets for zero
benefit. Do this once there's a real feature ready to ship that needs
them — reconstruct the full var set from `web/.env`'s real values (this
repo's own established convention: `.env`'s values are what production
actually runs), not from the masked list.

## Supabase org — still free plan

Confirmed live via the Supabase MCP connector (2026-09-20) — capped at 2
projects. Doesn't block anything in phases 1-7 (all live in the existing
2 projects), but it's the wall phase 2's Mode B hits at scale: every
additional Studio that wants `customer_supabase` isolation needs its own
paid-plan project. Worth knowing before more than a couple of Studios opt
into that mode.

## Non-blockers — proceeding without asking

Everything in phases 4-6 that stays inside the existing two Supabase
projects and existing web/ codebase — no new external accounts, no new
credentials, no irreversible action. Each still gets its own live
verification (real rows, real triggers fired, cleaned up afterward) and
its own commit before moving to the next, same discipline as every prior
migration this session.
