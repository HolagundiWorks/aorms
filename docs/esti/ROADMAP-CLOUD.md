# AORMS Cloud Roadmap (aorms.in / production)

**Status:** ACTIVE — soft launch, sign-in now live on the landing page;
Next.js/Supabase stack migration **in progress** (Phases 1–5 schema+UI done,
6–10 schema-only or not started)  
**Updated:** 2026-09-05  
**Scope:** What ships to the **production VPS** (`aorms.in`) and when — deployment
status, feature rollout to the live office hub, and cloud infrastructure.

---

## Stack migration — Next.js + Supabase (in progress)

Full spec: [NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md).

**Target:** Next.js + TypeScript + Carbon Design System + Supabase, replacing
the current React SPA + tRPC + Fastify + raw PostgreSQL + Python worker stack.
Deployment target moves from the VPS (`compose.prod.yaml`) to Hostinger
Managed App Hosting; Supabase replaces self-hosted PostgreSQL/auth/storage.
**The current production stack stays live and unchanged** until a phase below
is merged and verified — the `web/` package is new, additive code; nothing in
`frontend`/`backend` has been touched by this migration yet.

| Item | Status |
| --- | --- |
| Target-architecture spec written | ✅ [NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md) |
| Repo audit — Phase 2 domains (map current tRPC procedures / Fastify routes / components to Next.js equivalents — see spec § 36–37) | ✅ [NEXTJS-MIGRATION-PHASE2-AUDIT.md](./NEXTJS-MIGRATION-PHASE2-AUDIT.md) — surfaced and resolved a blocking decision (single-tenant per deployment, no `org_id`, decided 2026-09-04). Later phases (3–7) get their own audit pass when their turn comes. |
| **Phase 1 — Foundation** (Next.js + TS + Carbon + Supabase + auth + app shell) | ✅ **Complete, connected to a live Supabase project.** `web/` package — Next.js 16 + Carbon + `@supabase/ssr` wired end-to-end (client/server/proxy), Server Action sign-in/sign-out, Carbon `AppShell` (Header+SideNav), `(auth)/login` + `(app)/dashboard` route groups. `next build --webpack` clean, `eslint web` 0/0. Sign-in verified live through the browser against the real project (landing → Supabase Auth session → Server Component → Carbon shell), including confirming Carbon's classes/CSS vars/IBM Plex font all apply correctly (an initial "looks unstyled" impression was just Carbon's flat `white` theme, not a bug). |
| Phase 2 — Core ERP (orgs, users, roles, clients, projects, tasks) | ✅ **Landing order complete, all four slices verified end-to-end against the live project.** Migration `0001_phase2_core.sql` applied via the SQL Editor (direct DB access was unavailable at the time — Supabase's raw Postgres connection is IPv6-only, this network has no IPv6 route; **resolved 2026-09-04** — see the connection note below). `profiles`/`audit_log`/`firm`/`clients`/`project_offices`/`phases`/`tasks` all exist with RLS live. `/clients`, `/projects`, `/projects/[id]` (phases), and `/tasks` were each built, then verified through the real browser UI (sign in → create a record → confirm it renders correctly, including FK joins and status tags → confirm the `audit_log` row via REST API with correct actor/action/payload) — see the git history on `main` (2026-09-04) for each slice's commit. Deliberately deferred, not forgotten: gap-free `esti_sequence`-style ref numbering (a placeholder count-based `ref` is used); `computeScores`/`flagInterventions`/`todayQueue` task business logic (own `services/tasks/` layer, separate follow-up); the `teamMembers` vs `profiles` FK question for `tasks.assignee_id`/`reviewer_id` (points straight at `profiles` for now, per the Phase 2 audit's suggested fallback). |
| Phase 3 — Commercial (proposals, quotations, contracts, invoices, payments) | ✅ **Schema + UI both live (2026-09-04).** Migrations `0002`–`0004` (`has_capability()`, `sequences`/`next_ref()`, `proposals`/`letters`/`contracts`/`invoices`/`purchase_orders`/`po_items` with RLS matched to the actual router code) applied and verified earlier; `/proposals`, `/letters`, `/contracts`, `/invoices`, `/purchase-orders` built and verified end-to-end afterward — created a real proposal (`PRP/2026-27/0001`) and invoice (`INV/2026-27/0001`) through the live UI, first real use of `next_ref()` from a Server Action, confirmed both `audit_log` rows. Purchase orders included (resolves that Phase 3 open question). **Deliberately incomplete, not forgotten**: invoices don't compute GST (cgst/sgst/igst/tds) — DRAFT with a taxable amount only, the tax engine port is separate and substantial; purchase orders have no line-item (`po_items`) UI yet; PDF rendering (`generatePdf`) for any of the five isn't wired — still depends on Phase 6's worker/hosting-topology decision. |
| Phase 4 — Technical (estimation, BOQ, measurements, documents, drawings) | 🚧 **Schema live (all 6 domains, 14 tables) + UI live for 5 of 6 (2026-09-05).** Built: `/rate-books`(`/[id]`), `/estimates`(`/[id]`), `/spec-sheets`(`/[id]`), `/transmittals` (header only), `/drawings` (register only, upload Route Handler not built), `/moms` (header only). Verified end-to-end against the live project, including the ported business logic, not just CRUD: created a rate book + item, created an estimate against it, added an estimate item, confirmed the `recompute_estimate_item_amount` trigger computed `amount_paise` correctly (₹450 × 120 = ₹54,000) and the Server Component's totals rollup (a port of `computeEstimateTotalsFromSubtotal()`) matched exactly through contingency/taxable/GST/grand-total. **Not built**: `document_issues` (the cross-entity register — audit's own landing order puts it last, fans in across every other domain), `office_templates`, `transmittal_items`/`mom_actions` sub-resources, measurement-row drill-down for estimate items (direct quantity entry only). |
| Phase 5 — Reporting (dashboards, reports, exports, analytics) | ✅ **Schema + UI both live (2026-09-05).** Migration `0009_phase5_reporting.sql` applied and verified — mostly read models over tables Phases 2–4 already shipped, so the only new DDL is `profiles.dashboard_layout`/`wellbeing_opt_in`/`calendar_feed_token`(`_at`), confirmed present via the live schema. Built `/dashboard` (rewritten from the Phase 1 placeholder — KPI tiles, a `FinancialSummary` async Server Component gated to `invoice:manage` rank, Recent Activity off `audit_log`), `/audit-log` (page-level OWNER-only gate, kept `audit_log`'s own RLS broad per Phase 2's defense-in-depth design), `/reports` (simplified invoice register by status, gated to `reports:view` rank), `/workload` (open task counts by assignee, hit and fixed the same PostgREST ambiguous-embed error `tasks/page.tsx` hit earlier via the `profiles!tasks_assignee_id_fkey(...)` FK-hint syntax). Verified end-to-end live against the real project: KPI counts, financial summary, activity feed, full chronological audit trail with correct actor names, invoice register grouping, workload table. Deliberately not ported: an `attendance` table (blocked on the `teamMembers`-vs-`profiles` question Phase 8 reopens — since resolved schema-side by Phase 8, still not wired into a UI here), any RLS change for the two inconsistencies the audit flagged (left as product decisions per the migration's own header comment), the full GST/TDS abstract (tax engine not ported, same gap Phase 3 flagged), and the `.ics` calendar-feed Route Handler (token-based, outside the `(app)` auth group). |
| Phase 6 — Advanced processing (PDF/DWG, Python worker) | 🔲 Repo audit done — [NEXTJS-MIGRATION-PHASE6-AUDIT.md](./NEXTJS-MIGRATION-PHASE6-AUDIT.md). Different in kind from Phases 2–5: the central open question is a **hosting-topology decision** (does Hostinger Managed App Hosting support a persistent Python worker + Redis, or does the worker/queue stay externalized?), not a table-mapping question — flagged for whoever has visited Hostinger's actual docs, not resolved here. Found dead code (`engagement_register` PDF target references physically-removed `esti_cons_*` consultancy tables) and a stale doc comment (references removed EOMS). Surfaced a roadmap gap: `payslip`/`progress_report`/`site_instruction`/`pmc_ra_bill`/`feasibility_report` render targets belong to HR/Payroll and Delivery/AProc domains that have no assigned phase number 2–7. |
| Phase 7 — Optional AI | 🚧 **Schema + a read-only viewer live (2026-09-05).** Repo audit — [NEXTJS-MIGRATION-PHASE7-AUDIT.md](./NEXTJS-MIGRATION-PHASE7-AUDIT.md). Its original "three sources disagree about where ESTI runs" finding was **corrected in place** once fuller evidence surfaced: `CLAUDE.md` has since been fixed to match `PRODUCTION-OPS.md`, and the code's `127.0.0.1:11434` is only a fallback default — the real deployment (`compose.yaml`/`compose.prod.yaml`) correctly points at a shared, self-hosted Ollama container over the compose network. Architecture is not broken; nothing here blocks implementation on an open provider question. `ai_runs` (schema live, migration `0010`) now has `/ai-runs` (list) + `/ai-runs/[id]` (detail) — provenance/audit trail only, no create form, since the AI gateway that would populate it isn't ported. Smoke-tested with a real inserted-then-deleted row against the live project. **Not built**: the draft-approval-lock workflow, PII redaction, permission-filtered retrieval, and the mock/template fallback provider itself — those need the provider question settled first, this viewer doesn't need it. |
| Phase 8 — Roadmap gaps (HR/Payroll, Delivery/AProc, CPI, Knowledge Bank) — **not in the migration spec; proposed here** | 🚧 **Schema live on Supabase (2026-09-04)** — all four domains: migration `0011` (CPI, Knowledge Bank Portal, **plus Master Plans + Standards, both with UI now live 2026-09-05** — `/master-plans`, `/standards`(`/[id]`), register-only pattern, no upload Route Handler), `0012` (Delivery's `contractors`/`contractor_submissions`/`approvals`), `0013` (HR/Payroll — 11 tables), `0014` (AProc/PMC — 11 tables incl. `pmc_package_bids_sealed`, a redacting view for the package-level sealed-bid rule, and a `cost:approve` trigger on the steel-cert/RA-bill CERTIFIED transition, smoke-tested against the live project). CPI, Knowledge Bank Portal (`repo_sources`/`repo_sections`), Delivery's `contractors`/`contractor_submissions`/`approvals`, all of HR/Payroll, and all of AProc/PMC remain **schema only, no UI yet** — the largest remaining chunk of this migration. The `teamMembers`-vs-`profiles` tension is real and **deliberately left open**, not resolved by building the schema: `team_members` now exists (unblocking Phase 5's `attendance` table, added in `0013`) but `tasks.assignee_id`/`reviewer_id` still FK straight to `profiles`, per Phase 2's live, UI-verified design — a future breaking migration is the actual resolution, not attempted here. CPI's `generateReport` no longer blocked on an AI-provider question — Phase 7's finding above was corrected; the actual blocker (if any) is picking an AI Server Action pattern, not architecture. |
| Phase 9 — Library, HR recruitment, firm-issued Tenders — **not in the migration spec; proposed here** | 🚧 **Schema live (2026-09-04); Compliance + Lessons Learned UI also live (2026-09-05).** Tenders: migration `0012` (`tenders`/`tender_invitations`/`tender_bids` + `tender_bids_sealed`, the firm-issued sealed-bid redaction view — smoke-tested end-to-end: inserted a real bid while OPEN, confirmed the view nulled the amount, flipped to AWARDED, confirmed it unsealed). No `/tenders` UI yet. Library: migrations `0011` (Master Plans, Standards — schema only, no UI yet) + `0015` (Compliance's 6 tables, Lessons Learned). `/compliance` (5 of 6 sub-tables — FAR/Setbacks/NBC/Fire/Regulations behind Carbon Tabs, one generic form component; `compliance_docs` skipped, no upload Route Handler in this app yet) and `/lessons` built and verified live, incl. a real inserted-then-deleted `compliance_far` row confirming numeric coercion and the audit trail. HR recruitment: covered by `0013`'s `job_applications`/`hr_profiles`/`hr_documents` — schema only, no UI (bundled with the rest of Phase 8's HR/Payroll UI, not started). The headline dead-code finding (`pmc/contractorPortal.ts`, the unreachable AProc package-bid-submission router) was **acted on**, not just flagged — deleted, see the cleanup-backlog entry below. |
| Phase 10 — Project OS (lead-to-activation pipeline) — **not in the migration spec; proposed here** | 🔲 Repo audit done — [NEXTJS-MIGRATION-PHASE10-AUDIT.md](./NEXTJS-MIGRATION-PHASE10-AUDIT.md). Covers `leads`/`projectDna`/`assessment`/`feasibility`/`negotiation`/`onboarding`/`program`/`projectBrief`/`projectPrecon` — a real, already-designed system ("Project OS," per the schema's own header comment) whose design doc (`UNIFIED-ARCHITECTURE-V4.md`) no longer exists anywhere in the repo — a genuine 404, flagged for a doc-sync fix. **Unifying finding**: `evaluateActivationGate()` ties this phase to Phase 3 — it's the pure function gating whether a draft project can activate, checking DNA/assessment/onboarding (this phase) alongside fee-approval and advance-payment (Phase 3's Slices I/K), resolving what Phase 2's `activate`/`activationStatus` procedures actually do. **New finding**: feasibility reports mint an anonymous `shareToken` that's never consumed anywhere — a half-wired feature (write side works, no read route exists), flagged as a product decision. Resolves a Phase 6 open item (`feasibility_report` render target is this phase's Slice D). Flags `projectPrecon` as scoped-in by naming convention but structurally belonging with Phase 8's Delivery domain instead. Not yet adopted — schema not built. |

**Cleanup backlog — closed out (2026-09-04):**
- ✅ **Dead code removed** — `worker/esti_worker/jobs/pdf.py`'s
  `engagement_register` PDF render target (and its two `esti_cons_*`-querying
  DB helpers in `worker/esti_worker/db.py`) referenced tables physically
  removed in the 2026-09 consultancy teardown; deleted from the current
  worker, not just skipped in the migration. Verified: Python syntax check +
  a live `esti-worker` container restart, clean boot, no errors.
- ✅ **Stale comment fixed** — `worker/esti_worker/jobs/pdf_to_markdown.py`'s
  docstring no longer references the retired EOMS ingest step; the function
  itself was already fine (kept, unrelated internal processing), just needed
  the comment updated.
- ✅ **Dead unreachable router deleted** — `backend/src/modules/pmc/
  contractorPortal.ts` (the never-imported duplicate `contractorPortalRouter`
  the Phase 9 audit found) is removed. **Reasonable call made, not a silent
  decision**: this file was already 100% unreachable in production — no user
  could hit it before this change either, so nothing regresses. It genuinely
  provided AProc package-level sealed-bid *submission*, which — per the
  [Phase 9 audit](./NEXTJS-MIGRATION-PHASE9-AUDIT.md) — has no working API
  path today regardless of whether this file exists on disk. If that
  capability is wanted, it needs real design work (RLS scoped correctly to
  the inviting contractor, actual test coverage) rather than resurrecting
  unreachable code as-is — tracked as a real product gap, not solved by
  deleting the file, just no longer masked by dead code sitting nearby.
  Verified: `tsc --noEmit` clean, live `esti-backend` container (bind-mounted,
  hot-reloaded) kept serving real requests with 200s throughout.

**Known gotcha (documented in `web/next.config.ts`):** Next 16's default
Turbopack can't resolve `@carbon/styles`' internal Sass `@use` imports
through pnpm's symlinked `node_modules` — `web/package.json`'s dev/build
scripts force `--webpack` until that's fixed upstream.

**Tenancy decided (2026-09-04): single-tenant per deployment** — no `org_id`
anywhere, RLS scoped by `auth.uid()` + role only.

**Direct Supabase connection resolved (2026-09-04).** Raw Postgres (both the
direct `db.<ref>.supabase.co:5432` host and, untested, the IPv4 pooler) is
still not reachable from this network. What works instead: the **Supabase
Management API**'s `POST /v1/projects/{ref}/database/query` endpoint, authed
with a **personal access token** (account-level, from
supabase.com/dashboard/account/tokens — not the project's `anon`/
`service_role` keys), executes arbitrary SQL over plain HTTPS. This is how
migrations `0002`–`0004` were applied and verified end-to-end (table +
RLS-policy existence checked via the same endpoint) without the user needing
the SQL Editor. The token was provided in-session, used only for this, not
committed or persisted to any file in the repo. Future sessions need the user
to provide a fresh token the same way — it isn't stored anywhere for reuse.

**"Migrate all the DB" status (2026-09-04): 70 of ~138 tables, not literally
all.** Per explicit direction to migrate the whole schema ahead of building
UI, this session went well past Phase 3 into every audited domain through
Phase 9 — migrations `0002`–`0015`, all applied and verified against the
live project (table existence, RLS policies, and the two non-trivial
business-logic ports — the estimate-recompute triggers and both sealed-bid
views — smoke-tested with real inserted/updated rows, not just read from the
SQL). **Deliberately not attempted**, because no audit exists for them yet
and porting untraced business logic blind is exactly the risk this session's
own discipline (audit → read the real router → write RLS matching it →
apply → verify) was built to avoid: `moodboard` (AStudio project canvas),
`bbs`/`steel` (BBS + steel reconciliation, explicitly scoped out of
Phase 4), `measurement-plan`/`joint-measurement`/`item-library` (the
plan-markup takeoff complex, explicitly scoped out of Phase 4), `academy`,
`pulse`, `collaboration`, `running-bill`, `licensing`/`licensing-platform`
(a separate service per the Phase 2 tenancy decision, likely genuinely
out-of-scope rather than deferred), `marketing`, `memory-activity`, `sync`,
`usage`, `vendor`, plus `inspections`/`permits`/`siteVisits` still sitting
in `project.ts`. (`project-os`/`project-brief`/`project_precon` are now
**audited** — Phase 10 — but not yet built; see its row above and the
assignment below.) Whoever picks this up next: run each domain through an
audit doc first, same as every phase here did — this list is the honest
remainder, not a secret backlog.

**Phase 2 finished twice in parallel (2026-09-04) — collision, resolved.**
A cloud-agent session (`claude/cloud-agent-roadmap-xnvtml`) and this local
session both built the same `phases`/`tasks` slices independently and pushed
around the same time. Local's version was already merged to `main` (verified
end-to-end against live Supabase — see the Phase 2 row above) by the time the
cloud branch was checked, so its Phase 2 commit (`d55cd076`) was **not**
merged — it would only reintroduce the same files unverified. Its second,
non-overlapping commit (the Phase 3 audit doc, `7817ada6`) **was** pulled in.
Lesson for next time: check `git branch -r` for a live cloud-agent branch
*before* starting overlapping work locally, not just at hand-off.

**Cloud-agent — currently active (2026-09-04):** landing-page redesign +
SEO updates. Not tracked on `claude/cloud-agent-roadmap-xnvtml` (that
branch is the audit/docs-cleanup/rebrand work reconciled above) — appears
to be a separate in-progress session/branch
(`cursor/ci-visual-landing-hero-445f` exists on the remote but had 0
commits ahead of `main` as of this check, so likely mid-session, not yet
pushed). Whoever verifies that work: it touches marketing-surface files
(`frontend/index.html`, `llms.txt`, landing routes) that this session's
merge just rewrote for the acronym-expansion rebrand — **check for a
collision on those specific files before merging**, same lesson as the
Phase 2 collision earlier this session (§ above).

**Queued next (2026-09-04, once landing/SEO is done and merged) —
supersedes the stale Phase 3 assignment below:** Phase 10 (Project OS)
schema — the audit is already done
([NEXTJS-MIGRATION-PHASE10-AUDIT.md](./NEXTJS-MIGRATION-PHASE10-AUDIT.md)),
same discipline as every migration `0002`–`0015` used: read the actual
Drizzle schema + router for each table before writing DDL, RLS matching the
real capability gate (not assumed), apply via the Supabase Management API
(`POST /v1/projects/{ref}/database/query`, personal access token from
supabase.com/dashboard/account/tokens — ask the user for a fresh one, never
reuse/store one from a prior session), verify against the live project
(table + RLS existence at minimum; smoke-test any non-trivial logic like
`evaluateActivationGate()` with real inserted rows, same as this session did
for the estimate-recompute triggers and both sealed-bid views). Branch as
`cloud-agent/phase10-project-os` off a freshly-pulled `main` and follow
[CLOUD-AGENT-WORKFLOW.md](./CLOUD-AGENT-WORKFLOW.md) exactly — **do not
merge to `main` yourself**, push and hand off.

Two things to resolve before starting, not during: the audit's own
`shareToken`-never-consumed finding (decide whether to build the missing
read route or leave the write-only half as-is, and say which in the
handoff) and whether `projectPrecon` lands here or is deferred to a future
Phase 8-adjacent Delivery pass (the audit flags it as naming-convention-in,
structurally-out — pick one, don't silently split it across both).

Once Phase 10's schema lands, the natural next assignment after that is
building UI/Server Actions for the schema Phases 3–9 already have (starting
with Phase 3's proposals/letters/contracts/invoices — the most-audited,
most build-ready domain) rather than more schema-only work — flag that to
whoever reads this next if Phase 10 is done and no new instruction has
arrived.

**Superseded assignment (kept for history, do not follow):** ~~Phase 3
implementation, following the landing order
[NEXTJS-MIGRATION-PHASE3-AUDIT.md](./NEXTJS-MIGRATION-PHASE3-AUDIT.md)
suggests (numbering → shared business logic → proposals → letters/contracts
→ invoices)~~ — done, see the Phase 3 row above.

---

## Current phase — soft launch

Per [`../../CLAUDE.md`](../../CLAUDE.md) § Launch status:

| Surface | Status |
| --- | --- |
| `/` (landing page) | ✅ **Live** — pure architecture-practice messaging, no blog (removed 2026-09) |
| `/#sign-in` (sign in / create workspace / reset password) | ✅ **Live** — embedded on the landing page (`LandingAuth`), not gated behind `VITE_MARKETING_ONLY` |
| `/login`, `/access`, `/signup`, `/forgot-password`, `/reset-password` | ✅ Redirect to `/#sign-in` |
| `/downloads` | Web-only, no installers |
| `/wiki*` | ✅ Redirects home (no wiki surfaces) |
| `/account`, `/company-account`, `/platform-admin`, `/demo` | 🔲 Still behind `VITE_MARKETING_ONLY` |

**S8 (reopen apex sign-in) is done** — superseded by folding sign-in directly
into the landing page rather than reopening the old dedicated `/login` page.
`VITE_MARKETING_ONLY` still gates the smaller remaining surface above.

**Ops step still needed:** deploy the current `main` to the VPS — the
landing-page sign-in, blog removal, and EOMS/consultancy removal are all
committed but this session has no VPS/deploy credentials to push them live.

---

## CI / build health ✅ (2026-09-04)

**History:** `main` HEAD's CI was fully broken at the install step
(`ERR_PNPM_OUTDATED_LOCKFILE` — `frontend/package.json` had drifted from
`pnpm-lock.yaml`, missing `@carbon/react` and misdeclaring `react-router-dom`
against the root `pnpm.overrides` security pin), then, once that was fixed
and `cloud-agent` merged into `main`, the merge itself surfaced 72
pre-existing TypeScript errors and 1 pre-existing ESLint error across ~20
files that had never actually been typechecked green (root causes: half-
finished Carbon migrations, MUI v9 API drift, renamed contract fields, dead
code referencing removed desktop/allied-app concepts).

**Current state, verified locally (2026-09-04):**

| Check | Result |
| --- | --- |
| `frontend` `tsc --noEmit` | ✅ 0 errors |
| `backend` `tsc --noEmit` | ✅ 0 errors |
| `packages/contracts` `tsc --noEmit` | ✅ 0 errors |
| `eslint .` (repo-wide) | ✅ 0 errors (5 pre-existing `react-hooks/exhaustive-deps` warnings remain) |
| `frontend` `vitest run` | ✅ 63/63 passing |
| `backend` `vitest run` | ✅ 209/209 passing |
| `vite build` | ✅ succeeds |
| `pnpm audit --audit-level=high` | ✅ 0 high/critical (was 12) — 2 moderate remain, deliberately unfixed, see below |
| `worker` `pytest` | ⬜ not verified — no Python interpreter on the machine that ran this pass |

**Dependency audit — fixed (2026-09-04):** all 12 high-severity findings
resolved via direct version bumps (`pdfjs-dist` `6.1.200`→`6.3.289`,
`fastify` `^5.10.0`→`^5.12.3`, `dompurify` `^3.4.11`→`^3.4.14`) and root
`pnpm.overrides` (`fast-uri` → `>=3.1.6 <4.0.0 || >=4.1.3` — a compound range
because a bare `>=3.1.6` wouldn't force-bump an already-resolved `4.1.2`,
which itself satisfies `>=3.1.6`; `nanoid` → `>=3.3.18`; `browserslist` →
`>=4.28.7`; `postcss` → `>=8.5.23`). Verified: `tsc`/`eslint`/`vitest`/
`vite build` all still green after the bumps.

**Deliberately left unfixed — 2 moderate findings**, both nested under
`backend > minio@8.0.7`, minio's *latest* release: `stream-json@1.9.1`
(needs `>=3.5.0`, a **major** bump) and `query-string@7.1.3 >
decode-uri-component@0.2.2` (needs `>=0.5.0`, which is pure-ESM-only —
`query-string@7.1.3` has no `"type": "module"` of its own, so a `require()`
of it would break). minio 8.0.7 itself still declares
`"stream-json": "^1.8.0"` — forcing a major-version override risks breaking
minio's internal JSON parsing (S3 client) silently, with no way to
integration-test the fix on this machine (no live MinIO/Podman stack). Both
are moderate DoS findings on a narrow attack surface (malformed S3 responses
/ crafted percent-encoded input) — revisit once minio ships a release that
adopts newer majors of these, or if someone can verify against a live stack.

**Still open:**

- 5 `react-hooks/exhaustive-deps` warnings (not errors) in
  `ProjectMeasurementPanel.tsx`, `JointMeasurementRecorder.tsx`,
  `ProjectMoodboard.tsx`, `UsageReportsTab.tsx`, `KnowledgeBankPortal.tsx`.
- Worker `pytest` needs running on a machine with Python to confirm.

---

## Cloud infrastructure ✅

| Component | Status |
| --- | --- |
| Docker Compose (prod) — `compose.prod.yaml` | ✅ Live |
| VPS deployment scripts — `deploy/*.sh` (bootstrap, install-landing, update-landing, verify-vps) | ✅ Live |
| PostgreSQL (system of record) | ✅ Live |
| Redis Streams + Python worker (DXF, PDF, reconcile) | ✅ Live |
| MinIO/S3 (published artifacts) | ✅ Live |
| SSL/TLS + nginx reverse proxy | ✅ Live |
| No cloud Ollama by default — ESTI AI runs through the backend gateway, not a sized-for-inference box | ✅ (see PRODUCTION-OPS.md § ESTI AI) |
| CI (`esti-ci` — TypeScript, lint, test, build, audit, visual regression, Python worker) | ✅ On `main` — install, typecheck, lint, tests, build, audit all green; Python worker `pytest` unverified (no Python on the machine that checked) — see § CI / build health |

Deploy references: [VPS-INSTALL.md](./VPS-INSTALL.md) ·
[PRODUCTION-OPS.md](./PRODUCTION-OPS.md) · [`../../deploy/README.md`](../../deploy/README.md).

---

## Office hub feature rollout (cloud-facing)

Status reflects what a signed-in user reaches once the current `main` is
deployed to `aorms.in` — not local-dev code completeness (see
ROADMAP-LOCAL.md for that).

### Clients & Projects
- Client CRM (interactions, leads, tenders)
- Project tracking (phases, tasks, milestones)
- Project moodboards + mood asset management

### Proposals & Contracts
- Unified proposals (COA fee + scope agreements)
- Version control + client approval gates
- Digital signatures (future: DocuSign integration)

### Invoicing & Finance
- GST-compliant invoicing
- Reconciliation (bank, 26AS, AIS, GSTR via Python worker)
- Cash book + expense tracking
- Financial reports + filing abstracts (GST/TDS)

### Delivery & Supervision
- BBS (bar bending schedules) — IS 456 cutting lengths
- Steel reconciliation (scheduled vs issued vs consumed kg)
- Running bills (project RA bills with advances/deductions)
- Site supervision (snags, inspections, progress reports)

### Team & HR
- Team roster + assignments
- Leaves + payroll management
- ASPRF composite scoring (reliability, quality, impact, collaboration, learning, wellbeing)
- Attendance + time attribution

### Knowledge Bank
- Specification catalog (materials, finishes, makes)
- Compliance library (NBC, FAR, setbacks, fire, regulatory)
- Design standards by discipline + attached files
- Master plan file library (PDF/DWG)
- Lessons learned + NC/CAPA tracking

### ESTI AI Agent 🚧
- Built-in office automation, via the backend AI gateway (not desktop-only — see PRODUCTION-OPS.md § ESTI AI)
- Task recommendations + priority
- Project health insights
- Document generation (proposals, invoices, specs)
- Email draft automation
- Reminder creation

---

## Q4 2026 milestones (cloud)

| Week | Milestone | Status |
|------|-----------|--------|
| **This week** | Landing soft launch stays green; legacy docs archived; blog removed entirely | ✅ |
| **This week** | Restore CI's ability to run (`pnpm install` fix on `main`) | ✅ |
| **This week** | Clear `pnpm typecheck` and `pnpm audit --audit-level=high` findings | ✅ |
| **This week** | EOMS + engineering-consultancy angle removed (pure architectural consultancy) | ✅ |
| **S8** | Sign-in live — folded into the landing page instead of reopening `/login` | ✅ |
| **This week** | Next.js/Supabase migration Phase 1 (foundation) scaffolded and building clean | ✅ |
| **This week** | Local Podman stack verified working end-to-end (build → migrate → seed demo → sign in through the real UI) | ✅ |
| **EOQ** | Office hub v2.0 live on Carbon Design System · SSO + ESTI AI ready | 🔲 |

Engineering work that gates these milestones (codebase cleanup, Carbon
migration waves) is tracked in [ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md) —
this file tracks only what's actually live for users.

---

## Q1 2027+ roadmap (cloud)

### Q1 2027
- ESTI AI agent fully live on the office hub
- SSO + federated identity
- Office hub fully responsive on mobile

### Q2 2027+
- Advanced BI dashboards + reporting
- Integrations (Tally, QuickBooks, DocuSign, etc.)
- Multi-language support (Hindi + regional)
- Mobile app (if needed; web-responsive stays primary)
- Performance optimizations + caching

---

## Support & questions

- **Deployment / VPS?** See [VPS-INSTALL.md](./VPS-INSTALL.md) · [PRODUCTION-OPS.md](./PRODUCTION-OPS.md)
- **Product definition?** See [AORMS-OFFICE-SYSTEM.md](./AORMS-OFFICE-SYSTEM.md)
- **Stack migration spec?** See [NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md) · [Phase 2 audit](./NEXTJS-MIGRATION-PHASE2-AUDIT.md) · [Phase 3 audit](./NEXTJS-MIGRATION-PHASE3-AUDIT.md) · [Phase 4 audit](./NEXTJS-MIGRATION-PHASE4-AUDIT.md) · [Phase 5 audit](./NEXTJS-MIGRATION-PHASE5-AUDIT.md) · [Phase 6 audit](./NEXTJS-MIGRATION-PHASE6-AUDIT.md) · [Phase 7 audit](./NEXTJS-MIGRATION-PHASE7-AUDIT.md) · [Phase 8 audit (proposed, not adopted)](./NEXTJS-MIGRATION-PHASE8-AUDIT.md) · [Phase 9 audit (proposed, not adopted)](./NEXTJS-MIGRATION-PHASE9-AUDIT.md) · [Phase 10 audit (proposed, not adopted)](./NEXTJS-MIGRATION-PHASE10-AUDIT.md)
- **Cloud-agent branch/workflow rules?** See [CLOUD-AGENT-WORKFLOW.md](./CLOUD-AGENT-WORKFLOW.md)
- **Engineering / local-dev status?** See [ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md)
- **Market fit / GTM?** See [MARKET-FIT.md](./MARKET-FIT.md)

---

**Last updated:** 2026-09-04  
**Companion doc:** [ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md)
