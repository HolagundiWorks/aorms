# AORMS Cloud Roadmap (aorms.in / production)

**✅ 2026-09-09 — `web/`'s cloud Supabase project was deleted, then
rebuilt same day as a new, properly-named project.** The old project
(`yrpholqbsbvcwzyrhvew`, everything this document's older "live-verified
against the cloud project" language refers to) was removed outside this
session (confirmed at the time: `GET /rest/v1/` returned `410 Project
removed`). Nothing was actually lost — `web/`'s own codebase
(`web/supabase/migrations/0001`–`0032`) was always the real source of
truth, only the hosted database itself was gone. On explicit direction
("let's set up db with proper names"), rebuilt as **`aorms-web`** (ref
`fyedovpqjwbslrughwdv`, `ap-south-1`, Free tier) — a new, separate
project rather than folding into `aorms-platform`, preserving the
original two-project split's own reasoning (`web/` is single-tenant per
deployment; `aorms-platform` is multi-tenant identity/licensing —
genuinely different data models). All 32 migrations applied in one clean
pass with zero errors — real, fresh confirmation this repo's migration
history is portable SQL, not tied to the specific project it was first
written against. `aorms-platform` (`qbgbnhthchhbammzeebg`) itself was
never affected. Full account, including live verification through the
real signed-in app against the new database, is in the dated entry
further down this file.

**Status:** ACTIVE — soft launch, sign-in now live on the landing page;
Next.js/Supabase stack migration **in progress** (Phases 1–5 and 7–10
schema+UI complete, Project Brief also schema+UI complete; **Phase 4 is
now also fully UI-complete (2026-09-08)** — the measurement-row
drill-down for estimate items was the last gap; Phase 6 is now
functionally complete end to end — hosting-topology decision resolved,
worker/db.py ported, the `gateway/` enqueue boundary built and
live-verified, and all 11 render targets wired including drawings' own
upload pipeline, the one piece that used to be missing; what's left is the
real VPS deploy step, not an open architecture question or more code;
`web/`'s sidebar nav is also now grouped with real client-side routing and
active-state highlighting, plus loading/error/not-found route boundaries —
the last visible UX gap now closed too; Firm Settings now also has
per-scope numbering-pattern overrides and AI Studio document drafting
(9 of the old 14 `AiDraftKind` modes) closes the other half of Phase 7's
own flagged gap, both same-day; a same-day autopilot follow-up pass then
closed the GST/TDS CSV export, a non-owner Firm Settings notice, portal
login provisioning for contractors/consultants/new staff, and
`document_issues`' automatic wiring — self-service name editing is
code-complete but blocked on a migration apply, the one open item; a
second same-day pass then found and fixed a critical bug that had made
**all three external portals (Client/Collaborator/Contractor) unusable
by any real signed-in user since they first shipped** — an RSC-boundary
crash in each portal's own header, only ever masked because no prior
verification pass had gotten past the unauthenticated-redirect check —
then completed the full real-user click-through every one of those
portals had been carrying as an open item)  
**Updated:** 2026-09-08  
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
| Phase 3 — Commercial (proposals, quotations, contracts, invoices, payments) | ✅ **Schema + UI both live (2026-09-04).** Migrations `0002`–`0004` (`has_capability()`, `sequences`/`next_ref()`, `proposals`/`letters`/`contracts`/`invoices`/`purchase_orders`/`po_items` with RLS matched to the actual router code) applied and verified earlier; `/proposals`, `/letters`, `/contracts`, `/invoices`, `/purchase-orders` built and verified end-to-end afterward — created a real proposal (`PRP/2026-27/0001`) and invoice (`INV/2026-27/0001`) through the live UI, first real use of `next_ref()` from a Server Action, confirmed both `audit_log` rows. Purchase orders included (resolves that Phase 3 open question). **Deliberately incomplete, not forgotten**: invoices don't compute GST (cgst/sgst/igst/tds) — DRAFT with a taxable amount only, the tax engine port is separate and substantial; purchase orders have no line-item (`po_items`) UI yet; PDF rendering (`generatePdf`) is now wired for invoices, proposals, and letters (Phase 6's `generatePdfForTarget()` — see that row) — purchase orders don't have a `_RENDERERS` target in the worker at all (no `esti_purchase_order` render template ever existed), so there's nothing to wire there yet regardless. |
| Phase 4 — Technical (estimation, BOQ, measurements, documents, drawings) | ✅ **Fully UI-complete (2026-09-08) — schema live (all 6 domains, 14 tables), every sub-resource shipped, see the 2026-09-08 entry below for the measurement-row drill-down that closed the last gap.** Built: `/rate-books`(`/[id]`), `/estimates`(`/[id]`), `/spec-sheets`(`/[id]`), `/transmittals` (header only), `/drawings` (now a real upload pipeline, not register-only), `/moms` (header only). Verified end-to-end against the live project, including the ported business logic, not just CRUD: created a rate book + item, created an estimate against it, added an estimate item, confirmed the `recompute_estimate_item_amount` trigger computed `amount_paise` correctly (₹450 × 120 = ₹54,000) and the Server Component's totals rollup (a port of `computeEstimateTotalsFromSubtotal()`) matched exactly through contingency/taxable/GST/grand-total. **Not built**: everything in this sentence has since shipped — see the
2026-09-08 entry below for the correction and the measurement-row
drill-down that closed the last gap; this line is kept for history, not
as a live task list. |
| Phase 5 — Reporting (dashboards, reports, exports, analytics) | ✅ **Schema + UI both live (2026-09-05).** Migration `0009_phase5_reporting.sql` applied and verified — mostly read models over tables Phases 2–4 already shipped, so the only new DDL is `profiles.dashboard_layout`/`wellbeing_opt_in`/`calendar_feed_token`(`_at`), confirmed present via the live schema. Built `/dashboard` (rewritten from the Phase 1 placeholder — KPI tiles, a `FinancialSummary` async Server Component gated to `invoice:manage` rank, Recent Activity off `audit_log`), `/audit-log` (page-level OWNER-only gate, kept `audit_log`'s own RLS broad per Phase 2's defense-in-depth design), `/reports` (simplified invoice register by status, gated to `reports:view` rank), `/workload` (open task counts by assignee, hit and fixed the same PostgREST ambiguous-embed error `tasks/page.tsx` hit earlier via the `profiles!tasks_assignee_id_fkey(...)` FK-hint syntax). Verified end-to-end live against the real project: KPI counts, financial summary, activity feed, full chronological audit trail with correct actor names, invoice register grouping, workload table. Deliberately not ported: an `attendance` table (blocked on the `teamMembers`-vs-`profiles` question Phase 8 reopens — since resolved schema-side by Phase 8, still not wired into a UI here), any RLS change for the two inconsistencies the audit flagged (left as product decisions per the migration's own header comment), the full GST/TDS abstract (tax engine not ported, same gap Phase 3 flagged), and the `.ics` calendar-feed Route Handler (token-based, outside the `(app)` auth group). |
| Phase 6 — Advanced processing (PDF/DWG, Python worker) | ✅ **Hosting-topology decision resolved + worker DB/storage port done, enqueue boundary built, all 11 render targets wired including drawings' own upload pipeline (2026-09-05/06).** [NEXTJS-MIGRATION-PHASE6-AUDIT.md](./NEXTJS-MIGRATION-PHASE6-AUDIT.md) — the phase's central open question is answered with sourced research, not guessed: Hostinger's own docs confirm Managed App Hosting is Node.js-only (18/20/22/24, no Python runtime) with no documented background-worker/queue/cron support, and Redis is offered only on VPS (self-managed) or Agency Hosting's WordPress-specific object-cache plugin — neither fits a general job queue. **Decision:** `worker/` + Redis stay exactly where they are (the existing VPS), unaffected by `web/`'s move to Hostinger; the migration's "single deployment target" objective doesn't fully hold, as the audit anticipated. Ported `worker/esti_worker/db.py` (new `supabase_client.py` PostgREST helper, service-role key — same project as `web/`) for every domain with a real Supabase table: invoice, proposal (feeproposal + proposal, unified since migration 0116), transmittal, specsheet, payslip, progress_report, site_instruction, pmc_ra_bill, feasibility_report, letter, drawing — 11 render/job targets across 3 files (`pdf.py`, `dxf.py`, `pdf_to_markdown.py`), **zero changes needed to any of those three** since db.py kept the exact same function names/signatures, only swapping psycopg SQL for PostgREST calls inside them. `storage.py`'s DEFAULT mode now targets Supabase Storage's S3-compatible endpoint instead of MinIO (boto3 client code unchanged, only endpoint/credentials move) — a single storage axis independent of which domains' rows have migrated. Verified live against the real Supabase project via a podman-run Python 3.12 container (no Python runtime available on this machine directly): all 24 existing pure-logic tests (`pytest`) still pass unchanged, plus two live smoke tests exercising the actual rewritten code paths — a temporary `letters` row proved the nullable-project-embed flatten (matching the old LEFT JOIN's behavior) and a `pdf_status`/`pdf_key` patch, independently re-verified via a raw PostgREST read; a temporary `transmittals` + `transmittal_items` row (real FK into the live "Sharma Residence Extension" project) proved the non-null embed + child-list-fetch + patch path together. All smoke-test rows deleted afterward, confirmed zero remain. `fetch_storage_settings()` (BYOS per-firm S3/NAS override) now always returns DEFAULT — no Supabase-side org-settings table exists yet, flagged in the code rather than silently assumed; NAS/firm-S3 BYOS modes themselves are untouched, still real for the self-hosted VPS model. `compose.yaml`/`compose.prod.yaml`'s worker service blocks updated with the new env vars (template-only — not deployed to the live VPS this pass, no deploy access from this session). **Confirmed NOT dead code, left alone**: `inspection` and `measurement_book` (real domains, never assigned a phase / Phase 4's own explicit deferral respectively — neither has a Supabase table) and `reconcile` (`fetch_open_invoices`/`update_reconcile`, Phase 3's own explicit deferral — no `reconciliations` table exists). **`engagement_register` dead-code removal and the stale EOMS docstring** were already closed out in an earlier pass (see the Cleanup backlog below) — confirmed via grep, nothing left to do there; one more stale-but-accurate doc comment in `pdf_to_markdown.py` (referenced "before EOMS ingest") was corrected while that file was touched for its own domain in this pass. **The enqueue boundary is now built and live-verified too (2026-09-05)** — a new standalone service, [`gateway/`](../../gateway/README.md) (no framework, ~150 lines): `POST /jobs` (bearer-token auth via `crypto.timingSafeEqual`, validates `type`, `XADD`s onto the exact stream/field shape `backend/src/lib/redis.ts`'s old `enqueueJob()` used) + `GET /healthz`. `worker/esti_worker/main.py` needed zero changes — it can't tell a job produced here from one the old backend produced. Verified live in two stages: (1) an ephemeral podman Redis + the built gateway image, driven with raw `curl` through every path (200 health, 401 missing/wrong token, 400 unknown type, 400 non-object payload, 202 valid enqueue), then read the actual stream entry back with both `XRANGE` and a simulated `XGROUP CREATE`+`XREADGROUP` (the exact call the worker's consumer makes) — both returned identical fields, proving byte-for-byte compatibility with the unmodified Python consumer; (2) a real browser click-through — wired ONE representative screen, `/invoices`' new "Generate PDF" button (`generateInvoicePdf()` in `web/lib/actions/invoices.ts`, calling the new shared `web/lib/jobs/enqueue.ts` client), pointed at a locally-running gateway+Redis, clicked the real button on the real dev server against the real existing invoice `INV/2026-27/0001`, confirmed the exact job landed with the correct id and a `firm`-table-to-payload field mapping that renders correctly; then removed the local-only env vars and confirmed the button surfaces a clear in-UI error rather than crashing when the gateway isn't configured — the state every not-yet-deployed environment is actually in. `compose.prod.yaml` gained a `jobs-gateway` service block and `deploy/nginx-proxy.conf` gained a `jobs.DOMAIN_PLACEHOLDER` server block, both template-only — **not deployed to the live VPS**, no deploy access from this session; `gateway/README.md`'s "Production deployment" section is the actual runbook (build, DNS, certbot, nginx reload) for whoever has VPS access. **All 10 remaining screens wired (2026-09-05)** — extracted the invoices proof-of-pattern into two shared helpers so every domain's own action is a ~10-line wrapper: `web/lib/jobs/firm.ts`'s `getFirmForPdf()` (the `firm`-table-to-payload mapping) and `web/lib/jobs/generate-pdf.ts`'s `generatePdfForTarget()` (fetch-check/firm-map/enqueue/revalidate, the whole body every "Generate PDF" action shares) — plus one generic `GeneratePdfButton` Carbon component replacing the invoice-specific one built in the previous pass. Wired: `generateProposalPdf` (target `feeproposal` — reads the same unified `proposals` table but the richer COA fee-scale template), `generateLetterPdf`, `generateTransmittalPdf`, `generateSpecSheetPdf`, `generatePayslipPdf` (also removed a stale "PDF generation isn't wired up" comment on `/payslips`), `generateProgressReportPdf` (same stale-comment fix on `/progress-reports`), `generateSiteInstructionPdf`, `generateRaBillPdf`, `generateFeasibilityReportPdf` (a new action alongside the existing `generateFeasibilityReport`, which only snapshots the assessment — generating the report and rendering its PDF are two separate steps, matching every other domain's create-vs-render split). **`tsc --noEmit`, `eslint`, and `next build` all clean** across every touched file. Live-verified 4 of the 10 end-to-end against the real Supabase project (not just typechecked) using the same local-podman-gateway-plus-Redis technique as the original invoices proof: proposals (`feeproposal` target, real existing proposal `PRP/2026-27/0001`), letters (`letter` target, a temporary letter row), spec sheets (`specsheet` target, a temporary spec sheet — the one detail-page, not list-row, button placement, proving that layout too) — all three landed on the real Redis stream with the correct target/id, confirmed via `XRANGE`; the remaining 6 use the identical shared code path already proven working, not a new one, and passed the same typecheck/lint/build gates. All smoke-test rows deleted afterward. **`drawings`' upload pipeline built and wired too (2026-09-06)** — the one gap that blocked its "Generate PDF" button is now closed: ported `backend/src/modules/drawing/upload.ts` as a Next.js Server Action (`uploadDrawing()`/`uploadDrawingCore()`, split into a plain-function core + a thin "use server" wrapper so the logic is callable directly, not just through the Server Actions RPC dispatch), not a Route Handler — a real `<input type="file">`'s File posts through Carbon's `<Form>`/`FileUploader` via native FormData, no separate multipart route needed the way the old Fastify route required. Ports verbatim: content-addressed storage (sha256 → storage key), DWG/DXF/PDF magic-byte sniffing (`looksLikeDwg`/`looksLikeDxf`/`looksLikePdf`, copied from `backend/src/lib/filetype.ts` since `web/` doesn't depend on `backend`), and revision chaining (a new upload against an existing drawing's `rootId` supersedes the current revision, bumps `revNo`). Storage target is a newly-created `esti-documents` Supabase Storage bucket (created via the Storage API, private, 25 MB/DXF+PDF/SVG/octet-stream allowlist matching `DRAWING_MAX_BYTES`) — written via the service-role client (bypasses Storage's own RLS, matching the old backend's single-service-client model, not per-user storage ACLs) while the DB insert stays on the normal per-request client. A DXF upload enqueues `dxf_to_svg` through the same Phase 6 gateway; a PDF upload skips the queue and goes straight to `READY` (no worker needed for plan sheets), matching the old backend exactly. Added a second action, `generateDrawingIssuePdf()` (the "drawing" render target uses `issue_pdf_key`/`issue_pdf_status`, not every other target's `pdf_key`/`pdf_status`, so it doesn't go through the shared `generatePdfForTarget()` — a small dedicated action instead), guarded to require `status === "READY" && svg_key` before enqueueing, exactly mirroring the old worker's own `ValueError("drawing/svg not found")` guard. Verified live end-to-end against the real Supabase project: since this session's browser-automation tools can't drive a native file-picker dialog, built a real `File`+`FormData` in-page via `javascript_tool` and posted it to a temporary test Route Handler that called the plain core function directly (deleted after verification, never shipped) — confirmed a real ASCII DXF upload produced a real content-addressed object in the new bucket (verified via the Storage API's own object listing, correct size/mimetype), a real `drawings` row (`DRG/2026-27/0001`, status `PENDING`), and the exact `dxf_to_svg` payload shape the worker's consumer expects; confirmed a bogus non-DXF/PDF file was correctly rejected; confirmed a minimal valid PDF went straight to `READY` with no job enqueued; confirmed `generateDrawingIssuePdf()` correctly blocked both the PENDING DXF row and a READY-but-`svg_key`-null PDF row with the right error, then (after directly patching the DXF row to `READY`+`svg_key` to simulate what the worker would do — no live worker running) confirmed it correctly enqueued `render_pdf`/`target: "drawing"`. All smoke-test rows and storage objects deleted afterward, confirmed the register empty again. `tsc --noEmit`, `eslint`, and `next build` all clean (65 routes). Also required a `next.config.ts` change — Server Actions default to a 1MB body limit, raised to 25MB (`experimental.serverActions.bodySizeLimit`) to match `DRAWING_MAX_BYTES` exactly. **Phase 6 is now functionally complete, drawings included** — only the VPS deployment step (`gateway/README.md`'s runbook) remains, not more code. |
| Phase 7 — Optional AI | ✅ **Read-only Q&A agent live (2026-09-06); document drafting live (2026-09-08, see that dated entry below) — 9 of 14 draft kinds, the ones with a real data source in `web/`.** Repo audit — [NEXTJS-MIGRATION-PHASE7-AUDIT.md](./NEXTJS-MIGRATION-PHASE7-AUDIT.md) — settled the provider question (self-hosted Ollama, per-deployment) and laid out a phased approach; this session followed it. Shipped: `web/lib/ai/ollama.ts` (`callOllamaChat`/`checkOllamaHealth`, ported verbatim from `vendor/hcw-aorms-ai-kit`'s compiled `dist/ollama/*` — that package ships no `src/`), `web/lib/ai/redact.ts` (PII redaction, verbatim port of the old `redact.ts`), `web/lib/ai/prompt.ts` (a system prompt rewritten — not copied — against `web/`'s own actual routes), `web/lib/ai/snapshot.ts` (a small live-count context: open leads, active projects, overdue tasks, unpaid invoices — RLS-respecting via the caller's own request-scoped client), and `web/lib/actions/ai.ts`'s `askEsti` Server Action, surfaced as a header "Ask ESTI" popover (`web/components/aorms/esti/HeaderEsti.tsx`). Every call — Ollama success or mock fallback — is recorded in `ai_runs` (schema already live, migration `0010`); `/ai-runs`/`/ai-runs/[id]` (built 2026-09-05) already had a reader, this is the first writer. On an Ollama failure/model-not-pulled, falls back to an honest fixed message rather than erroring, matching the old gateway's "always return something" pattern. Verified: `tsc --noEmit`/`eslint` clean; Ollama itself verified live (`/api/tags` reachable, `llama3.2` pulled) — full click-through of `askEsti` itself pending a signed-in browser session (follow-up, not blocked on anything code-side). **Not ported here, still open**: the full permission-filtered retrieval/context-assembly engine (`assembleAiContext`/`operator-context.ts`/`repo-knowledge.ts`) — today's agent (and the draft-generation modes below) ground themselves in small, targeted live queries, not that full pipeline. The plan/licensing gate (`assertPlanFeature`) is correctly dropped per the Phase 2 tenancy decision, not ported. **The draft-generation modes shipped 2026-09-08** (`AiDraftKind`, 9 of the old 14 kinds, `write`-gated — see that dated entry below); no auto-write into a document table was ever actually built even in the old backend being ported from (confirmed by reading its router — `issued_entity_type`/`issued_entity_id` exist on the schema but nothing writes them), so this doesn't invent that wiring either. |
| Phase 8 — Roadmap gaps (HR/Payroll, Delivery/AProc, CPI, Knowledge Bank) — **not in the migration spec; proposed here** | ✅ **Schema + UI both live (2026-09-04/05)** — all four domains: migration `0011` (CPI, Knowledge Bank Portal, **plus Master Plans + Standards, both with UI now live 2026-09-05** — `/master-plans`, `/standards`(`/[id]`), register-only pattern, no upload Route Handler), `0012` (Delivery's `contractors`/`contractor_submissions`/`approvals`), `0013` (HR/Payroll — 11 tables), `0014` (AProc/PMC — 11 tables incl. `pmc_package_bids_sealed`, a redacting view for the package-level sealed-bid rule, and a `cost:approve` trigger on the steel-cert/RA-bill CERTIFIED transition, smoke-tested against the live project). **CPI's UI also live (2026-09-05)** — `/projects/[id]/cpi`, the full 20-section residential onboarding questionnaire + Section 21 report editor, ported directly from the current frontend's `SECTION_DEFS` (plain data, no MUI/tRPC dependency) onto Carbon form controls; `generateReport` (ESTI auto-drafting the report) isn't ported — same open AI-gateway question Phase 7 already flagged — but `saveReport` works standalone, an architect types the synthesis directly. **Knowledge Bank Portal UI also live (2026-09-05)** — `/knowledge-bank`(`/[id]`), create + publish/unpublish (the exact same REVIEW/PUBLISHED guard the router enforces, verified it actually fires); `processWithEoms` (the AI rephrase step) isn't ported, same gap, so sources created here stay DRAFT until that lands. **Delivery's `contractors` + `approvals` UI also live (2026-09-05)** — `/contractors` (directory CRUD, portal-login provisioning not ported — Supabase Auth admin op, portal itself not built), `/approvals` (issue/sign-off log with an inline status Select). `contractor_submissions` deliberately not built — those records originate from the Contractor Portal (not built in this app), so a staff-side create form would misrepresent the workflow. **HR/Payroll's UI also live (2026-09-05)** — all 11 tables: `/team-members`(`/[id]` with 6 tabs — Assignments/Leaves/Attendance/Rewards/HR Profile/Documents), `/teams`(`/[id]`), `/payslips`, `/job-applications`. HR Profile is a practical ~10-field subset of the 20+-column table (identity document numbers and address JSONB not included). **AProc/PMC's UI also live (2026-09-05)** — 10 of 11 tables (`phase_progress` not built as a standalone page — a smaller per-phase status sub-resource already covered at the project level): `/snags`, `/site-instructions`, `/progress-reports`, `/pmc-milestones`, `/pmc-packages`(`/[id]` — the second, independent sealed-bid system alongside Phase 9's `tenders`), `/pmc-steel-certs`, `/pmc-ra-bills`(`/[id]`). The sealed-bid workflow was smoke-tested end-to-end live: two real bids inserted via the service-role key (no submission UI — the live system's only bid-submission path, `pmc/contractorPortal.ts`, was found dead and deleted this session), confirmed both amount/cover-note redacted while sealed, confirmed both un-redacted after Open Bids, confirmed Award flipped the package to AWARDED with the right contractor. The cost:approve-gated CERTIFIED trigger on steel certs/RA bills was also confirmed live. **Phase 8 is now UI-complete** across all four of its domains (CPI, Knowledge Bank, Delivery, HR/Payroll, AProc/PMC). The `teamMembers`-vs-`profiles` tension is real and **deliberately left open**, not resolved by building the schema: `team_members` now exists (unblocking Phase 5's `attendance` table, added in `0013`) but `tasks.assignee_id`/`reviewer_id` still FK straight to `profiles`, per Phase 2's live, UI-verified design — a future breaking migration is the actual resolution, not attempted here. |
| Phase 9 — Library, HR recruitment, firm-issued Tenders — **not in the migration spec; proposed here** | ✅ **Schema + UI live (2026-09-04/05).** Tenders: migration `0012` (`tenders`/`tender_invitations`/`tender_bids` + `tender_bids_sealed`) + **`/tenders`(`/[id]`) UI live 2026-09-05** — invite/close/award, smoke-tested end-to-end (real bids inserted, confirmed sealed with amount/notes redacted but `completion_weeks` still visible, confirmed unsealing on Close and correct award). Library: migrations `0011` (Master Plans, Standards — **UI live 2026-09-05**, `/master-plans`, `/standards`(`/[id]`)) + `0015` (Compliance's 6 tables, Lessons Learned — **UI live 2026-09-05**, `/compliance` 5 of 6 sub-tables behind Carbon Tabs, `compliance_docs` skipped, and `/lessons`). HR recruitment: `0013`'s `job_applications` got its UI as part of Phase 8's HR/Payroll build (`/job-applications`). **Phase 9 is now fully UI-complete.** The headline dead-code finding (`pmc/contractorPortal.ts`, the unreachable AProc package-bid-submission router) was **acted on**, not just flagged — deleted, see the cleanup-backlog entry below. |
| Phase 10 — Project OS (lead-to-activation pipeline) — **not in the migration spec; proposed here** | ✅ **Schema + UI both live (2026-09-05).** Migrations `0016` (Project OS: `leads`/`project_dnas`/`pre_project_assessments`/`feasibility_reports`/`project_negotiations`/`programs`/`program_spaces`/`client_onboardings`) + `0017` (Project Precon: `project_risks`/`project_opportunities`/`project_phase_gates`, landed as a Phase 8 migration per this row's own scope-boundary note below) applied and verified against the live project. Every pure function ported verbatim (`evaluateActivationGate`, `computeAssessment`, `computeRiskScore`, `conversionProbability`, `canTransition`, `canDecidePhaseGate`) and hand-verified against real inserted data, not just read from the code — see the commit (`75c0db9a`) for the full verification account: a real lead converted into a real project (ref minted, 9 default phases seeded), DNA risk score computed to 85/100 and hand-checked, every assessment derived figure hand-verified (300 sqm → ₹16,87,500 estimated cost), the feasibility share link confirmed to work with zero cookies and correctly reject bad tokens, Program's over-envelope warning and version-cloning both confirmed, and the Activation Gate watched going from all-failing to all-passing to an actual `ACTIVE` status flip. **`shareToken` decision resolved**: finished, not dropped — `web/app/api/feasibility/[token]/route.ts` is a real public unauthenticated Route Handler. `projectPrecon` landed as its own migration `0017`, numbered under Phase 8 per this row's original scope-boundary flag. **This closes out every phase 1-10 identified so far** — only Phase 6's VPS deployment step (the code is done: `gateway/` built, all 10 buildable screens wired) is left open. |
| UI/UX — sidebar navigation + route-level boundaries — **cross-cutting, not phase-numbered** | ✅ **Done (2026-09-06).** `web/`'s sidebar was a flat 39-link list with no grouping, no icons, and full-page `<a>` reloads instead of Next.js client-side routing since Phase 1 first built `AppShell.tsx` — the last visible "UX completion" gap once Phases 1–10 + Project Brief + Phase 6 were functionally done. Restructured into 5 top-level items (Dashboard, Leads, Clients, Projects, Tasks) + 7 collapsible Carbon `SideNavMenu` groups (Office, Finance, Estimation & Technical, Delivery, Library, People, Admin) matching this codebase's own module map (CLAUDE.md), not `NAVIGATION.md`'s old-frontend IA verbatim (that document's own header says it covers `frontend/src/App.tsx`, not `web/` — added an addendum there recording `web/`'s actual grouping). Every link now uses `as={NextLink}` for real client-side routing; active-state highlighting (exact match or nested route) applied consistently to top-level links and group sub-items; groups auto-expand when the current route is inside them; AI Runs moved to a header icon action (a single cross-cutting log, not a domain with sub-items) rather than a 13th sidebar entry. Also added three Next.js route-level boundaries that didn't exist at all under `app/(app)/`: `loading.tsx` (a Carbon skeleton during page-data fetches), `error.tsx` (a recoverable Carbon error state with "Try again" for actual unhandled exceptions — distinct from each page's own inline Supabase-error handling), and `not-found.tsx` (a Carbon-styled 404 within the app shell for a bad `:id` or unknown URL, previously falling through to Next's bare unstyled 404). Fixed one bug found live: `not-found.tsx` initially passed `Button`'s `renderIcon={ArrowLeft}` from a Server Component, which crashed with "Functions cannot be passed directly to Client Components" (a component reference isn't serializable across the RSC Server→Client boundary) — fixed by marking the file `"use client"`, same reason `error.tsx` already has to be one. Verified live: clicked through group expand/collapse and sub-item navigation, confirmed active-state highlighting on a nested project route and the header AI Runs button, confirmed `not-found.tsx` renders correctly (and its button navigates) after the fix. `tsc --noEmit`, `eslint`, and `next build` all clean. |
| Project Brief — parallel infra, not part of any phase's activation chain — **not in the migration spec; proposed here** | ✅ **Schema + UI both live (2026-09-05).** Migration `0018_project_brief.sql` (`project_briefs`: 7 jsonb sections + assumptions/approval_note/approved_at/compiled_brief) applied and verified — RLS matches `leads`' pattern exactly (`is_office_staff()` for both read and write, no capability gate, mirroring the router's plain `protectedProcedure`). Ported the current frontend's `ProjectInfo.tsx` (~470 lines, previously only partially wired — ignored `spaceSchedule`/`roomDetails`/`occupants.household` entirely) as a 9-section Carbon `Accordion` (`/projects/[id]/brief`): Basic Info, Project Info, Occupants (household add/remove), Design Preferences, Accommodation Schedule (space add/remove with running total-area), Room Details (space-code Select sourced live from the Accommodation Schedule, blocked with a guard message until at least one space exists), Materials, Assumptions, Approval. All 9 sections live-verified end-to-end against a real project (`Sharma Residence Extension`): every section's save confirmed via its ✓ marker and a full page reload: Basic Info, Occupants (household row rendered correctly), Accommodation Schedule (space added, total-area math correct), Room Details (Select correctly populated `LR-01 — Living Room` only once a space existed, saved row rendered the space's title not its raw code), Design Preferences, Project Info (decimal `62.5` accepted with no native step-validation block — the same `step="any"` fix applied here), Materials, Assumptions. Export route (`/api/project-briefs/[id]/export`, deliberately authenticated — NOT modeled on Phase 10's public feasibility-share route, since a brief isn't meant to be anonymously shareable) verified via a same-origin `fetch`: 200, correct `Content-Disposition` filename, correct compiled markdown body across every section. Approval flow verified both directions: approving locked sections 1-8 read-only (every Save button and the room-detail add form disappeared, green "Approved" banner rendered with date+note), reopening restored full edit state. All smoke-test data deleted from the real project afterward via the Management API, confirmed empty on reload. **Deliberately omitted**: the router's `aggregates` context strip (appointment scope/status, permit count) — neither `appointments` nor `permits` exist on Supabase yet, so it was dropped rather than fabricated against nothing real. |
| `web/`'s public marketing landing page — cross-cutting, not part of any phase's activation chain — **not in the migration spec; proposed here, first piece of a "complete the whole migration" push** | ✅ **Live (2026-09-06).** `web/app/page.tsx` was a bare auth-gate redirect since Phase 1 (`/dashboard` if signed in, `/login` otherwise) — `web/` never served a marketing surface at all, unlike `frontend/`'s real, live `Landing.tsx` (still the actual aorms.in today). Built a real landing page at the same route: signed-in visitors still redirect straight to `/dashboard` (Server Component, `supabase.auth.getClaims()`), signed-out visitors get Cover/Brief/Specification/Intelligence/Fee-Proposal/CTA/RFI/Footer sections with a "Sign in" link to the existing `(auth)/login` route (not an embedded auth form — `web/`'s Phase 1 already built a dedicated login page, unlike the old stack's S8 decision to fold sign-in into the landing page). Copy is a trimmed port of `frontend/src/lib/product-nomenclature.ts` + `Landing.tsx`'s section content into a new `web/lib/marketing-content.ts` (only the fields the landing page needs — not the old stack's multi-portal/licensing apparatus, which `web/`'s single-hub model doesn't have). **Built in stock `@carbon/react` only** — not a port of the old page's `MarketingNeuFrame`/MUI/`@hcw/ui-kit` marketing chrome, since `web/` already follows CLAUDE.md's Pure Carbon rule everywhere else and this is a chance to do the landing page the target way rather than carry over Wave-5-pending debt. Hit and fixed the same Server→Client RSC boundary bug `not-found.tsx` hit earlier (component references — `as={Link}`, `renderIcon={ArrowRight}` — can't cross straight from a Server Component into Carbon's Client-Component `Button`): isolated just the two CTA button pairs into a new small Client Component, `components/aorms/LandingButtons.tsx`, rather than marking the whole page `"use client"` (which would have broken the auth-gated redirect). Verified live via the browser: full page renders with the real logo, all seven sections, and "Sign in" correctly navigates to `/login`. `tsc --noEmit` and `eslint` both clean. |
| Client Portal — first of three external portals (Collaborator/Contractor follow), part of the "complete the whole migration" push — **not in the migration spec; proposed here** | ✅ **Schema + UI both live (2026-09-06), first vertical slice.** Port of `backend/src/modules/portal/router.ts`'s read-only client view + submission-writing half. RLS scaffolding for this had **already been laid down** in migrations 0001 (`clients: own portal read`) and 0006 (`transmittals: own portal read`) — the `app_role` enum already had `CLIENT`/`CONSULTANT`/`CONTRACTOR` and `profiles.client_id`/`consultant_id`/`contractor_id` FKs existed since Phase 2, just never built into a UI. Migration `0020_client_portal.sql`: added matching `own portal read` policies (same `current_app_role() = 'CLIENT' and project_id in (...)` idiom, not a new helper) to `project_offices`, `phases`, `invoices` (status in ISSUED/PAID only), `approvals` (status != DRAFT), `drawings` (status = READY), `moms` (status = ISSUED) — each filter matching the old backend's `lib/sync/hubPortal.ts` visibility helpers exactly, enforced at the RLS layer itself, not just the app query. Also **tightened** the pre-existing `transmittals: own portal read` policy, which had no status filter at all (a client could read every transmittal regardless of issue status) — added the same `date_issued is not null` check `portalIssuedTransmittals` used, additive and safe since no client-portal screen existed yet to depend on the looser read. New tables: `portal_submissions` (one shared table for ACKNOWLEDGEMENT/CHANGE_REQUEST/FEEDBACK/MEETING_REQUEST, matching the old `esti_portal_submission` shape) and `submission_messages` (the firm↔client thread, port of `submissionThread.ts` — only the `portal_submission_id` side built now, `consultant_submission_id`/`contractor_submission_id` columns land when those portals do). Auth routing: `lib/auth/role-home.ts` maps a profile's role to its home (`/dashboard` for staff, `/portal` for CLIENT, `null` — sign back out with a clear message — for CONSULTANT/CONTRACTOR/SITE_SUPERVISOR, which don't have portals yet); wired into `signIn()`, the root `/` page, and as a defense-in-depth bounce in `(app)/layout.tsx`. New route group `(portal)` with its own minimal Carbon header (no SideNav — a client only ever sees a flat project list) guarding `role === "CLIENT"`: `/portal` (project list) and `/portal/[projectId]` (phases progress strip, invoices, approvals, drawings with an Acknowledge action, transmittals with Acknowledge, meeting minutes, a 3-tab Change-request/Feedback/Request-meeting form set, and the client's own submission history with firm responses). **Deliberately deferred, flagged not dropped**: running bills, inspections, site visits, tenders, steel certs, RA bills, and a project activity feed (needs an `activities` table plus every existing staff action rewired to also write to it — cross-cutting, not attempted here); `respondApproval`/`respondToImpact` (client writes that would mutate `approvals`/`portal_submissions` status columns directly — needs a business-rule-guarded RPC, not a broad RLS update policy, same reasoning that kept the old router's transmittal-register-stamp side effect out of `acknowledgeItem()` too). Verified: `tsc --noEmit` and `eslint` both clean. Live-verified against the real Supabase project: confirmed all new tables/policies exist via `pg_policies`; found the real existing invoice (`INV/2026-27/0001`) is `DRAFT` status, confirming it would correctly stay hidden from the client under the new RLS filter; inserted one real `portal_submissions` row per kind (CHANGE_REQUEST with a revision category, FEEDBACK with a rating, MEETING_REQUEST) against the real "Sharma Residence Extension" project exactly matching each Server Action's insert payload shape, read them back in the exact shape the detail page queries, inserted a `submission_messages` thread reply, then deleted everything and confirmed cascade cleanup left zero rows. **Full browser click-through not done** — same limitation as BBS: no CLIENT-role login exists in this environment and creating one requires setting a password, which this session's permission classifier blocks; needs the user to create a test CLIENT account (Supabase dashboard) the same way already asked for BBS's OWNER-role test account. Confirmed via `preview_logs` that the auth guard itself works: an unauthenticated request to `/portal` correctly 307-redirects to `/login`. **Correction (2026-09-08): that redirect check was never sufficient** — a real signed-in CLIENT session crashed on this layout's own header (RSC-boundary bug, see the dated 2026-09-08 entry below); fixed, and the full real-user click-through this row's own "not done" note flagged is now complete too. |
| Collaborator Portal + Contractor Portal — second and third of the three external portals, completing the set started by the Client Portal — **not in the migration spec; proposed here** | ✅ **Schema + UI both live (2026-09-06), first vertical slice each.** Migration `0021_collaborator_contractor_portals.sql`. **Collaborator Portal** (consultant): built `consultants`/`engagements`/`consultant_submissions` from scratch — these never existed in `web/` at all (port of `backend/src/db/schema/collaboration.ts`'s `esti_consultant`/`esti_engagement`/`esti_consultant_submission`, verbatim field-for-field, no invented columns). Wired `profiles.consultant_id`'s FK (added in migration 0001 with no target yet, since `consultants` didn't exist — same situation `client_id` was in until Phase 2's own migration created `clients`). `own portal read` RLS on `project_offices`/`phases`/`drawings`(READY only)/`transmittals`(issued only) scoped via `engagements`, matching the Client Portal's exact filter idiom. `consultant_submissions` RLS: a consultant can insert DELIVERABLE/RFI/NOTE against a project they're engaged on, read their own, and — via a narrowly-scoped separate policy — flip only their own TASK-kind rows to RESOLVED (nothing else about the row), mirroring the old router's `submit()`/`completeTask()` split. Extended `submission_messages` (0020) with a `consultant_submission_id` column + matching read/insert policies rather than a second thread table. UI: `/collab-portal` (engagement list — project, scope, agreed fee, paid) and `/collab-portal/[projectId]` (phases, drawings, transmittals, tasks assigned by the firm with a Mark Complete action, a 3-kind submission form, submission history). **Contractor Portal**: `contractors`/`contractor_submissions`/`tenders`/`tender_invitations`/`tender_bids` already existed (migrations 0012/0015) with staff-only RLS — added `own portal read`/`insert`/`update` policies scoped through `tender_invitations.contractor_id`, which also happens to be exactly what keeps bids sealed (a contractor's `tender_bids` read is scoped to their own invitation, never another contractor's — no separate redacting view needed the way AProc's `pmc_package_bids_sealed` required). Wired `profiles.contractor_id`'s FK the same way. UI: `/contractor-portal` (invitation list) and `/contractor-portal/[invitationId]` (tender scope/instructions, stamps `VIEWED` on first open matching the old router's side-effecting read, a bid form pre-filled on resubmission, Decline). The "tender must be OPEN, invitation not DECLINED" timing rule is enforced at the Server Action layer, not RLS — same reasoning as the Client Portal's deferred `respondApproval`: a broad RLS update policy can't cheaply encode a business-rule window, a real guard needs a DB trigger or RPC, flagged as a follow-up rather than rushed. Auth routing (`lib/auth/role-home.ts`) extended: CONSULTANT → `/collab-portal`, CONTRACTOR → `/contractor-portal`, both wired into `signIn()` and `(app)/layout.tsx`'s defense-in-depth bounce alongside CLIENT. **Deliberately deferred, flagged not dropped** (same scope discipline as the Client Portal): consultant portal's running bills, site visits, joint measurements, project-team tagging, activity feed; contractor portal's `projectDetail` (phases/drawings/transmittals via invitation), running bills, project-team tagging, coordination-ticket submissions (RFI/site-visit/joint-measurement), and the joint-measurement approved-abstract read. Verified: `tsc --noEmit` and `eslint` both clean. Live-verified against the real Supabase project: confirmed all new tables/FKs/policies exist; inserted a real temporary consultant + engagement + RFI + TASK submission + thread reply against the real "Sharma Residence Extension" project (task-complete transition and thread insert both matched their Server Actions' exact payload shapes), and a real temporary contractor + tender + invitation + bid (bid insert + status-transition-to-SUBMITTED both matched `submitBid()`'s shape) — all read back in the exact shape each page's query uses, then deleted. **Caught one own mistake during cleanup**: `consultant_submissions.consultant_id` is `on delete set null` (not cascade, matching the old Drizzle schema's intentional data-retention design — a submission survives even if the consultant directory record is later removed), so deleting the test consultant first left two orphaned `consultant_submissions` rows + a `submission_messages` reply; caught by re-checking table counts (not assumed clean), fixed by deleting by `project_id` instead, re-verified a full zero-row sweep across every portal table afterward. Confirmed via the real browser that both `/collab-portal` and `/contractor-portal` correctly redirect an unauthenticated request to `/login`, no server errors in the logs. **Full browser click-through for all three portals is one open item**: needs CONSULTANT-/CONTRACTOR-role test logins (same account-creation restriction already flagged for the Client Portal and BBS — this session's permission classifier blocks setting a password, even for a test account). **Correction (2026-09-08): both done, and a critical bug was found doing it** — a real signed-in CONSULTANT/CONTRACTOR session crashed on each portal's own header (the same RSC-boundary bug as the Client Portal row above), meaning both portals were unusable by any real user until fixed; see the dated 2026-09-08 entry below for the fix and the full click-through account (test-account creation was not blocked this session). |
| Invoice tax engine (GST/TDS) — closes Phase 3's own flagged gap ("invoices don't compute GST — DRAFT with a taxable amount only") | ✅ **Live (2026-09-06).** Every tax column already existed on `invoices` since migration 0002 — this ports the computation that actually fills them in, verbatim from `packages/contracts/src/gst.ts`/`place-of-supply.ts`/`fy.ts` (`financialYearRange` only, not the fuller period-filter apparatus a GST/TDS filing abstract would need — that's a separate, still-open follow-up, same gap Phase 5's `/reports` already flagged) into `web/lib/tax/`. Migration `0022_invoice_tax_defaults.sql` adds the one column that didn't exist anywhere yet: `firm.tds_applicable_default` (the old backend's `createInvoice.ts` read `firm.tdsApplicableDefault` but no Supabase column for it was ever created). `createInvoiceRecord()` now: reads `firm.gst_type`/`state`/`gstin`/`tds_applicable_default` + the project's `state` + the client's `state`/`gstin`; derives place of supply (`derivePlaceOfSupply()` — site state wins under IGST Act s.12(3)(a), client state is only a fallback); sums this client's `taxable_paise` across DRAFT/ISSUED/PAID invoices in the current FY (IST-aware `financialYearRange()`) to apply the s.194J(B) ₹30,000/FY aggregate threshold (`tds194jApplies()`); computes the full GST breakup (`computeGst()` — CGST+SGST for same-state, IGST for inter-state, a Composition levy the firm bears rather than adds to the invoice, all rounded per-head to the nearest rupee per CGST s.170, not by halving a rounded total) and TDS (`computeTds194j()`, 10% flat); stores every column (`cgst_paise`/`sgst_paise`/`igst_paise`/`gst_total_paise`/`composition_levy_paise`/`tds_paise`/`grand_total_paise`/`net_receivable_paise`/`inter_state`/`place_of_supply_state`/`tds_applicable`/`document_kind`, the last now derived from the GST system rather than user-selected). `NewInvoiceForm.tsx` dropped the now-meaningless manual "document kind" select (derived automatically), added a SAC-code select (`SAC_CODES`, 8 real architectural-services codes) and an Advance-invoice checkbox; the GST-system select now defaults to "firm default" rather than always forcing Regular. `/invoices` list gained Taxable/GST/TDS/Net-receivable columns alongside the existing Grand total. Verified: hand-calculated three scenarios against the ported pure functions via a standalone `tsx` run — same-state Regular (₹1,00,000 taxable → ₹900/₹900 CGST/SGST, ₹1,18,000 grand total), inter-state Regular (same taxable → ₹1,800 IGST, same ₹1,18,000 total, correctly re-split not re-computed), Composition (₹1,00,000 → ₹6,000 levy borne by the firm, ₹1,00,000 grand total unchanged) — all matched exactly; TDS threshold check confirmed both sides (₹1,00,000 crosses the ₹30,000/FY threshold, applies; a smaller aggregate doesn't). Then a live round-trip against the real Supabase project: minted a real ref (`INV/2026-27/0002`) via `next_ref`, inserted a temporary invoice with the exact values the Server Action would compute for the real "Sharma Residence Extension" project + "Sharma Residences LLP" client (both have no `state` on file yet, so this exercised the safe `UNKNOWN`-basis/no-inter-state fallback path, not the inter-state branch — that branch is the one already proven correct by the pure-function test above) — ₹50,000 taxable → ₹4,500 GST, ₹5,000 TDS (first invoice this FY for this client, correctly crosses the threshold), ₹54,500 grand total, ₹49,500 net receivable, all read back in the exact shape the list page queries, then deleted. `tsc --noEmit` and `eslint` both clean; confirmed via the real browser that `/invoices` still redirects an unauthenticated request to `/login` with no server errors (full authenticated click-through needs a staff login, same standing item as the portals). **Also surfaced, not fixed here**: the live project's `firm` table has zero rows — no firm profile has ever been saved through `/account` (or wherever that settings screen lives) in this environment, so every firm-level default (GST system, state, GSTIN, TDS default) currently falls back to the code's own safe defaults rather than a real firm's actual settings; worth the user's attention independent of this tax-engine work. **Deliberately not attempted**: the full GST/TDS filing abstract (a real `/reports` page beyond "simplified invoice register by status") and a UI surfacing `placeOfSupplyMismatch()`'s advisory warning when a future manual inter-state override is added — no override control exists in the form yet, matching this pass's scoped-down discipline. |
| Sub-resource gaps — PO line items, Document Issues register, transmittal/MoM sub-resources — closes Phase 3/4's own flagged gaps | ✅ **Live (2026-09-06).** All four tables (`po_items`, `document_issues`, `transmittal_items`, `mom_actions`) already existed in Supabase with RLS — same pattern as every other gap this session found: schema built ahead, UI never wired. No new migration needed for three of the four; one small one for the fourth (below). Built: `/purchase-orders/[id]` (line items — description/unit/qty/rate, `amount_paise` computed as qty×rate since no recompute trigger exists, the PO header's own `total_paise` kept in sync from the action layer on every add/remove); `/transmittals/[id]` (documents included — either linked to a real tracked `drawings` row or typed free-text for untracked documents, matching the old model); `/moms/[id]` (action items — description/assignee/due date, a status Select OPEN→IN_PROGRESS→DONE, `task_id`/linking to a real assigned task deliberately left null, a further step not attempted here); `/document-issues` (the cross-entity register — a flat list + a manual "log an issue" form). All three list pages (`/purchase-orders`, `/transmittals`, `/moms`) gained a `ref` link to their new detail page, which didn't exist before. **Caught two real bugs during live verification, not just typechecked**: (1) `document_issues.entity_id` was `NOT NULL` with no way for a manual log entry to supply one (no entity-picker UI exists, matching this pass's manual-entry-only scope) — a real insert attempt failed immediately with a constraint violation; fixed via a new migration (`0023_document_issues_manual_entry.sql`) relaxing it, reasoning that a manual entry legitimately may have no real linked row (an externally-issued document, a historical revision). (2) The register's own `entity_type` check constraint only allows nine specific values (`LETTER`/`CONTRACT`/`PROPOSAL`/`TRANSMITTAL`/`INSPECTION`/`SPEC_SHEET`/`MOOD_BOARD`/`MOM`/`FEE_PROPOSAL`) — deliberately **not** `drawing` or `invoice` (both already have their own native revision/status tracking, so were never meant to double up in this register) — the form had guessed a plausible-but-wrong list including `drawing`/`invoice`/lowercase values; a second failed insert caught it, fixed the form's options and added the same allow-list check server-side rather than trusting the DB error alone. **Deliberately not attempted**: automatic wiring of `document_issues` from every issuing action across the app (drawings, transmittals, invoices, letters, …) — a genuinely cross-cutting change touching every domain's own action, not a side effect of this pass, same reasoning the portals' deferred activity feed used. Verified: `tsc --noEmit` and `eslint .` both clean across the whole `web/` package (not just touched files). Live-verified all four against the real Supabase project: a temporary PO (100 bags × ₹350 → ₹35,000, header total recomputed correctly), a temporary transmittal with a free-text (non-tracked-drawing) item, a temporary MoM with an action item flipped OPEN→IN_PROGRESS, and — after both fixes — a real `document_issues` row, all read back in each page's exact query shape, then every row deleted and a full zero-count sweep confirmed. Confirmed via the real browser that all four new routes (`/document-issues`, `/purchase-orders/[id]`, `/transmittals/[id]`, `/moms/[id]`) compile and correctly redirect an unauthenticated request to `/login`, no server errors in the logs. |
| Firm Settings — seeds and exposes the singleton `firm` row the tax-engine work surfaced as empty | ✅ **Live (2026-09-06).** `firm` is a Postgres singleton (`UNIQUE (singleton)` + `CHECK (singleton)` — at most one row can ever exist) with RLS that only ever allows `UPDATE` (`firm: owner/partner update`, OWNER/PARTNER only), never `INSERT` — by design, the row has to be seeded once outside the app. Migration `0024_seed_firm_singleton.sql` does exactly that: `insert into firm (singleton) values (true)`, relying on every other column's own sensible default (`company_name=''`, `firm_type='SOLO'`, `gst_type='REGULAR'`, `tds_applicable_default=true` from migration 0022) rather than guessing real firm details — the settings page is where an OWNER/PARTNER actually fills them in. Built `/firm-settings` (Admin group): company profile, GST/tax defaults (system, GSTIN, PAN, the TDS-by-default checkbox the invoice tax engine reads), and address, all in one form. Verified: `tsc --noEmit`/`eslint .` both clean; live-verified the update action against the real seeded row (set a full realistic profile, confirmed every field round-tripped, then reset back to the neutral seeded state — not left with fake data as the user's real firm profile); confirmed the page's own select query reads back the exact same shape; confirmed via the real browser that the route compiles with no server errors. **Not attempted**: a friendlier "you don't have permission" state for a non-OWNER/PARTNER role opening the page (today a save by anyone else would just silently no-op under RLS) — flagged, not guessed at. |
| GST/TDS filing abstract for `/reports` — closes the exact gap Phase 3 and 5 both flagged ("the full GST/TDS abstract... tax engine not ported") | ✅ **Live (2026-09-06).** Port of `backend/src/modules/reports/router.ts`'s `gstAbstract`/`tdsAbstract` (the `invoiceRegisterExport` CSV export wasn't ported — a follow-up, not attempted here). `/reports` was a plain invoice-register-by-status page (built when the tax engine didn't exist yet) — now a real month-by-month abstract for a chosen period (Current/Previous FY via a GET-method period selector, no JS needed — Next.js reads it straight off `searchParams`). Ported the fuller period-filter apparatus this needed from `packages/contracts/src/fy.ts` into `web/lib/tax/fy.ts` (extending the `financialYearRange`-only port from the tax-engine work): `PeriodFilterInput`/`resolvePeriodRange`/`fyDateRange`/`quarterDateRange`/`monthDateRange`. **GST abstract**: invoices per month with taxable/CGST/SGST/IGST/GST-total/composition-levy/invoice-total, a Total row. **TDS abstract**: same months, gross/TDS-deducted/net-receivable for just the TDS-applicable invoices, framed for reconciliation against Form 26AS/AIS (this firm receiving fees, not the one filing 194J returns). **One simplification, stated in the page's own comment**: grouped in JS from raw rows, not a SQL `GROUP BY` — Supabase's JS client can't group by a computed expression the way the old backend's raw Drizzle `sql` tag could, and one firm's invoice volume makes this a pragmatic choice, not a scale risk; also uses `date_invoice` alone as the period date rather than the old backend's `coalesce(date_invoice, created_at::date)` fallback — an ISSUED/PAID invoice with no invoice date can't meaningfully sit in a filing period anyway. **Caught one own bug before it shipped**: the TDS abstract's "Gross" column was reading the month's *overall* taxable total (`taxablePaise`, summed across every invoice) instead of just the TDS-applicable subset — would have shown a wrong gross figure on any month with both TDS and non-TDS invoices; caught during a code read-through, not live testing, and fixed by giving the TDS aggregate its own `tdsTaxablePaise` field before insert-testing began. Verified: `tsc --noEmit`/`eslint .` both clean. Hand-verified `resolvePeriodRange()` via a standalone `tsx` run (`CURRENT_FY`/`PREVIOUS_FY` against a fixed "today" both resolved to the correct FY date ranges and labels). Live-verified against the real Supabase project: inserted 4 temporary invoices spanning two months (September and October 2026) with one deliberately `DRAFT` — queried with the exact filter the page uses (`status in (ISSUED,PAID)`, `date_invoice` in range) and confirmed the DRAFT was excluded and the 3 remaining rows' values matched a hand-computed month-by-month/total breakdown exactly (September: 2 invoices, ₹70,000 taxable, ₹6,300 GST, 1 TDS-applicable at ₹50,000 gross/₹5,000 TDS; October: 1 invoice, ₹10,000 taxable, ₹900 GST, TDS-applicable at ₹10,000 gross/₹1,000 TDS; totals: 3 invoices, ₹80,000 taxable, ₹7,200 GST, 2 TDS-applicable, ₹60,000 combined TDS-gross, ₹6,000 combined TDS) — then all 4 deleted, confirmed only the one pre-existing real invoice (`INV/2026-27/0001`, unrelated) remains. Confirmed via the real browser that `/reports` and `/reports?preset=PREVIOUS_FY` both compile with no server errors. |
| Consultants staff directory + engagements — the staff-facing half of migration 0021, which only built the Collaborator Portal's read/submit side | ✅ **Live (2026-09-06), no new migration needed.** Found while auditing every table in the live project against `web/`'s routes for remaining gaps: `consultants`/`engagements` had real RLS since 0021 (`consultants: staff read/write`, `engagements: staff read/write`) but no staff-facing UI at all — the same gap `/contractors` had before its own directory page existed, just never closed for consultants. Built `/consultants` (directory — name/discipline/firm/email/phone) and `/consultants/[id]` (engagements per project — scope, agreed fee, a status Select ENGAGED/COMPLETED/TERMINATED, and a running "paid so far" total with a form to record each payment as it comes in, `paid_paise` incremented not overwritten). `createLogin` (provisioning a CONSULTANT-role portal login) isn't ported here either, matching `/contractors`' own already-stated limitation — a Supabase Auth admin operation, materially different from this table's own CRUD. Verified: `tsc --noEmit`/`eslint .` both clean. **Live-verified against the local Supabase stack instead of the cloud project this time** — the first real use of the local dev environment set up earlier today: inserted a temporary project + consultant + engagement via the local REST API (service-role key), confirmed the detail page's exact join query (engagement → project title) reads back correctly, confirmed the payment-recording read-then-update logic (`paid_paise` incremented from 0 to ₹20,000) matches, then deleted the project (engagements cascaded) and the consultant, confirmed both tables empty again. Confirmed via the real browser that `/consultants` and `/consultants/[id]` both compile with no server errors. |
| Users — staff directory + role/access management, a page this repo's own module map calls out that `web/` never had at all | ✅ **Live (2026-09-06), no new migration needed.** Another gap found via the same full-table-vs-routes audit that surfaced Consultants: `profiles` RLS (`profiles: owner manages`, UPDATE, OWNER only; `profiles: staff read all`, SELECT, any staff) has existed since Phase 2 — no page ever read or wrote it directly. Built `/users`: every staff profile's name/role/disabled status, gated to match the real DB permission exactly rather than a looser page-level check — an OWNER gets a role Select (staff-facing roles only: `OWNER`/`PARTNER`/`ACCOUNTANT`/`HR_MANAGER`/`SENIOR`/`ASSOCIATE`/`VIEWER`/`SITE_SUPERVISOR` — deliberately excludes `CLIENT`/`CONSULTANT`/`CONTRACTOR`, which are portal-scoped roles tied to a `client_id`/`consultant_id`/`contractor_id` that a plain role flip wouldn't set) and an Enable/Disable toggle per row; anyone else sees the same directory read-only with an inline notice explaining why. **Deliberately not built**: inviting a brand-new staff member (`Supabase Auth admin.inviteUserByEmail` — a service-role operation, materially different from this table's own CRUD, flagged not attempted) and a self-service "edit my own name" page — checked live and there's no RLS policy that would even allow it (only OWNER can UPDATE any profile, including your own), so a self-edit page would just silently fail; a real gap, not guessed around. Verified: `tsc --noEmit`/`eslint .` both clean. **Live-verified against the one real existing profile on the cloud project** (a genuine "Test User"/OWNER row from early in this migration, not a temporary insert): flipped its role to PARTNER and back to OWNER, flipped `disabled` to true and back to false, confirmed both round-trips landed exactly on the original values (`OWNER`, `disabled: false`, same `full_name`) — no lasting change to real data. Confirmed via the real browser that `/users` compiles with no server errors. |
| Office Templates + Spec Catalog — the last two gaps from the full-table audit, closing Phase 4's flagged `office_templates` and CLAUDE.md's own named-but-missing `specCatalog` | ✅ **Live (2026-09-06).** **Office Templates**: `office_templates` had RLS the whole time (`is_office_staff()` read/write) but no migration ever needed for it — a real gap, no UI at all. Port of `backend/src/modules/document/router.ts`'s `listTemplates`/`createTemplate`: `/office-templates` (list, filterable by the same five kinds the old contracts enum defined — `LETTER`/`SCOPE`/`COA`/`CONTRACT`/`MOM`, a create form) + `/office-templates/[id]` (view/edit the full body, delete). **Spec Catalog** (Library → Specification): genuinely didn't exist anywhere — confirmed via the same full `information_schema.tables` sweep that found Consultants/Users, and distinct from `/spec-sheets` (a project's own spec documents, already live) — this is the firm's versioned reference catalogue those documents pick items from. New migration `0025_spec_catalog.sql`: `spec_catalog_versions` (label/description/`active`) + `spec_catalog_items` (category/item/make/specification/finish/remarks per version), port of `backend/src/db/schema/spec-catalog.ts` verbatim. The "exactly one active version" rule (port of the old router's `setActiveVersion`) is enforced **both** ways — a partial unique index (`unique (active) where active`) at the DB layer, plus the two-step app-layer update (clear the old active row, then set the new one) that actually performs the swap, since the index alone can reject a bad state but can't perform a swap. Built `/spec-catalog` (version list, a "Set active" button per inactive row, a create-version form) + `/spec-catalog/[id]` (items table + add/remove). Verified: `tsc --noEmit`/`eslint .` both clean. Migration `0025` applied to **both** the cloud project and the local Supabase stack (`supabase migration up`, confirmed applying cleanly against the already-running local Postgres) — the local stack's first real use for verification, not just the cloud project: inserted a temporary office template (created → updated → deleted, matching the three actions' exact shapes) and two temporary catalogue versions, **deliberately tried activating the second version without clearing the first first** — confirmed the unique index actually rejects it (`duplicate key value violates unique constraint "spec_catalog_versions_one_active"`) — then performed the correct two-step swap and confirmed exactly one version ended up active, added a test item, then deleted everything and confirmed both catalog tables and the templates table empty again. Confirmed via the real browser that all four new routes compile with no server errors. |
| BBS Wall + Stair, plus a τbd correctness fix — the user flagged that BBS/Rate Books/Estimation "don't match" the AQC reference repo; a proper side-by-side comparison against AQC's actual C++ engine (`BBSDesktop/src/core/Engine.cpp`, not just the header read the first time) surfaced concrete gaps | ✅ **Live (2026-09-06), Wall + Stair only — see below for what's deliberately not reconciled.** Re-read AQC's `Engine.cpp` in full this time (831 lines, not just `Model.h`'s struct definitions) and found `generate_wall_bbs()`/`generate_stair_bbs()` fully implemented — genuinely missing element types, ported into `web/lib/bbs/formulas.ts` (new `BbsWallInput`/`BbsStairInput` zod schemas, `WALL`/`STAIR` added to `BbsElement`) and `engine.ts` (`computeWallMember`/`computeStairMember`, wired into the `computeMember` dispatcher and `BbsMemberStored`). Wall covers stem (vertical both faces + horizontal) + base (mesh both ways) + shear links, with Ast-vs-min-steel checks on stem and base; Stair covers waist main/distribution bars (main bars develop `Ld` into each landing) + two-way landing mesh, with an Ast-vs-min check on the waist. Both wired into `/bbs`'s add-member Tabs (now 6, not 4) and the detail page's element label map. **Also fixed, independent of AQC**: `CONCRETE_TAU_BD`'s M35/M40 values were wrong — 2.56/2.72 where IS 456 Table 21's own plain-bar values (1.7/1.9 N/mm²) × the Cl. 26.2.1.1 HYSD uplift factor (1.6) give 2.72/3.04; M20/M25/M30 already matched. Caught by comparing against AQC's engine, which carries the plain-bar table + uplift as two explicit steps and gets it right — but the fix itself is justified by IS 456's own published table, not by AQC being the arbiter. **Deliberately NOT reconciled, flagged for the user's own call rather than silently rewritten**: AQC's Column/Beam stirrup cutting length is more rigorous than this repo's existing (already-shipped, packages/contracts-ported) formula — AQC subtracts bend deductions at each corner (`closed_link_cutting()`, now also ported here for Wall's links) where the existing Column/Beam formulas just do perimeter-plus-hooks with no deduction, meaning ours overstates cutting length; AQC also has an IS 456 Cl. 26.5.3.2 tie-type auto-resolver (Closed/Cross Ties/Group Ties/Open Ties/U-Ties/Diagonal Ties, chosen by bar count + spacing) that Column doesn't have at all; and AQC's 135° hook allowance is 10d vs this repo's 12d (both cite IS 2502, this is a convention difference, not a clear-cut bug like τbd was). Retrofitting these into Column/Beam would mean rewriting already-tested, shipped code without being able to re-verify every downstream user of it in the time available — flagged, not guessed at. **Correction (2026-09-08): partially resolved, not left as one bundled flag** — the bend-deduction cutting length genuinely was a missing term (fixed, low-risk since the replacement formula already existed and was already tested for Wall); the hook-allowance constant and the tie-type auto-resolver are still open, for different, disclosed reasons each. See the dated 2026-09-08 entry below for the full three-way account. Verified: `tsc --noEmit`/`eslint .` both clean. Hand-verified the ported Wall/Stair formulas via a standalone `tsx` run against a real retaining-wall + staircase example — stem-vertical length (3300mm, embedding into the base), base mesh nos/lengths, shear-link cutting length (696mm, matching the bend-deduction formula), stair waist main-bar length (via the slope + 2×Ld formula, 4226.95mm), and landing mesh nos — all matched hand calculations exactly. Live-verified against the local Supabase stack (not the cloud project, to keep smoke-test data off it): inserted a temporary project + BBS schedule + a Wall member with its two computed bar items (matching the exact values the hand-verified engine produced), confirmed the stored shapes round-trip correctly, then deleted everything and confirmed all three BBS tables empty. Confirmed via the real browser that `/bbs` still compiles (redirects an unauthenticated request to `/login`, no server errors). **Rate Books/Estimation's own gap — a much bigger, separate finding, tracked in its own row below, not glossed over just because BBS got fixed first.** |
| Estimate markup cascade — closes the "Estimation doesn't match AQC" half of the user's flagged discrepancy (BBS's half is the row above) | ✅ **Live (2026-09-06).** Port of AQC's `BBSApp/Services/EstimateMarkups.cs` (`EstimateMarkupBreakdown.Compute()`) — a real DSR-abstract convention this repo's `estimates` never had: four cascading percentage add-ons (Electrical %, Plumbing % — both flat on the rate-book subtotal — then Escalation % on base+E+P, then Consulting Fee % on base+E+P+Escalation) sitting between the items subtotal and the existing contingency/GST rollup, not replacing it. New migration `0026_estimate_markups.sql` adds `electrical_pct`/`plumbing_pct`/`escalation_pct`/`consulting_fee_pct` to `estimates`, defaulting to AQC's own `Reset()` values (8/6/5/3) — a real convention, not arbitrary. `web/lib/tax/estimate-markups.ts` (`computeEstimateMarkups()`) ports the cascade math; `/estimates/[id]`'s `computeTotals()` now chains it in (items subtotal → markups → markupped subtotal → contingency → taxable → GST → grand total), with each markup line itemized in the totals panel; the create form gained the four fields. Verified: `tsc --noEmit`/`eslint .` both clean. Hand-verified `computeEstimateMarkups()` via a standalone `tsx` run (₹1,00,000 base → ₹80,000 Electrical + ₹60,000 Plumbing → ₹5,70,000 Escalation on the ₹11,40,000 running total → ₹3,591 Consulting fee on the ₹11,97,000 running total → ₹1,23,291 grand total) matched a hand calculation exactly. Migration applied to and live-verified against **both** the cloud project and the local Supabase stack: a temporary project/rate-book/estimate (relying on the migration's own 8/6/5/3 defaults, not re-specified) + one real estimate item (qty 100 × ₹1,000 rate, confirmed the existing recompute trigger correctly produced ₹1,00,000 `amount_paise`, matching the hand-verified cascade's base exactly) — then all four rows deleted (in FK-safe order: estimate before project/rate-book, since those FKs are `RESTRICT` not `CASCADE` — caught by the first delete attempt failing, not assumed) and confirmed empty. Confirmed via the real browser that `/estimates` compiles with no server errors. **Deliberately NOT attempted, and the far bigger of the two Estimation findings**: AQC's actual "Estimate" isn't a rate-book × manual-quantity model at all — it auto-derives BOQ *quantities* from a full building/room/wall/opening model via `CivilBoqCalculator`/`MaterialsCalculator`/`DerivationEngine` (masonry, plaster, paint, doors/windows, tiles, concrete-mix breakdown into cement/sand/aggregate bags, steel weight pulled straight from the BBS engine) — a rules-based auto-takeoff system with no equivalent building-model schema in this repo at all. Building that properly is a genuinely separate, multi-session undertaking (an entire new domain model, not a continuation of this pass) — flagged clearly to the user as the real remaining gap, not glossed over just because the markup cascade shipped. |
| Pomodoro, Calculator, Wellness — office-wellbeing modules ported from the old `frontend/`, requested alongside the auto-derivation/BBS work — **not in the migration spec; proposed here** | ✅ **Live (2026-09-06).** Pomodoro (`components/aorms/pomodoro/{PomodoroContext,PomodoroRing,HeaderPomodoro}.tsx`) — context ported near-verbatim (pure client `setInterval` countdown, no backend table), the interactive SVG dial rebuilt as **custom UI** — the user's own explicit one-off exception to this repo's Pure Carbon rule ("only for pomodoro you can create custom ui"), still using Carbon CSS tokens for color. Calculator (`lib/calc/dimensional-calc.ts` + `components/aorms/calculator/HeaderCalculator.tsx`) — the old `FloatingCalculator.tsx`'s unit-aware `safeEval`/tokenizer/shunting-yard evaluator (length/area/volume arithmetic, `'`/`"`/ft/in/m2/m3 suffixes, no `eval()`) ported verbatim as pure functions; the UI shell rebuilt in stock `@carbon/react` (Popover/TextInput/Toggle), not the old MUI shell — no exception granted here, Carbon-only per standing governance. Wellness (`lib/wellness/{patterns,exercises,prefs}.ts` + `components/aorms/wellness/{BreathGuide,RoutineGuide,HeaderWellness}.tsx`) — breathing patterns/stretch/eye-exercise routines ported verbatim (timing logic unchanged: `requestAnimationFrame` against a wall-clock start), but the old orb/glyph visuals (custom MUI shapes) are **not** ported — Wellness got no custom-UI exception either, so the guides are plain Carbon type + `ProgressBar` instead. All three wired into `AppShell.tsx`'s header via `HeaderGlobalAction`+`Popover`; all client-side/localStorage only, no new migration. Verified: `tsc --noEmit`/`eslint` clean across every new file. |
| Ollama moved off Podman to a native Windows install; Podman scoped down to only the local Supabase stack — infra hygiene, not a feature, prompted by a real incident | ✅ **Done (2026-09-06).** While setting up the ESTI agent above, the Podman WSL VM (2GiB RAM cap) OOM'd and wedged running 12 Supabase containers plus an Ollama container/model-pull at once — `podman machine start`/`stop` both failed identically until `wsl --terminate podman-machine-default` force-reset the hung VM. Rather than just recovering and moving on, asked the user whether to keep Podman for Ollama too; user chose to move Ollama off Podman entirely (native Windows via `winget install Ollama.Ollama`, binds `127.0.0.1:11434` directly — no gvproxy port-forwarding, which had its own separate bug this session hit first: gvproxy bound the Podman-container Ollama's forwarded port to `::1` only, not `127.0.0.1`, confirmed via `Get-NetTCPConnection`) and keep Podman for Supabase only. Also removed, per an explicit follow-up "remove all the stale podman items": the standalone Ollama container/image/both volumes, a leftover `mongo:7` image (from the MongoDB-for-local-dev idea earlier this session, which this repo did not adopt — see CLAUDE.md's Dev/verify loop), 4 dangling `<none>:<none>` build layers, 3 orphaned anonymous volumes, the old `compose.yaml` stack's cached-but-containerless images (`esti-jobs-gateway:test`, `esti-frontend:dev`, `esti-backend:dev`, `esti-worker:dev`, `redis:7-alpine`, `postgres:16-alpine`, `minio/minio`, `python:3.12-slim`, `node:20-alpine`) and the orphaned `esti-aorms_default` network — roughly 12GB reclaimed, `podman system df` afterward shows 12 images/5.735GB, all Supabase, nothing reclaimable. `compose.yaml`/`compose.prod.yaml` themselves are untouched — production still runs a containerized Ollama (`compose.prod.yaml`'s `esti-ollama`), this only changes local dev. Documented in CLAUDE.md's AORMS AI + Dev/verify-loop sections. |
| CLAUDE.md's "Stack migration" section said "planned, not yet started" / "nothing in the current codebase changes" / "do not assume Next.js/Supabase exist in this repo" — flatly contradicted by `web/`'s entire existence and this roadmap's own "in progress" status line — found during a requested repo-wide stale-doc sweep | ✅ **Fixed (2026-09-06).** Rewrote the section to state plainly that `web/` is real, live, and under active development (~26 migrations, dozens of browser-verified features), matching what this roadmap has said all along; kept the one part that was still true (production `frontend`/`backend` stays live and unchanged until a phase is merged). Also fixed ROADMAP-CLOUD.md's own "ESTI AI Agent" bullet list (§ Office hub feature rollout), which still said the agent ran "via the backend AI gateway" — that gateway is dead code now (`backend` doesn't run locally, isn't redeployed from this repo state); pointed it at the real `web/` implementation from the Phase 7 row above instead. |
| Project BBS (Bar Bending Schedule) — Delivery sub-module, not part of any phase's activation chain — **not in the migration spec; proposed here, prompted by a request to match [HolagundiWorks/AQC](https://github.com/HolagundiWorks/AQC)'s estimation/BBS/BOQ coverage** | ✅ **Schema + UI both live (2026-09-06).** Scoped down first: AQC-Core (cloned and read — README, `Aorms.Bridge` sync layer, the C++ `BBSDesktop/src/core/Model.h` engine) covers Column/Beam/Slab/Footing/Wall/Stair with its own C++ engine; this repo already had a real, tested, IS 456/IS 2502-compliant BBS engine of its own (`packages/contracts/src/bbs.ts` + `bbs-engine.ts` + `bbs.test.ts`) backing the old backend's live `bbs` tRPC router — never ported to `web/`. Ported that engine (the proven one, not a fresh translation of AQC's untestable-here C++) verbatim into `web/lib/bbs/formulas.ts` + `engine.ts`, matching every prior domain's porting discipline. "Estimation" and "BOQ" were judged already covered by the existing live `rate-books`/`estimates` domain (Phase 4) — not re-audited feature-by-feature against AQC's fuller DSR abstract in this pass, flagged as an open question below, not a confirmed non-gap. Migration `0019_project_bbs.sql` (`bbs_schedules`/`bbs_members`/`bbs_items`) applied and verified live — RLS matches the old router exactly (read `is_office_staff()`, write `has_capability('write')`, same shape as drawings/transmittals, confirmed via `pg_policies`). Column/Beam/Slab/Footing only, matching the ported engine's own coverage — Wall and Stair exist in AQC but have no tested formula counterpart here, flagged as a follow-up rather than guessed at from foreign C++. Built `/bbs`(`/[id]`) — schedule list + detail with a 4-tab (Column/Beam/Slab/Footing) add-member form (fixed up to 3 bar-diameter/count pairs per bar group, not a dynamic list), a bar-schedule table, a diameter-wise summary table, per-member advisory checks (Ast-vs-min, anchorage-vs-development-length), Regenerate/Delete member actions, and a manual bar-line entry form for odd bars not worth modeling as a full member. Wired into `AppShell.tsx`'s Delivery sidebar group, matching CLAUDE.md's own module-map placement ("Delivery → BBS"). Verified two ways since no browser-login credential was available in this environment: (1) a standalone `tsx` run of the ported engine against hand-calculated Column/Beam examples — Column tie length (2×(220+370)+192=1372mm, 21 nos, 11.38 kg) and main bars (24 m total, 37.93 kg, 49.31 kg total) matched by hand exactly; Beam stirrup count (2×10+11=31), support/middle-zone spacing math, and the full-span top/bottom bar development-length formula (Ld≈752.19mm via IS 456 Cl. 26.2.1, giving 5504.38mm cutting length) also matched by hand; (2) a live round-trip against the real Supabase project via the Management API — inserted a real schedule + the hand-verified Column member + its two computed bar items, queried the diameter-wise summary back (dia 8: 21 nos/28.81 m/11.38 kg; dia 16: 8 nos/24.00 m/37.93 kg — exact match), then deleted the schedule and confirmed cascade delete removed the member and both items (all three counts back to 0). `tsc --noEmit` and `eslint` both clean on every new/touched file. **`next build` not run** — a pre-existing, unrelated Sass config-resolution failure (`@carbon/styles`'s `_reset.scss` can't resolve `@use 'config'` under Turbopack in this environment) reproduces identically on a clean `git stash`ed tree with zero BBS changes, so it predates this work; `next dev --webpack` (a different bundler) does start correctly and served `/bbs` (redirected to `/login` as expected, unauthenticated) — full interactive click-through verification is a follow-up once either that build issue or a login credential is available in this environment. **Deliberately not built**: Wall/Stair members (see above), a dynamic (non-fixed-3) bar-diameter list, and re-auditing whether AQC's DSR/markup abstract reveals gaps in the existing `rate-books`/`estimates` domain beyond this session's own inference that it's already sufficient. |

| Project take-off (IS 1200 wall measurement + AQC's other measured-item categories) — the "auto-derivation from geometry" gap, closing the largest item flagged when this repo's Estimation was compared against [HolagundiWorks/AQC](https://github.com/HolagundiWorks/AQC) — **not in the migration spec; proposed here** | ✅ **Schema + UI live (2026-09-07) — 17 of AQC's ~18 measured-item categories now covered; only "shuttering" is deliberately excluded (AQC itself computes it only from RCC members, never as a manually-measured category).** **Phase 1:** a prior pass this session mischaracterized AQC's architecture as needing "a whole building/room/wall model" from `EstimateCalculator.cs`'s summary alone; re-read the real source (`BBSApp/Services/{TakeoffModels,ProjectStore,CivilBoqCalculator,MaterialsCalculator}.cs`, ~5,300 lines total, not just `Model.h`'s structs) and found the actual shape is simpler: a flat, per-category measured-item list, each row's *quantity* computed from its own dimension fields plus a deduction rule against linked door/window openings, not typed in directly the way this repo's `estimate_items` always has been. Ported the single most valuable instance first: IS 1200 wall measurement (masonry/plaster/painting) with door/window opening deductions. Migration `0027_project_takeoff.sql` — one generalized `takeoff_items` table (`category` + jsonb `fields`), a faithful port of AQC's own `Dictionary<string,string>` row shape rather than one rigid table per category, so follow-up categories need zero new migrations. `web/lib/takeoff/formulas.ts` ports `CivilBoqCalculator.DeductFaceArea()`/`OpeningAreaMm2()`/`JambAreaMm2()`/`MasonryLines()`/`PlasterLines()`/`PaintingLines()`/`YieldUnits()`/`YieldMortar()` and `MaterialsCalculator`'s mix-ratio split — IS1200 masonry's "ignore openings < 0.1 m²" threshold (plaster/paint always deduct in full), brick/block/mortar yield (AQC's own `CivilYields` defaults), jamb-area addition. `web/lib/actions/takeoff.ts`, `/takeoff` (project picker) + `/takeoff/[projectId]`, wired into `AppShell.tsx`'s Estimation & Technical group. Hand-verified via a deleted `tsx` script against a real wall example (5m×3m, 230mm brick, one door + one window — net area 11.67 m², volume 2.684 m³, 1,409.153 bricks, jamb addition 0.104 m² — all matched exactly, incl. confirming IS1200 masonry ignores a 0.06 m² opening while plaster/paint still deducts it in full); live-verified against the local Supabase stack via the Management API **and** through the real signed-in browser UI (added a Painting item via the form, confirmed correct rendering, deleted it, confirmed removal). **Phase 2 (same day):** ported the remaining 12 categories flagged as a follow-up — migration `0028_takeoff_more_categories.sql` widens the category check constraint to add PCC, earthwork, SSM (size-stone masonry), waterproofing, DPC, coping, screed, VDF, skirting, parapet, plinth protection, and flooring — no other schema change needed, confirming the point of the generalized jsonb-fields table. 12 more `compute*()` functions in `formulas.ts`, each ported from its own `CivilBoqCalculator.*Lines()` — PCC uses the *proper* mix-ratio yield (`pccYield()`); Screed deliberately uses a *different*, cruder empirical per-mix lookup (`screedYield()`, ported from `ApplyPccMaterials()`) since that's a real distinction AQC itself makes between the two categories, not unified away; Parapet reuses masonry's own brick/block yield with no opening deduction; Flooring is the only one of these 12 with deduction logic, reusing the same engine as masonry/plaster/painting. UI: one generic `SimpleCategoryForm` (a field-spec list, not 12 near-duplicate Carbon forms) covers all 12 new tabs, and one consolidated "Other measured items" table covers all 12 categories' rows — `/takeoff/[projectId]` now has 17 add-item tabs total. Verified: `tsc --noEmit`/`eslint` clean on both phases. Hand-verified all 12 new formulas via a deleted `tsx` script (PCC 3m×2m×100mm → 0.6 m³/2.047 bags; SSM 5m×0.45m×1.5m → 3.375 m³; Earthwork 10m×3m×1.5m → 45 m³ no yield; Waterproofing both Area/Periphery modes; DPC/Coping/Screed/VDF/Skirting/Plinth protection all matched; Parapet's one apparent mismatch on first pass was the verifier's own wrong assumption, not a bug — 115 mm correctly falls into the same ≤120 mm half-brick area-yield branch masonry uses, matching AQC's own `T <= 120` condition exactly). Live-verified against the local Supabase stack: applied migration `0028`, inserted a real PCC + Parapet item via the Management API (matched exactly), then added a Screed item **through the real signed-in browser UI's actual form** (4m×3m×40mm → 0.48 m³/3.482 bags, matching exactly; combined materials Tile correctly summed across all three categories) — all temp data deleted after (project cascade-delete, confirmed empty). **Phase 3 (same day): the `estimate_item` wiring itself.** Every take-off row now has a "Send to Estimate" control (a compact `<Select>` of the project's existing estimates + a submit button) across all five tables (masonry/plaster/painting/doors&windows/other-12-consolidated). `web/lib/takeoff/formulas.ts` gained a shared dispatcher — `linkedOpeningsFromRows()` + `computeTakeoffQuantity(row, allRows)` — that turns any one stored `takeoff_items` row into `{description, unit, quantity}` for all 17 categories (kept separate from the take-off page's own richer per-category rendering, which shows dims/materials/notes columns the estimate link doesn't need). `web/lib/actions/estimates.ts` gained `sendTakeoffItemToEstimate` — refactored the existing `createEstimateItemRecord`'s insert/audit/revalidate logic into a shared `insertEstimateItem()` helper both actions call, rather than duplicating it. The new item is priced at ₹0 with `linked_item_id` set to the take-off row's own id — that column already existed (migration `0005`, "provenance only... e.g. plastering → brickwork") and was sitting unused; this is the same kind of link, just take-off → estimate instead of item → item, so no schema change needed here either. `web/components/aorms/SendTakeoffToEstimateButton.tsx` is the new client component. Verified: `tsc --noEmit`/`eslint` clean. Hand-verified the dispatcher via a deleted `tsx` script (masonry wall with one linked door → correct net-deducted quantity and description; unknown category and invalid stored fields both correctly return `null` rather than throwing). Live-verified end-to-end **through the real signed-in browser UI**: created a temp project + rate book + estimate + a masonry wall with a linked door via the Management API, then actually clicked "Send to Estimate" on the wall's row in the real UI — confirmed the resulting `estimate_items` row via the API (`description: "Masonry wall W1 — 230 mm (Brick)"`, `unit: "m³"`, `quantity: 3.015`, `rate_paise: 0`, `linked_item_id` matching the take-off row's own id exactly) — then loaded `/estimates/[id]` in the real browser and confirmed the item renders correctly in the items table and totals rollup. All temp data deleted after (estimate → project → rate book, respecting the same FK-`RESTRICT` order caught earlier this session). Fixed the take-off page's now-stale "doesn't write to Estimates yet" helper text to describe the real flow. ****Correction (2026-09-08): this row was stale** — migrations 0027/0028 ARE live on the cloud project (confirmed via PostgREST's own schema introspection, `takeoff_items` and its columns present and queryable); whichever session applied them never came back to update this closing note. **Deliberately not built**: `ColumnLayout.cs`/`MasonryWallBuild.cs` (wall-unit-size preset pickers — convenience, not correctness); PDF/Excel export of the take-off sheet; bulk "send all rows" (one row at a time only, for now). |

**UI audit (2026-09-07), on explicit request:**
- ✅ **Fixed — mobile nav was completely broken.** `AppShell.tsx`'s `SideNav`
  had `isFixedNav expanded` hardcoded with no state at all, forcing it
  permanently open and fixed-width regardless of viewport — on a phone-width
  (375px) screen this squeezed the entire page content into an unreadable
  sliver, and the header's 6 global actions overflowed with "AI Runs" and
  "Sign out" completely unreachable (absent from the interactive DOM, not
  just visually clipped). Fixed with Carbon's standard responsive UI Shell
  pattern: a `HeaderMenuButton` toggling stateful `expanded` on `SideNav`
  (dropped `isFixedNav`, left `isPersistent` at Carbon's own default) — its
  own `ui-shell` CSS (already `@use`d in `globals.scss`) now handles the
  breakpoint: full desktop (≥66rem) stays fixed-open exactly as before,
  narrower windows get a collapsed icon rail with the hamburger opening it
  as a dismissible overlay. Verified live in the real browser at both a
  375px phone width (rail → hamburger → full-width readable content) and an
  800px window (confirmed this isn't a desktop regression — the same
  toggle correctly opens/closes at this width too, matching Carbon's
  intended per-breakpoint behavior, not a bug).
- ✅ **Header overflow — fixed same day, as a follow-up.** The 6
  `HeaderGlobalAction`s (Ask ESTI/Wellbeing/Calculator/Pomodoro/AI Runs/
  Sign out) don't all fit a 375px header alongside the "AORMS Office Hub"
  brand text — at that width only 3–4 icons rendered, with "AI Runs"/
  "Sign out" genuinely absent from the interactive DOM (confirmed via
  `read_page`, not just visually clipped). An `OverflowMenu` wasn't a good
  fit — these aren't simple links, each is a rich `Popover` (Ask ESTI's
  chat form, Calculator's input, Pomodoro's SVG dial) that can't fold into
  a generic menu item. Two-part CSS-only fix instead (`app/globals.scss`,
  structural-only, matching this repo's established convention): below a
  42rem breakpoint, hide the redundant "Office Hub" text (the logo `<img>`
  already carries the brand) to reclaim space — that alone was enough to
  fit all 6 icons at 375px with no scrolling needed; `.cds--header__global`
  also gets `overflow-x: auto` as a safety net so nothing is ever truly
  unreachable regardless of how many header actions this app grows to.
  Verified live: at true 375px (confirmed via `read_page`'s reported
  viewport, not just a screenshot at a glance — an earlier measurement
  attempt via `window.innerWidth` gave a stale/inconsistent reading and was
  discarded in favor of this), all 6 actions are back in the interactive
  DOM including "AI Runs" and "Sign out"; at 800px desktop, brand text and
  all 6 icons still show exactly as before (confirmed no regression above
  the breakpoint).
- ✅ **Confirmed clean** — zero MUI/`@hcw/ui-kit` imports anywhere in
  `web/` (one `hcw-ui-kit` grep hit in `app/page.tsx` is a comment
  explaining it was deliberately *not* ported, not a real import), zero
  hardcoded hex/`rgb()` colors outside Carbon tokens, and the 3 "New*Form"
  components without `FormGrid` (`NewPackageInviteForm`,
  `NewTeamMembershipForm`, `NewTenderInviteForm`) are correctly single-field
  forms that have nothing to grid — not a real gap in the earlier
  multi-column-forms pass.
- **Flagged, not fixed**: `web/app/globals.scss` includes only
  `themes.$white` — the whole app is hardcoded to one Carbon theme with no
  `prefers-color-scheme`/`[data-theme]` dark variant at all. Not
  necessarily wrong (many B2B office apps ship one theme deliberately), but
  worth a product decision rather than silently building a theme switcher
  unasked.

**WCAG audit (2026-09-07), on explicit request:**
- ✅ **Fixed — 20 form controls had no accessible name at all.** Grepped
  every `hideLabel` usage (23 files) and found 20 paired it with
  `labelText=""` — Carbon's `hideLabel` renders a real (CSS
  `visually-hidden`, confirmed by reading `TextInput.js`) label element, so
  this isn't "no label shown," it's "the hidden label itself says nothing"
  — a genuine WCAG 1.3.1/4.1.2 failure (a screen reader tabbing to any of
  these would announce e.g. "combobox" with zero indication of what it
  controls). Mostly inline status-change `<Select>`s used in table cells
  (`LeadStatusSelect`, `ProjectStatusSelect`, `RiskStatusSelect`, and 15
  more of the same shape, one per domain), plus this session's own
  `SendTakeoffToEstimateButton.tsx`. Fixed all 20 with real descriptive
  `labelText` values (`"Lead status"`, `"RA bill status"`, etc.) — two
  needed dynamic labels built from context already in scope rather than a
  static string (`cpi/FieldControl.tsx`'s per-item rank select → `` `Rank —
  ${item}` ``; `PhaseGateChecklist.tsx`'s decision select → `` `${GATE_LABELS[gateKey]} decision` ``).
  Visual layout is unchanged (`hideLabel` stays on all 20) — this is purely
  an accessible-name fix. Verified: `tsc --noEmit`/`eslint` clean on all 21
  touched files (20 fixes + confirming zero `labelText=""` remain anywhere).
- ✅ **Fixed — the Pomodoro dial (this session's one licensed custom-UI
  exception) was keyboard-inoperable.** Its `<svg>` was marked `role="img"
  aria-label="Pomodoro dial"` — a static-image role — despite containing 4
  real interactive controls (start-focus, start-break, the drag-to-set-
  duration knob, and the start/pause toggle text), none reachable by
  keyboard and all invisible to a screen reader as anything but a picture.
  The custom-UI license was for visual design, not an exemption from
  keyboard operability (WCAG 2.1.1). Fixed: dropped the blanket image role;
  gave each of the 3 click targets `role="button"` + `tabIndex={0}` +
  a real `aria-label` + `onKeyDown` Enter/Space activation; gave the
  duration knob `role="slider"` + `aria-valuemin/max/now` + arrow-key
  increment/decrement (Home/End jump to 1/60) as the keyboard equivalent of
  dragging it, guarded by the same `!pom.running` check the pointer-drag
  already had. The big countdown digits inside the SVG are `aria-hidden`
  (a screen reader announcing every second would be unusable noise) with a
  `cds--visually-hidden` status line added alongside instead — present in
  the DOM for on-demand reading, not `aria-live`, so it doesn't spam
  updates. Verified live in the real browser: real `Tab` key presses moved
  focus onto all 4 SVG controls in order (confirmed via
  `document.activeElement`, not just DOM attribute presence); a
  well-formed synthetic `KeyboardEvent('keydown', {key: 'Enter'})`
  dispatched at the focus-session path correctly started the timer
  (aria-label flipped `"Start focus session"` → `"Pause focus session"`);
  a well-formed `{key: 'ArrowUp'}` event on the focused knob correctly
  incremented `aria-valuenow` 25 → 26. (This session's own browser-
  automation tool's synthetic "Up"/"Down" key dispatch doesn't populate
  `event.key`/`event.code` at all in this sandboxed environment — confirmed
  via a live listener showing every field empty — so the well-formed-event
  dispatch above was used as the real test instead of trusting that tool's
  raw key-press action for this one interaction; real hardware key presses
  in a real browser populate `event.key` normally, this is a test-tooling
  limitation, not an app bug.)
- **Swept for the same class of bug elsewhere**: zero `<div>`/`<span>` with
  a raw `onClick` anywhere else in `web/` — every other interactive
  surface already goes through real Carbon `Button`/`Link`/form elements,
  which are keyboard-accessible by construction. The Pomodoro dial was a
  one-off (the one place custom SVG UI is licensed at all), not a pattern.
- **Confirmed clean, no other findings**: all 7 `<img>` tags in `web/`
  have real `alt="AORMS"` text (an earlier grep pass flagged JSX comments
  mentioning `<img>`, not actual tags — re-checked precisely). Heading
  hierarchy on the two pages checked (`/dashboard`, `/takeoff/[projectId]`)
  is clean h1→h2→h3 with no skipped levels; a `<p className="cds--type-heading-04">`
  that looked heading-like in a grep was confirmed to be a KPI tile's large
  *value* text, correctly not marked as a document heading.

**Padding audit (2026-09-07), on explicit request — first pass was wrong,
corrected same day after the user pushed back ("padding is not correct").**
The first pass checked whether individual padding/margin *values* matched
Carbon's spacing scale (they all did — 0.25rem–3rem, no off-scale values
anywhere) but never checked whether padding was being applied *twice*.
It was: all four authenticated route groups (`(app)` via `AppShell.tsx`,
`(portal)`/`(collab-portal)`/`(contractor-portal)` directly) wrap children
in Carbon's own `<Content>`, which already carries its own built-in
`padding: 2rem` — and **every single page** (86 files, one consistent
`<Grid style={{ padding: "2rem" }}>` wrapper each) added *another* 2rem on
top, doubling the real padding to effectively ~4rem on every side of every
page in the app. Confirmed live via computed styles before the fix
(`.cds--content` padding `32px` + the page's own `Grid` padding `32px`,
stacking) and after (`Grid` back to its own built-in `0px 16px` gutter,
`.cds--content`'s `32px` now the only page-level padding). Fixed
mechanically across all 86 files (`<Grid style={{ padding: "2rem" }}>` →
`<Grid>`) — confirmed via grep that every one of the 121 `padding: "2rem"`
occurrences found in the first pass was this exact pattern, none legitimate
elsewhere, so the fix needed no manual judgment calls file-by-file.
Verified: `tsc --noEmit`/`eslint` clean across `app/`; confirmed live in
the browser on `/dashboard` and `/takeoff` that content now sits at the
correct single gutter, not the doubled one from before. Also noted, still
cosmetic and still not changed: Dashboard's 7 KPI tiles in a 2-column grid
leave "Outstanding receivables" alone in its own row.

**Padding audit, round three (2026-09-07) — the real, app-wide bug, found
after the user reported it directly ("in input boxex, and dashboard boxex
there is no proper padding").** Every Carbon `Tile` and every form input
(`TextInput`/`Select`/etc.) across the entire app had **zero internal
padding** — text sat flush against the box edges everywhere, on every
page. Root cause, confirmed via `getComputedStyle()`: Carbon v11's Tile
and form components don't hardcode their padding — they read it via
`clamp()` from a set of `--cds-layout-density-padding-inline-*` CSS
custom properties, which are only defined by a `:root { @include
emit-layout-tokens(); }` block that Carbon's own `layout` SCSS module
emits *when that module is `@use`d* — and `app/globals.scss` never `@use`d
it. Confirmed precisely: querying `--cds-layout-density-padding-inline-min`
(and its siblings) on `:root` returned an empty string — completely
undefined anywhere in the cascade, not just overridden — so every
`clamp()` reading them resolved to nothing and the padding shorthand fell
back to its CSS initial value, `0`. This is a different, deeper bug than
the two earlier "padding" passes above (page-level gutters, both correct
as far as they went) — this one was about component-internal padding
being silently absent everywhere, the whole time. Fixed with one line:
`@use "@carbon/react/scss/layout";` added to `globals.scss`. Verified via
`getComputedStyle()` before/after (`.cds--tile` padding `0px` → `16px`;
`.cds--text-input` padding `0px` → `0px 16px`; the custom property itself
empty → a real value) and visually across three different pages
(`/dashboard`'s KPI tiles, `/estimates`'s form, `/leads`'s form) — text
now sits with correct breathing room inside every tile and input, buttons
are correctly sized, nothing else (header, sidenav, tables) visibly
shifted. No `tsc`/`eslint` implications (pure SCSS change, no TS/JS
touched) — a dev-server restart-free hot-reload confirmed the fix live
without a rebuild.

**Header mobile audit, follow-up (2026-09-07) — stray vertical scrollbar on
the header.** After the earlier header-overflow fix (horizontal-scroll
safety net on `.cds--header__global`, above), the user reported a vertical
scrollbar on the header itself at mobile width. Root cause: the fix set
`overflow-x: auto` but left `overflow-y` unset — per the CSS Overflow spec,
when one axis is non-`visible` and the sibling axis is left at the initial
`visible`, that sibling axis is behaviorally treated as `auto` too, so
`overflow-y` silently computed to `auto` even though it was never written.
Confirmed via `getComputedStyle()`: `overflow-y: auto` with `scrollHeight:
48` vs `clientHeight: 47` — a 1px mismatch, enough to paint an unwanted
scrollbar. Fixed by adding an explicit `overflow-y: hidden;` (this bar only
ever needs to scroll horizontally). Verified live at 375px width:
`overflow-y` now computes `hidden`; screenshot after collapsing the side
nav to its icon rail shows all 6 header actions (Ask ESTI/Calculator/
Pomodoro/Wellbeing/AI Runs/Sign out) fitting cleanly with no scrollbar in
either axis. `tsc --noEmit` clean (pure SCSS change).

**AORMS Platform — portable user/company identity + licensing tiers
(2026-09-07).** New feature, on explicit request: a person gets a
portable `AORMS-U-` identity independent of any one firm; a company gets
its own `AORMS-C-` identity; **one person can belong to multiple
companies**; usage hours are tracked (an active-app-usage heartbeat, not
logged task hours — confirmed via `AskUserQuestion`); a person's level
(`BASIC`→`PRO`) flips **automatically** at 100 hours (confirmed
automatic, not an apply/approve step, resolving the request's ambiguous
"apply for Pro" phrasing). Rebuilds the shape of the old, now-dead
`backend/`'s licensing platform design (`docs/esti/AORMS-IDENTITY.md`,
`AORMS-U-`/`AORMS-C-` handles, many-companies-per-person membership, a
100-hour threshold) fresh, on Supabase, for `web/` — full design
rationale, confirmed decisions, and the deliberate simplification (both
handles mint **immediately** on creation here, not "earned" at 100h like
the old design) are in the plan this was built from
(`C:\Users\holag\.claude\plans\staged-purring-blum.md` on the machine
this was built on).

**Why a second, separate local Supabase project, not new tables in
`web/`'s own schema:** `web/`'s schema is deliberately single-tenant per
deployment (`web/supabase/migrations/0001_phase2_core.sql`'s own header
comment; `firm` is a hard Postgres singleton,
`web/supabase/migrations/0024_seed_firm_singleton.sql`) — "one person,
many companies" can't be modeled inside that without undoing that
decision, so it needs a genuinely separate layer. New top-level Supabase
CLI project `platform/supabase/` (2 migrations: `0001_core.sql` —
`accounts`/`companies`/`memberships`, the `new_public_id()` Crockford
base32 generator, RLS built the same way `web/`'s own
`current_app_role()`/`is_office_staff()` avoid recursive-policy issues
(`is_company_owner()` here); `0002_usage_and_level.sql` —
`usage_heartbeats` + an `after insert` trigger that atomically increments
`total_active_seconds` and flips `level` at the 360000-second/100-hour
threshold, avoiding any read-then-write race between concurrent
heartbeats). Local ports are every one of `web/supabase/config.toml`'s
own ports **+100** (full table + start/stop commands now in root
`CLAUDE.md`'s Dev/verify loop section).

**`web/` integration ("link, don't merge"):** `web/lib/platform/{client,server,service}.ts`
mirror `web/lib/supabase/*` byte-for-byte (same `@supabase/ssr` pattern),
pointed at the platform project. The **only** change to `web/`'s own
schema is one additive column, `web/supabase/migrations/0029_platform_link.sql`
(`profiles.platform_public_id text unique`, nullable) — stores a linked
person's `AORMS-U-` handle as a plain value, not a live FK (impossible
across separate Supabase projects), verified server-side before being
written. New Server Actions (`web/lib/actions/platform.ts`):
`platformSignUp`/`platformSignIn`/`platformSignOut` (the platform
project's own, separate login — `web/`'s first signup flow, confirmed via
Explore that none existed anywhere in `web/` before this),
`linkPlatformIdentity`, `createCompany`, `joinCompany`, `leaveCompany`,
`inviteMember`, `updateMembershipRole`, and `recordHeartbeat` (server-side
only, no-ops silently when unlinked). New UI: `app/(platform)/platform-signup`
+ `platform-login` (a genuinely separate, unauthenticated-to-the-firm-app
login boundary — own minimal layout, mirrors `(auth)/layout.tsx`); `app/(app)/identity`
+ `app/(app)/companies/[companyId]` (kept under the existing `(app)/`
group, not the plan's literally-drafted `(platform)/` path, so they keep
the app shell/nav like every other admin page — a deliberate, disclosed
deviation from the plan's file layout, not its architecture). New nav
entry: "AORMS Identity" in `AppShell.tsx`'s Admin group. `UsageHeartbeat.tsx`
(a no-UI Client Component posting a beat roughly every 60s while the tab
is visible) is mounted in `app/(app)/layout.tsx`, so hours accrue from
real usage of the firm app itself, not just the platform's own pages.

**A real bug found and fixed mid-build, not just a verification note:**
`@supabase/ssr`'s default auth-cookie name derives from the project URL's
*host*, not the full origin — both local stacks share `127.0.0.1` as
host, so they collided on the identical default cookie name
(`sb-127-auth-token`). Caught live: right after platform signup, linking
failed with "Not signed in" — signing into the platform had silently
overwritten `web/`'s own session cookie, signing the user out of the firm
app in the same browser tab. Fixed with an explicit
`cookieOptions: { name: "sb-platform-auth-token" }` on the platform
client/server files (documented at length in both those files' own
header comments and in root `CLAUDE.md`, since it's exactly the kind of
thing that silently reappears if a future `platform/`-adjacent client is
added without it).

**Verified, live, real browser click-through, on the fixed cookie code
(the earlier collision-affected run was redone from a clean session
after the fix):** platform sign-up → `/identity` correctly detects the
active platform session and pre-fills the handle → link → linked view
renders the real handle/`BASIC` tag/`0.0h of 100h` → create a company →
`AORMS-C-` handle appears immediately, `OWNER` tag, auto-created
membership → company detail page renders the member table + add-member
form → service-role-seeded heartbeats crossing 360000 cumulative seconds
→ reload → tag flips to `PRO` live in the UI (`100.0h of 100h`, no "to
Pro" suffix). Also hand-verified directly against the platform database
before any UI existed: `new_public_id()` produces unique, correctly-shaped
handles across repeated calls (`AORMS-U-V5PK`/`AORMS-U-FATS`/
`AORMS-C-FS8B`/`AORMS-C-QY30` across two test accounts and two test
companies); one account joining two different companies (one as `OWNER`,
one as `MEMBER`) proves many-companies-per-person structurally; the
`usage_heartbeats` seconds `CHECK` constraint correctly rejects `0` and
`121`. `tsc --noEmit`/`eslint` clean across every new/touched file. Both
Supabase projects' migrations apply cleanly from a fresh `db reset`
(platform: 2/2; `web/`'s new `0029`: applied cleanly to the running
stack). The platform database was reset to a clean slate after
verification (matching this session's established discipline); `web/`'s
own database picked up one new test login,
`owner-test@aorms.local`/`testpass123`, created because the cookie-
collision bug (before it was found and fixed) had invalidated the
session already signed in for testing.

**Deliberate simplifications, not gaps to be surprised by later:** no
INVITED/owner-approval step on joining a company (self-serve join and
owner-invite both land straight at `ACTIVE` — flagged the same way
`web/lib/actions/users.ts` already flags "invite a new staff member" as a
known follow-up, not a bug); no ownership-transfer flow (an `OWNER` can
"Leave" like anyone else, which would leave a company ownerless — not
guarded against in this pass); no company-level `AORMS-C-` "earned at
100h" mechanic (the old design's own nuance, deliberately dropped — see
the Context section of the build plan above); no cert-issuance UI (the
portable-certifications side of the old design was out of scope for this
request, which only asked for identity + companies + hours + tier).

**AORMS Platform, follow-up (2026-09-07) — invite/join flows verified +
re-link gap fixed.** Manually built a three-account scenario in the real
browser to exercise both membership paths end-to-end: Owner Alice creates
a company, **invites** Charlie Invitee by handle from the company detail
page's "Add a member" form (owner-only), and Dana Joiner **self-serve
joins** the same company by its `AORMS-C-` handle from her own identity
page. Confirmed both from the UI and directly against the database
(`memberships` rows: Alice `OWNER`/`ACTIVE`, Charlie `MEMBER`/`ACTIVE` via
invite, Dana `MEMBER`/`ACTIVE` via join) — both flows work as designed.

Along the way, resetting the platform database (routine cleanup between
test rounds) reproduced a real gap: `identity/page.tsx`'s "linked but the
handle no longer resolves" branch was a dead end — an error message with
no way to recover, forcing a manual service-role `UPDATE` to clear
`profiles.platform_public_id` before the page was usable again. Fixed by
resolving the account *before* branching: a stale link now falls through
to the same link/re-link UI a never-linked profile sees, with an extra
notice naming the dead handle ("Previously linked to AORMS-U-DEAD, which
no longer exists... link a different (or newly re-created) identity
below"). Verified live: manufactured a stale link
(`profiles.platform_public_id = 'AORMS-U-DEAD'`), confirmed the recovery
UI renders correctly, then re-linked to a fresh handle through the same
`LinkIdentityForm` and confirmed the page immediately shows the newly
resolved account. `tsc --noEmit`/`eslint` clean. Both databases reset to
a clean slate after this round too.

**AORMS Platform, follow-up (2026-09-07) — leave flow verified + a real
rejoin bug found and fixed.** Built a three-account scenario (Owner Eve +
company "Eve Studio", members Frank and Grace) to test both ways a
membership ends: **owner-initiated removal** (Eve's "Leave" button on
Frank's row in the company detail page's member table — company stays
visible to the owner, the removed row just drops off the active list) and
**self-leave** (Grace's own "Leave" button on her `/identity` page, tested
with her own active platform session so `"memberships: self update
(leave)"` RLS is what actually authorizes it, not just the UI showing the
button). Both confirmed via the UI and the database: `status` → `LEFT`,
`left_at` stamped, row filtered out of the active member/company lists
either side.

Testing the natural next step — **can a departed member rejoin?** —
found a real bug: `(account_id, company_id)` is a unique constraint on
`memberships`, and both `joinCompany` and `inviteMember` did a plain
`.insert()`, so re-joining or re-inviting anyone who'd previously left hit
a duplicate-key error (`memberships_account_id_company_id_key`) and
failed outright — a departed member could never come back. Fixed by
switching both to `.upsert(..., { onConflict: "account_id,company_id" })`,
resurrecting the existing row (`status` back to `ACTIVE`, `left_at`
cleared) instead of trying to insert a new one; the existing self/owner
RLS policies already cover both the insert and the `ON CONFLICT DO
UPDATE` path, so no policy changes were needed. Verified live, deliberately
isolating the fix from a recurring browser-automation click flake (a
button's first click sometimes doesn't register in this sandboxed
environment — confirmed via server logs, not an app bug) by resetting
Grace's row back to `LEFT` via the service-role client and re-running the
join purely through the real UI + Server Action path before trusting the
result: Grace rejoined "Eve Studio" through `/identity`'s own "Join a
company" form, and Eve separately re-invited Frank through the company
detail page's "Add a member" form — both now show `ACTIVE` again, exactly
as a fresh join would. `tsc --noEmit`/`eslint` clean. Both databases reset
to a clean slate after this round.

**AORMS Identity / Licence — separate portals + company profile data
(2026-09-07).** On explicit request: Identity split into a genuinely
separate portal from the Office Hub (no `AppShell`/`SideNav`, no link
anywhere in the Office Hub's own nav — reached only by its own direct
URL), a new Licence Management portal, and the company's regulatory/
contact data (COA, GST, tax, board of directors, "who's who") moved out
of the Office Hub's Firm Settings page into the Identity portal's company
profile, which is now the source of truth.

**Portal move:** `identity/page.tsx` and `companies/[companyId]/page.tsx`
moved from `web/app/(app)/` to `web/app/(platform)/` (a directory rename —
both are the same depth from `web/lib/`, so no import changes). Removed
the "AORMS Identity" entry from `AppShell.tsx`'s `GROUPS` (added last
round, reverted now). `(platform)/layout.tsx` changed from a fixed
narrow `Grid`/`Column` (sized for the login card) to a light header —
"AORMS Identity" wordmark, Identity/Licences nav links, and a **Sign
out** link — with each page controlling its own width now (the
`Grid`/`Column` the old layout did moved into `platform-login`/
`platform-signup` themselves). This closed a real, pre-existing gap
along the way: `platformSignOut` had existed since the original AORMS
Platform build but had never had a UI button anywhere — verified live
that it now actually clears the `sb-platform-auth-token` cookie.

**New platform schema** (`platform/supabase/migrations/`):
- `0003_company_profile.sql` — extends `companies` with
  `coa_registration_no`/`gstin`/`pan`/`gst_type`/`tds_applicable_default`/
  address fields (mirrors `web/`'s own `firm` table's shape — same data,
  new home); new `company_board_members` (name, DIN, designation,
  appointed-on date) and `company_contacts` ("who's who" — name, role/
  title, email, phone, primary flag), both member-readable/owner-writable
  via the existing `is_company_owner()` helper. Also added a genuinely
  missing **`companies: owner update`** RLS policy — migration `0001`
  had granted `companies` only `SELECT`/`INSERT`, no `UPDATE` at all,
  found while wiring this.
- `0004_licences.sql` — one `licences` row per company (`plan`
  `TRIAL`/`STANDARD`/`PREMIUM`, `seats`, `starts_at`, `expires_at`),
  auto-provisioned as a 30-day `TRIAL` by a second `after_company_insert`
  trigger alongside the existing founding-owner-membership one. No stored
  `status` column — `ACTIVE`/`EXPIRED` is computed from `expires_at` at
  render time, not a column that needs to stay in sync with the clock.
  Owner-editable (`plan`/`seats`/`expires_at`) — no billing/payment
  integration exists in this stack, self-serve is the same trust model as
  every other owner-only mutation built so far.

**`companies/[companyId]/page.tsx`** grew three new sections (Company
Profile, Board of Directors, Who's Who), each with an owner-only add/
edit form and member-visible read view; new components under
`web/components/aorms/platform/`: `CompanyProfileForm.tsx`,
`AddBoardMemberForm.tsx`/`RemoveBoardMemberButton.tsx`,
`AddContactForm.tsx`/`RemoveContactButton.tsx`. New page
`web/app/(platform)/licences/page.tsx` + `UpdateLicenceForm.tsx`. New
Server Actions in `web/lib/actions/platform.ts`: `updateCompanyProfile`,
`addBoardMember`/`removeBoardMember`, `addCompanyContact`/
`removeCompanyContact`, `updateLicence` — same house style as every
existing action there.

**Firm Settings becomes a read-only mirror, deliberately without
touching `web/`'s own schema or invoicing/PDF code:** an Explore pass
confirmed `web/lib/actions/invoices.ts`'s GST/TDS calculation and
`web/lib/jobs/firm.ts`'s PDF generation both read `firm.gstin`/`pan`/
etc. directly, so those columns stay exactly as they are. Only
`FirmSettingsForm.tsx` changed — `readOnly`/`disabled` on the moved
fields, an `InlineNotification` + a link to `/identity`.
`updateFirmSettings` (`web/lib/actions/firm.ts`) now only ever writes
`company_name`/`firm_type`, never the moved fields — found and avoided a
real landmine here: a `disabled` `<Select>`/`<Checkbox>` doesn't submit a
value in a native form at all, so if the action had kept reading
`gstType`/`tdsApplicableDefault` from `formData`, every save would have
silently reset them to the form's hardcoded defaults. **No live sync
back into `web/`'s own `firm` table in this pass** — a disclosed
limitation matching the plan, not an oversight.

**Verified live, real browser, full flow:** platform sign-up → link →
create a company → company profile save (COA/GSTIN round-tripped,
confirmed via direct DB read) → add a board member (Rahul Sharma,
Managing Director, DIN, appointed date) → add a "who's who" contact
(Priya Menon, Authorized Signatory) → `/licences` shows the
auto-provisioned `TRIAL` licence (`1 seat · expires` 30 days out,
`ACTIVE`) → updated to `STANDARD`/5 seats, persisted → **Sign out**
confirmed clearing the platform cookie, with `/identity` still correctly
showing the linked identity afterward (service-role read, no live
platform session required — the "link, don't merge" design holding up
exactly as intended). Confirmed `/identity` renders with zero
`AppShell`/`SideNav` chrome and the Office Hub's own nav no longer links
to it anywhere. `tsc --noEmit`/`eslint` clean across every new/touched
file. All four platform migrations (`0001`–`0004`) apply cleanly from a
fresh `db reset`. Both databases reset to a clean slate afterward.

**AORMS Licence Management, follow-up (2026-09-07) — update flow tested
thoroughly, a real stale-form bug found and fixed.** Full pass on
`updateLicence`: plan change, seat count, and clearing expiry (blank =
"no expiry") all verified round-tripping to the database correctly.

Along the way, found a genuine bug by resubmitting the form twice in a
row: after successfully changing the plan to `PREMIUM`, a second save
that only touched `seats` **silently reverted the plan back to
`TRIAL`** — the value it had on the page's first load. Root cause: every
field in `UpdateLicenceForm.tsx` (and, found by the same pattern search,
every field in `CompanyProfileForm.tsx` and the still-editable
`companyName`/`firmType` in `FirmSettingsForm.tsx`) is an uncontrolled
input keyed off `defaultValue` — React only applies `defaultValue` on
initial mount, so once a Server Action's `revalidatePath` re-renders the
page with fresh data, the already-mounted `<select>`/`<input>` keeps
showing (and submitting) its stale first-load value forever, silently
undoing any change made in an earlier save the moment a *different*
field is edited next. Fixed all three call sites the same way — a `key` on the form component
derived from the record's own fields (a template string combining
`licence.plan`/`seats`/`expires_at` for the licence form,
`JSON.stringify(company)` for the company-profile form), forcing a full
remount whenever the underlying data changes so every `defaultValue`
re-applies correctly.
Documented the requirement directly in both `UpdateLicenceForm.tsx`'s
and `CompanyProfileForm.tsx`'s header comments so it isn't silently
dropped by a future edit to either parent page.

Verified live: reproduced the exact bug first (plan silently reverting),
confirmed the fix (plan now correctly persists across an unrelated
field's save), confirmed client-side validation (`seats` `min={1}`)
blocks `0`, then confirmed **server-side** validation independently
rejects it too — bypassed the client guard directly via
`removeAttribute('min')` + `requestSubmit()` and got "Seats must be a
positive whole number" back from `updateLicence` itself, proving the
check isn't only client-side. Also verified RLS end-to-end, not just UI
gating: a non-owner member's `/licences` view correctly shows no edit
form, and a **direct** PostgREST `PATCH` attempt against `licences`
using that member's own real access token (bypassing the app UI
entirely) returned zero rows and left the licence completely
unmodified — `"licences: owner update"` RLS holding on its own, not
just the app hiding a button. `tsc --noEmit`/`eslint` clean. Both
databases reset to a clean slate afterward.

**Board of Directors / Who's Who — edit added, then the full add/edit/
remove flow verified (2026-09-07).** Asked to test the "edit" flow for
both; only add + remove actually existed. Added `updateBoardMember`/
`updateCompanyContact` (`web/lib/actions/platform.ts`, owner-only via
the existing `company_board_members`/`company_contacts` RLS from
migration `0003`) and two new owner-only edit-in-place row components,
`BoardMemberRow.tsx`/`ContactRow.tsx`, replacing the plain server-
rendered `<TableRow>` mapping in `companies/[companyId]/page.tsx`: view
mode shows plain text + Edit/Remove icon buttons; Edit swaps the row for
a pre-filled form (Save/Cancel) in place, reusing the existing
`RemoveBoardMemberButton`/`RemoveContactButton` for removal. Each row
closes itself back to view mode on a successful save — watched via the
`pending`-then-not-`pending`-with-no-error transition from
`useActionState` (there's no built-in `onSuccess` callback) — rather
than relying on the parent re-rendering, since the row's own local
`editing` state wouldn't otherwise reset.

Verified live: added a board member, edited its designation/DIN in
place (persisted, row auto-closed to view), opened Edit again and typed
a throwaway change into Cancel instead — confirmed discarded, no
server round-trip. Same for Who's Who: added a contact, edited its
phone and toggled "Primary contact" on — the green Primary tag appeared
correctly. Removed both via the same Remove buttons as before,
confirming the table returns to its empty state. Non-owner gating on
these rows uses the same `isOwner` prop already verified for the
Members table and Company Profile form earlier this session, not
re-tested separately. `tsc --noEmit`/`eslint` clean. Both databases
reset to a clean slate afterward.

**🔴 CRITICAL SECURITY FIX — membership privilege escalation, two
independent exploit paths (2026-09-07), found live while testing
role-editing.** Asked to test the "edit" side of the invite/join
flows — `MembershipRoleSelect`/`updateMembershipRole`, which lets a
company owner change a member's role. That path itself worked
correctly, but poking at it surfaced a severe gap: **neither** UPDATE
policy on `memberships` (migration `0001_core.sql`) had a `with check`
clause, so Postgres silently reused each `using` expression to validate
the *resulting* row too — and neither expression constrains which
*columns* an update can touch. Confirmed exploitable via direct
PostgREST `PATCH` calls with real access tokens, no app UI involved, in
two independent ways:
1. **Via `"memberships: self update (leave)"`** (`account_id =
   auth.uid()`) — any plain member could self-promote `role` to `OWNER`
   in their real company, or reassign `company_id` to a company they
   were never invited to **and** set `role` to `OWNER` in the same
   request — an uninvited takeover of an arbitrary company by anyone
   with a platform account.
2. **Via `"memberships: owner update"`** (`is_company_owner(company_id)`)
   — a *separate*, independently-exploitable path: a legitimate owner of
   their own Company A (trivial to become — anyone can self-serve create
   a company) could reassign one of Company A's own membership rows'
   `company_id` into a **completely unrelated** Company B, landing as
   its uninvited `OWNER` too. Confirmed this succeeds even after an
   initial, narrower fix that only closed path 1 — a second Explore-style
   pass over every `UPDATE`/`ALL` RLS policy in the platform schema
   caught it before the user had to find it independently.

A `with check` addition can't fully close either path — Postgres RLS
only ever sees the candidate *new* row, not an old-vs-new diff, so
"these columns must not change" isn't expressible as a bare predicate.
Fixed with a `BEFORE UPDATE` trigger instead (which sees both `OLD` and
`NEW`),
`platform/supabase/migrations/0005_membership_self_update_guard.sql`'s
`enforce_membership_update_invariants()`:
- `account_id`/`company_id` are immutable after creation for **every**
  caller, including the owner path — a membership belongs to exactly the
  person and company it was created for; "moving" one is a delete +
  insert (a fresh membership), never an in-place mutation.
- The trusted service-role path (this app's own server-side admin/
  cleanup code, already fully trusted everywhere else in this codebase)
  may still freely change `role`/`status`/`activated_at`/`left_at` —
  checked via `auth.role() = 'service_role'`.
- A genuine company owner may change `role`/`status` for members of
  their own company (the original policy's intent, preserved).
- Everyone else's update is only accepted if it's a genuine self-leave:
  `status` becomes `'LEFT'` and `role` is unchanged.

Verified live, exhaustively, with three real accounts (an owner of
Company A, an unrelated owner of Company B, and a plain member of
Company A): reproduced all three exploit variants first on the
corrected-so-far schema (self-promotion, self-hijack-into-another-
company, and the separate owner-hijack-into-an-unrelated-company path),
confirmed each is now rejected with a clear `P0001` error and the
underlying data completely unmodified, then re-verified all three
legitimate paths still work unchanged: an owner promoting a member to
`OWNER`, a member leaving their own company, and a service-role
administrative role fix. No application code changed — this was a pure
database migration; `tsc --noEmit` unaffected. All five platform
migrations (`0001`–`0005`) apply cleanly from a fresh `db reset`.
Both databases reset to a clean slate afterward.

Added a standing note to root `CLAUDE.md`'s Conventions: any future
"row owner can update their own row" RLS policy in this codebase needs
the same scrutiny — ask specifically which *columns* a bare `using`
clause actually leaves unconstrained, not just whether the row is
reachable.

**Studio/Company split — Phase A, the rename (2026-09-07).** On explicit
request: architecture-firm entities become "Studio" everywhere (schema,
routes, code identifiers, not just UI copy), freeing "Company" for a
genuinely new entity — material supplier businesses with their own
Material Catalogue (Phases B/C of the same plan, not yet built).

`platform/supabase/migrations/0006_rename_companies_to_studios.sql`:
`companies`→`studios`, `memberships`→`studio_memberships`,
`company_board_members`→`studio_board_members`, `company_contacts`→
`studio_contacts`; every `company_id` column (including on `licences`)
→`studio_id`; `is_company_owner()`→`is_studio_owner()`,
`handle_new_company()`→`handle_new_studio()`, and so on for every
trigger function; the Studio public-ID prefix changes from `AORMS-C-`
to **`AORMS-S-`**. RLS policy names renamed for clarity too (their
USING/WITH CHECK expressions didn't need touching — see below).

**A real Postgres internals lesson, caught by testing the migration
before it ever shipped, not assumed:** table/column renames are
transparently safe for RLS policies, views, and check constraints —
confirmed live, these are stored as compiled expression trees bound by
attnum/OID, so `pg_get_expr()` reflects the new names automatically and
nothing needs rewriting. **Function bodies are not** — `pg_proc.prosrc`
is stored as literal text for every PL, `language sql` included
(dependency tracking there only blocks a `DROP` without `CASCADE`, it
doesn't rewrite the stored text). A bare `ALTER FUNCTION is_company_owner
RENAME TO is_studio_owner` left the function's *body* still calling
`public.memberships`, which broke at the very next invocation (`relation
"public.memberships" does not exist`) — caught immediately by running
the migration against a real reset before considering it done, fixed by
pairing the rename with a `CREATE OR REPLACE` correcting the body (kept
the original parameter name — `CREATE OR REPLACE` can't rename a
parameter, only `DROP`+`CREATE` could, which would've required dropping
every policy that already calls the function by OID first; purely
cosmetic either way).

`web/` side: `app/(platform)/companies/[companyId]/` →
`app/(platform)/studios/[studioId]/`; every Studio-side Server Action in
`web/lib/actions/platform.ts` renamed for clarity and to avoid colliding
with the real Company actions Phase B will add next to them in the same
file (`createCompany`→`createStudio`, `joinCompany`→`joinStudio`,
`inviteMember`→`inviteStudioMember`, `updateMembershipRole`→
`updateStudioMembershipRole`, `leaveCompany`→`leaveStudio`,
`updateCompanyProfile`→`updateStudioProfile`, board/contact CRUD
similarly); `CreateCompanyForm.tsx`/`JoinCompanyForm.tsx`/
`CompanyProfileForm.tsx`/`LeaveCompanyButton.tsx` renamed to their Studio
equivalents; every `companyId` prop across the shared row/form components
(`BoardMemberRow.tsx`, `ContactRow.tsx`, `AddBoardMemberForm.tsx`,
`RemoveBoardMemberButton.tsx`, `AddContactForm.tsx`,
`RemoveContactButton.tsx`, `UpdateLicenceForm.tsx`, `InviteMemberForm.tsx`,
`MembershipRoleSelect.tsx`) renamed to `studioId`. `identity/page.tsx`'s
"Companies" section → "Studios" (leaving the natural spot for a
"Companies" section to land alongside it once Phase B ships).

Verified live: full signup → link → create-studio → studio-detail-page →
licence-page round trip through the real browser, confirming the
`AORMS-S-` handle prefix, the renamed route, and every renamed section
label render correctly. Directly re-ran this session's earlier
privilege-escalation exploit checks (`8a5b07bc`) against the renamed
`studio_memberships` table — still correctly blocked. `tsc --noEmit`/
`eslint` clean across the whole `web/` tree. All six platform migrations
(`0001`–`0006`) apply cleanly from a fresh `db reset`. Both databases
reset to a clean slate afterward.

**Studio/Company split — Phase B, the new supplier Company entity
(2026-09-07).** Second phase of the same plan: "Company" is now a
material-supplier business (building materials, interior materials,
finishes, other products) with its own full parallel identity system —
own `AORMS-C-` handle (the prefix Phase A's rename just freed), own
membership/ownership model — reusing the same platform `accounts`/
`auth.users` as Studios (one person, one login, can belong to both a
Studio and a Company; no second signup/login flow needed).

`platform/supabase/migrations/0007_supplier_companies.sql`: `companies`
(id, name, `public_id` `AORMS-C-`, `owner_id`, GSTIN/PAN/GST type/TDS
default, address fields, email, phone — same shape as `studios`' profile
**minus** `coa_registration_no`, which is architecture-specific and
doesn't apply to a supplier), `company_memberships`, `company_board_members`,
`company_contacts` — all four mirroring the Studio equivalents' shape/RLS
exactly, including `handle_new_company()` (mints the `AORMS-C-` handle +
founding OWNER membership) and `enforce_company_membership_update_invariants()`
(the privilege-escalation guard from this session's `8a5b07bc` fix,
**built in from day one this time**, not found by exploit after the
fact).

`web/` side, mirroring the Studio pages/actions/components file-for-file:
`web/lib/actions/company.ts` (12 Server Actions — create/join/invite/
role-change/leave/profile/board/contact CRUD); a new components subfolder
`web/components/aorms/platform/company/` (one level under the Studio
components, so the two entity types' identically-named components don't
collide on disk); `web/app/(platform)/companies/[companyId]/page.tsx`
(the route Studios vacated in Phase A) — identical structure to
`studios/[studioId]/page.tsx` minus the COA field; `identity/page.tsx`
grows a "Companies" section alongside "Studios" (own create/join tiles,
own membership list with a Leave button).

Verified live: full signup → link → create-company (confirmed
`AORMS-C-P6G9` handle, not `AORMS-S-`) → company-detail-page renders →
company profile save (city/state/pincode, confirmed via direct REST
read against the service-role API) → add board member → edit-in-place
save (DIN field, confirmed via REST read) → add contact, all through the
real browser. Re-ran the full privilege-escalation exploit pair from
this session's `8a5b07bc` fix against the **new** `company_memberships`
table specifically (not assumed safe by resemblance to the already-fixed
`studio_memberships`): self-promotion to OWNER via direct REST `PATCH`
— blocked (`P0001`, "self-service updates may only set status to LEFT");
cross-company membership hijack (attacker owns Company B, attempts to
repoint their own OWNER membership row's `company_id` to Company A via
direct REST `PATCH`) — blocked (`P0001`, "account_id and company_id
cannot be changed after creation"); confirmed the legitimate self-leave
path (`status` → `LEFT`) still succeeds on the same row afterward, so
the guard isn't over-broad. `tsc --noEmit`/`eslint` clean across the
whole `web/` tree. All seven platform migrations (`0001`–`0007`) apply
cleanly from a fresh `db reset`. Both databases (platform + `web/`'s own)
reset to a clean slate afterward.

Phase C (Material Catalogue — products/specs/test-results owned by a
Company, browsable by Studios with city/state nearest-vendor ranking)
is next, not yet started.

**Studio/Company split — Phase C, the Material Catalogue (2026-09-07).**
Final phase of the plan: a Company (material supplier) now owns and
operates a searchable product catalogue — product name, category, SKU,
MRP, description, flexible key-value specs, and structured test results
— browsable platform-wide by any account, with city/state nearest-vendor
ranking for the browsing Studio (no geocoding/lat-lng/external API,
confirmed with the user up front).

`platform/supabase/migrations/0008_material_catalogue.sql`: `products`
(`company_id` FK, name, `category` check-constrained to
`BUILDING_MATERIAL`/`INTERIOR_MATERIAL`/`FINISH`/`OTHER`, SKU, `mrp_paise`
bigint — this codebase's integer-paise money convention — description),
`product_specifications` (flexible label/value pairs), `product_test_results`
(test name, result, lab/agency, tested-on date). RLS: readable by any
`authenticated` platform account on all three tables (catalogue browsing
is platform-wide, same precedent as `"companies: authenticated
read"`/`"studios: authenticated read"`), writable only by the owning
company's OWNER (`is_company_owner(company_id)` on `products` directly;
specs/test-results check ownership one hop through their `product_id` FK,
via an `exists (select 1 from products where …)` subquery in both the
`using` and `with check` clauses of their `for all` policy).

`web/` side: `web/lib/actions/materials.ts` (12 Server Actions — add/
update/remove × products/specs/test-results; the `mrpPaise` form field
carries a rupee amount the user typed, multiplied by 100 before the
insert, same naming convention already used by `rate-books.ts`'s
`ratePaise` field). `companies/[companyId]/page.tsx` grows a "Material
Catalogue" section: each product is a `ProductCard.tsx` — owner-only
edit-in-place (identical toggle pattern to `CompanyBoardMemberRow.tsx`)
containing, one level deeper, its own specs (`ProductSpecRow.tsx`) and
test results (`ProductTestResultRow.tsx`), each with their own owner-only
add-forms and the same edit-in-place pattern again. New
`web/app/(platform)/materials/page.tsx` — cross-company browsing/search
(keyword + category filters via GET query params) reading `products`
joined to `companies` platform-wide via the service-role client; nearest-
first ordering is a plain three-tier sort computed in the page's own
server code (same city as the viewer's first active Studio membership →
same state → everything else), no new SQL needed for anything this
simple. `(platform)/layout.tsx` nav grows a "Materials" link.

Verified live, full round trip through the real browser: added a product
via the UI (₹85 MRP → confirmed stored as `8500` paise via direct REST),
added a spec via the UI, opened the edit-in-place form on a product
(confirmed correctly pre-filled, including the paise→rupee reverse
conversion) and changed its MRP — confirmed saved via REST. Nearest-
vendor ranking confirmed against a real two-company control: created a
second Company in Mumbai with its own product, gave the browsing account
a Studio in Bengaluru, and `/materials` correctly listed both Bengaluru
products ahead of the Mumbai one with a "Showing nearest vendors first
(Bengaluru, Karnataka)" banner; keyword search (`?q=marble`) and category
filter (`?category=BUILDING_MATERIAL`) both narrowed results correctly.
RLS re-verified directly (not assumed from the schema alone): a
non-owner's `DELETE` on another company's product is silently a no-op
(RLS returns zero rows affected, row still exists) while the actual
owner's `DELETE` succeeds and cascades to remove that product's spec and
test-result rows. `tsc --noEmit`/`eslint` clean across the whole `web/`
tree. All eight platform migrations (`0001`–`0008`) apply cleanly from a
fresh `db reset`. Both local Supabase stacks (platform + `web/`'s own)
reset to a clean slate afterward.

This completes the Studio/Company split + Material Catalogue plan (all
three phases: A the rename, B the new Company entity, C the catalogue).

**Phase 4 — measurement-row drill-down + a stale-doc correction
(2026-09-08).** The Phase 4 row above (its "Not built" sentence, now
struck through) turned out to be stale: `document_issues`,
`office_templates`, and the `transmittal_items`/`mom_actions`
sub-resources were **already built** — `/document-issues`,
`/office-templates`(`/[id]`), and the `transmittal_items`/`mom_actions`
tables wired into `/transmittals/[id]`/`/moms/[id]` all exist in the
codebase already, apparently shipped in an earlier pass that never made
it back into this row. Found by checking the actual code before
starting, not by trusting the roadmap's own claim — the established
discipline throughout this doc, applied to the doc itself this time.

That left exactly one real gap: **measurement-row drill-down for
estimate items** (`estimate_measurements`, direct-quantity-entry only
until now). The hard part was already live — migration
`0005_phase4_estimation.sql`'s `shape_for_unit()`/`measurement_quantity()`/
`recompute_estimate_item_from_measurements()` trigger chain, ported
verbatim from `packages/contracts/src/estimation.ts` back when Phase 4
first shipped — so this pass was UI only: `web/lib/actions/estimates.ts`
gained `addEstimateMeasurementRecord`/`removeEstimateMeasurementRecord`
(insert/delete only, no update — the trigger recomputes the parent
item's `quantity`/`amount_paise` from the full measurement-row sum on
every write, so "editing" a row is delete-and-re-add, same as
`transmittal_items`/`mom_actions`' own convention); a new page,
`/estimates/[id]/items/[itemId]`, shows the item's computed
quantity/rate/amount read-only, a shape label (`shape_for_unit` called
live via `supabase.rpc()`), a form with all five dimension fields
(nos/length/breadth/depth/direct quantity) with helper text saying which
ones the item's own unit actually uses, and the measurement-row table
itself; `/estimates/[id]`'s items table gained a "Measure →" link per
row. Verified live against the **cloud** project (the local Supabase
stack no longer exists as of this date — see CLAUDE.md's Dev/verify loop
callout): created a temporary OWNER-role test account via the Auth Admin
API, opened the real existing `EST/2026-27/0001` → "Plastering 12mm to
external walls" item (`sqm` unit, direct-entered quantity 120, ₹450 rate,
₹54,000 amount), confirmed the page correctly showed shape **Area (nos ×
length × breadth)** with Length/Breadth marked "Used" and Depth/Direct
quantity marked "Ignored"/"Only for weight/lumpsum units"; added a real
measurement row (nos 2 × length 5m × breadth 3m) and confirmed the
trigger recomputed the item to quantity 30, amount ₹13,500 exactly (2×5×3);
removed the row and confirmed it correctly reverted to quantity 0,
amount ₹0 (empty measurement-row sum). Restored the real item's original
120/₹54,000 afterward via a direct REST patch (not through the
measurement mechanism, since the original 120 was itself a direct entry
with no backing rows) and deleted the temporary test account, confirmed
its `profiles` row cascaded. `tsc --noEmit`/`eslint` clean. **This closes
Phase 4's last remaining gap — Phase 4 is now fully UI-complete**, same
status as every other phase 1–10.

**Phase 4 — numbering-pattern overrides (2026-09-08), same day.** One more
gap surfaced while checking Phase 4's actual state: migration 0003's own
header comment had flagged per-firm numbering overrides
("`org settings' numberingPatterns`, which can override prefix/padding
per scope") as deferred, but the roadmap never carried that forward as an
open item — found by re-reading the migration file itself, not by
trusting either doc. Closed the same day as the measurement drill-down
above.

Migration `0030_numbering_patterns.sql`: a new `numbering_patterns` table
(one row per scope, `prefix`/`padding` both nullable — set either or
both), port of `backend/src/modules/document/router.ts`'s
`numberingPatterns`/`setNumberingPatterns` + `packages/contracts/src/
document.ts`'s `NumberingPattern` shape. Deliberately **not** a JSON blob
on `firm` the way the old system stored it — RLS can't restrict a single
JSON *column's* writes to OWNER while leaving the rest of `firm` at
OWNER-or-PARTNER (`firm`'s own existing update policy), so a real table
with its own dedicated `numbering_patterns: owner write` policy
(`current_app_role() = 'OWNER'`, narrower than `firm`'s, matching the
Phase 4 audit's own explicit call-out) was the direct way to get that
right, not a JSON column riding on a broader policy. `next_ref()` (the
same function migration 0003 shipped) gained one lookup at the top:
checks for a `numbering_patterns` row matching the requested scope and
uses its `prefix`/`padding` in place of the hardcoded default whenever
set — everything else about the function (FY computation, the gap-free
`sequences` table, the `PREFIX/FY/00001` return shape) is unchanged.

`web/lib/actions/numbering.ts` (`addNumberingPatternRecord` — an upsert
keyed on `scope`, so re-saving an existing scope updates it rather than
erroring; `removeNumberingPatternRecord`), a new "Reference Numbering"
section added to the existing `/firm-settings` page (not a new route —
this is exactly the kind of setting that page already exists for),
gated the same way `/users` already gates its own OWNER-only controls
(`myProfile.role === "OWNER"`, an `InlineNotification` telling
non-owners it's read-only, table always visible to any staff). Both
actions call `write_audit` (`entity: "numbering_pattern"`), matching
`firm.ts`'s own convention that settings changes get audited — unlike
the lighter transmittal-items/mom-actions/estimate-measurements
sub-resource pattern, which doesn't.

Verified live against the cloud project: direct SQL confirmed the
override/fallback behavior first (`next_ref('phase4_test', 'DEF')` →
`ZZZ/2026-27/000001` with a `{prefix: ZZZ, padding: 6}` override active,
reverting to `DEF/2026-27/0002` — note the *same*, correctly-continued
sequence value — the moment the override row was deleted); then the
full round trip through the real browser as a real OWNER account: added
a `letter` → `{prefix: COR, padding: 5}` override through the actual UI,
confirmed it rendered in the table, confirmed `next_ref('letter', 'LTR')`
now genuinely returned `COR/2026-27/00002` (5-digit padding) via the
Management API, removed it through the UI, confirmed the table returned
to its empty state. Confirmed both actions' `write_audit` calls actually
landed (`UPDATE`/`DELETE` rows on `numbering_pattern`) via a direct read.
**Test-account cleanup note, worth keeping in mind for future
verification rounds**: unlike the measurement-drill-down test account
above (which touched no audited action and deleted cleanly), this
session's test account *did* trigger `write_audit`, and deleting an
`auth.users` row cascades to `profiles`, which `audit_log.actor_id`
references by FK — Postgres correctly refused the delete
(`audit_log_actor_id_fkey` violation) rather than silently orphaning an
audit entry. That's the FK working as intended, not a bug to work
around: disabled the test account (`profiles.disabled = true`, demoted
off OWNER) instead of deleting it, leaving the real audit trail intact.
Any future test account that exercises an audited action needs the same
resolution, not a forced delete. `tsc --noEmit`/`eslint` clean.

**Phase 7 — AI Studio document drafting (2026-09-08).** Closes the other
half of Phase 7's own flagged gap: `askEsti` (2026-09-06) shipped only the
read-only Q&A agent; the draft-generation modes (`AiDraftKind` — proposals,
specs, site reports, etc.) were explicitly deferred, and every subsequent
roadmap entry that touched AI kept repeating the same "not ported yet"
line. No new migration needed — `ai_runs` (migration `0010`) already has
an unconstrained `kind` text column and an `approval_state` column
defaulting to `DRAFT`; both were sitting unused for anything but the
Q&A agent's own `AGENT_QA` kind.

Scoped to **9 of the old contracts' 14 `AiDraftKind` values**
(`web/lib/ai/draft-kinds.ts`) — PROPOSAL/SCOPE/AGREEMENT/SPEC/
SITE_REPORT/MOM/RFI_RESPONSE/SUMMARY/BILLING_ASSISTANT. Left out, with a
stated reason rather than silently dropped: CRIF_SUMMARY/CRIF_IMPACT/
CRIF_RISK need a `decisions`/CRIF register that was never ported to
`web/` at all (that convention lives only on the old `frontend/`);
MOM_REVISIONS needs the client-portal MoM-acknowledgement flow's
strict-JSON parsing, a separate port; CPI_REPORT needs the full CPI
questionnaire assembled. None of the 9 shipped kinds needed to be built
against nothing real.

**A real finding while reading the old router**
(`backend/src/modules/ai/router.ts`): `issued_entity_type`/
`issued_entity_id` columns exist on the schema (ported into `ai_runs` by
migration 0010 already) but grep confirms **no writer for them exists
anywhere in the old backend either** — the "document-table wiring" the
Phase 7 audit's own language implied was aspirational, never actually
built even in the system being ported from. So this pass doesn't
auto-create a real proposal/letter/etc. row from an approved draft
either — it faithfully closes the gap that actually existed (a way to
generate, review, and approve a draft at all), not a gap that was only
ever implied by a doc's wording. Also confirmed from that same router
read: the old "mock" provider's output *was* `buildTemplateDraft()`'s
literal text, not an error fallback — `web/lib/ai/draft-prompts.ts`
ports that same design: when Ollama is unreachable or the model isn't
pulled, the draft **is** the structured template (`provider: "mock"`),
never an apology, unlike `askEsti`'s own Q&A fallback message (a
structured draft is more useful than "try again" here).

`web/lib/ai/draft-prompts.ts`: per-kind system-prompt instruction +
context block + the ported fallback template (`buildDraftPrompt()`).
`web/lib/actions/ai.ts` gained `generateAiDraft()` (builds project/
billing context from real tables — BILLING_ASSISTANT's "outstanding
invoices" list reuses `snapshot.ts`'s already-documented workaround for
PostgREST not supporting a column-to-column `paid_paise < grand_total_paise`
filter, fetching ISSUED invoices and computing the outstanding amount in
JS instead — then calls Ollama the same health-check/fallback way
`askEsti` does, records the run) and `updateAiRunApproval()` (DRAFT →
APPROVED/REJECTED → ISSUED, ISSUED locked, matching the old router's
`updateRun` guard). Both re-check a `write`-tier role allow-list
(OWNER/PARTNER/ACCOUNTANT/HR_MANAGER/SENIOR/ASSOCIATE) at the **app**
layer — `ai_runs`' RLS is bare `is_office_staff()` (any staff, VIEWER
included, matching the old router's own table-level gating), so the
old router's `can(ctx.user.role, "write")` check has no RLS equivalent
to lean on and is re-implemented here, the same "RLS can't express a
role tier, so the app layer must" reasoning as every other such gate in
this codebase.

New route `/ai-runs/new` (`NewAiDraftForm.tsx` — kind Select swaps the
Project Select for an "office-wide" note live via client state when
BILLING_ASSISTANT is chosen); `/ai-runs` gained a "New draft" button
(isolated into its own small Client Component, `NewDraftLinkButton.tsx`,
matching the established `Button as={NextLink}`-from-a-Server-Component
RSC-boundary fix pattern rather than risking the crash that pattern
exists to avoid); `/ai-runs/[id]` gained Approve/Reject/Mark-issued
buttons (`AiRunApprovalActions.tsx`, bound Server Actions per button —
the same `.bind(null, id, ...)` pattern `RemoveLineItemButton` already
uses), shown only to write-tier staff, mirroring the numbering-patterns
work's own `isOwner`-gated-section convention. `tsc --noEmit`, `eslint`,
and `next build --webpack` all clean (65 routes → 68, all three new).

Verified live against the cloud project, full round trip through the
real browser as a real OWNER test account: generated a PROPOSAL draft
against the real "Sharma Residence Extension" project (Ollama not
running on this machine, so the mock/template-fallback path — confirmed
the real client name "Sharma Residences LLP" flowed through from the
`clients` join, not fabricated), walked it DRAFT → APPROVED → ISSUED
through the UI, confirmed the buttons disappear once ISSUED (locked,
server-side re-verified by the transition-map check, not just hidden
client-side); generated a BILLING_ASSISTANT draft (office-wide — the
form correctly swapped its Project field for the "no project needed"
note), confirmed it correctly reported zero outstanding invoices (real
query, not fabricated), walked it DRAFT → REJECTED → DRAFT (the reopen
path); confirmed the `/ai-runs` list renders both kinds/states
correctly. **Negative-path check, not skipped**: demoted the same test
account to VIEWER and confirmed both gates independently — `/ai-runs/new`
shows the "Write access needed" notice instead of the form, and
`/ai-runs/[id]` still renders the run (RLS correctly still lets VIEWER
*read* it) but renders zero approval buttons. Test data (2 `ai_runs`
rows) deleted afterward and confirmed empty; the test account itself
deleted cleanly this time (no `write_audit` calls from this feature, so
none of the FK-blocks-delete situation the numbering-patterns test
account hit above).

**Re-verified with real Ollama generation (2026-09-09)** — every
verification above ran against the mock/template fallback because
Ollama wasn't running on this machine at the time; native Windows
Ollama (`winget install Ollama.Ollama`, per this file's own Dev/verify
loop section) turned out to already be installed and `llama3.2` already
pulled, just not started. Confirmed reachable directly (`/api/tags`,
`/api/chat`) and end-to-end through the real app: asked ESTI a real
question via the header popover first (`ai_runs` row confirmed
`provider: "ollama"`, `model: "llama3.2"`, a genuine generated reply,
not the read-only agent's own apology fallback), then re-generated a
PROPOSAL draft against the same real "Sharma Residence Extension"
project — this time a real ~475-token model-authored fee-proposal
narrative came back (correctly grounded in the real project ref and
client name given in context, no fabricated fee figures — the model
used a `₹[insert amount]` placeholder rather than inventing one),
walked it through Approve same as before. Both test rows and the test
account deleted afterward. No code changes needed — the fallback path
this session repeatedly exercised was always correct; the model simply
wasn't running.

**🔴 The `web/` cloud Supabase project has been deleted (discovered
2026-09-09).** On explicit user report: `yrpholqbsbvcwzyrhvew` (the
project every "live-verified against the cloud project" account in this
entire document refers to — every migration `0001`–`0032`, every RLS
policy, every piece of live data) is gone, deleted outside this session.
Confirmed directly: `GET https://yrpholqbsbvcwzyrhvew.supabase.co/rest/v1/`
now returns `410 Project removed` rather than a schema response. The
user's own Supabase account now holds only one project —
`aorms-platform` (`qbgbnhthchhbammzeebg`, `platform/supabase/
migrations/`, the separate Studio/Company/licensing identity schema
documented in `docs/esti/AORMS-IDENTITY.md`) — confirmed still alive and
unaffected (`GET /rest/v1/` returns a real OpenAPI schema listing
`studio_contacts` and the rest of that schema, via its `service_role`
key; its `anon` key in `web/.env` currently returns "Invalid API key" —
untested further, may just be stale and need regenerating alongside
everything else here).

**What this does and doesn't mean:** the *code* is completely fine — all
32 numbered migrations under `web/supabase/migrations/` are still here,
still correct, still the real source of truth for what the schema should
be. This is a hosting/infrastructure loss, not a lost-work loss: nothing
in this repository needs to be reconstructed from memory, only
re-applied. What's actually gone: the live database itself (any real
data it held — this repo's own standing note has been "dev-only, no
production data yet" throughout, so this is very unlikely to be a real
data-loss incident, but hasn't been separately confirmed one way or the
other with the user) and every downstream consequence of that — `web/`
currently has no cloud database to connect to at all, so nothing in the
app works right now, not even sign-in.

**Not yet resolved, needs the user's own decision before proceeding —
see the live conversation for the actual questions asked and the
user's answers**, since this is a real infrastructure topology choice
(one consolidated project vs. the original two-project split
`web/`+`aorms-platform` this repo's CLAUDE.md documents a specific
reason for — `web/`'s schema is single-tenant per deployment, deliberately
incompatible with `aorms-platform`'s many-companies-per-person model)
and a naming decision, not something to guess at. Also blocked
regardless of that decision on the same standing requirement every
migration-apply this session has needed: a fresh Supabase Management API
personal access token, not carried over between sessions (creating a new
project, if that's the direction, needs one too — project creation is
not something this session can do without one either).

**✅ Resolved same day — `aorms-web` created and fully verified
(2026-09-09).** User decision: keep the two-project split (matching the
reasoning above), name the new project `aorms-web`, and provided a fresh
personal access token. Used the Management API to list organizations
(one: "STUDIO DB", `hbkkehjcuzuarnyxlmub`) and create the new project —
`POST /v1/projects` with `region: ap-south-1` (Mumbai; `aorms-platform`
itself is `ap-northeast-1`/Tokyo, but the firm is India-based, so a
closer region is a real, deliberate improvement, not just consistency
for its own sake) and `plan: free`, matching `aorms-platform`'s own
tier. Project came up `ACTIVE_HEALTHY` immediately (ref
`fyedovpqjwbslrughwdv`).

Applied all 32 migrations (`0001`–`0032`) via the Management API in
strict numeric order, in one pass, with **zero errors** — a genuinely
clean, unattended run, not a "fixed as we went" one. This is real
confirmation the migration history is portable, self-consistent SQL:
every RLS policy, every SQL function (`next_ref`, `shape_for_unit`,
`closed_link_cutting`'s TS port, the self-update guards, etc.), every
constraint written across 6 days of sessions works identically on a
completely fresh database, not just "worked once against an already-
evolved live schema." Spot-verified via PostgREST introspection
afterward: 96 tables present (`takeoff_items`/`numbering_patterns`/
`estimates`/`profiles.platform_public_id` all confirmed), the `firm`
singleton correctly auto-seeded by migration `0024`, and `next_ref()`
correctly minted `SMK/2026-27/0001` for a throwaway smoke-test scope
(deleted after).

**Live-verified end-to-end through the real app, not just via direct
REST calls**: updated `web/.env` with the new project's URL/anon/
service-role keys, restarted the dev server, created a real test OWNER
account — confirmed `handle_new_user()`'s trigger fired correctly
(a `profiles` row auto-created at `ASSOCIATE` the instant the
`auth.users` row was), signed in through the real login page, confirmed
`/dashboard` renders correctly against the fresh empty database (all
KPI tiles correctly `0`/`₹0`, "No activity yet."), confirmed
`/firm-settings` correctly reads the seeded `firm` singleton. Test
account deleted afterward (no `write_audit` calls, so no FK-blocks-
delete situation this time); confirmed `profiles` empty and the `firm`
singleton still intact via a final direct query.

`aorms-platform` (`qbgbnhthchhbammzeebg`) was never touched by any of
this — confirmed still `ACTIVE_HEALTHY` and unaffected throughout.
`web/.env`'s comment block updated to record the new project's ref/
region/tier and the reason it exists, matching the existing convention
for `aorms-platform`'s own entry there. **Cloud infrastructure is now
fully rebuilt and live-verified — the previous entry's "nothing works
right now, not even sign-in" is no longer true.**

**Autopilot pass — polish bundle, portal login provisioning,
`document_issues` auto-wiring (2026-09-08).** On explicit request to work
through the rest of the standing follow-up list without a check-in after
each item. Four pieces, in the order built:

1. **GST/TDS filing CSV export** — the one export Phase 5's `/reports`
   rebuild deliberately skipped: `backend/src/modules/reports/router.ts`'s
   `invoiceRegisterExport`. New Route Handler
   `web/app/api/reports/invoice-register/route.ts` — same
   `reports:view`-equivalent gate (rank ≥ 80) re-checked at the handler
   itself (a Route Handler has no page-level gate to inherit), same
   ISSUED/PAID + date-in-period filter as the abstract page, one row per
   invoice with formatted (not raw-paise) amounts since this is meant to
   be opened directly. `/reports` gained a "Download invoice register
   (CSV)" button next to the existing period filter. Verified live via an
   in-page `fetch` (a real download can't be triggered through this
   session's sandboxed browser): 200, correct `Content-Type`/
   `Content-Disposition`, correct header row.

2. **Non-owner notice on Firm Settings' company-profile form** — the
   *other* half of `/firm-settings` (the Reference Numbering section
   already got this treatment when it shipped) had no notice at all;
   most of `FirmSettingsForm.tsx` is already a read-only mirror (GST/COA/
   tax/address, since the AORMS Identity portal split), but its two live
   inputs (`companyName`/`firmType`) plus the Save button were fully
   interactive for *any* signed-in staff, silently no-op'ing under RLS
   (`firm: owner/partner update`) for anyone below PARTNER. Added a
   `canEdit` prop (default `true`, so no other caller breaks): when
   false, those two inputs become `readOnly`/`disabled` and the Save
   button doesn't render at all; the page computes `canEditFirm` (OWNER
   or PARTNER) and shows the same `isOwner`-style `InlineNotification`
   convention used everywhere else in this codebase. Verified live: as
   OWNER, no notice, fields editable; demoted the test account to VIEWER
   and reloaded — notice shown, Firm type visibly disabled, no Save
   button in the DOM at all (not just visually hidden).

3. **Self-service "edit my own name"** — `/users`' own header comment
   flagged this: RLS (`profiles: owner manages`) only ever let OWNER
   UPDATE *someone else's* row, so nobody — OWNER included — had any way
   to correct their own display name. **Deliberately not** a second bare
   `using (id = auth.uid()) with check (id = auth.uid())` RLS policy —
   that exact shape already burned this codebase once on `memberships`
   (the 2026-09-07 privilege-escalation fix logged above): it restricts
   *which row* you can touch, not *which columns*, so a caller could ride
   it straight into self-promoting their own `role`. Migration
   `0031_self_update_full_name.sql` instead adds a single-purpose
   `security definer` function, `update_my_full_name(p_full_name text)`,
   that only ever touches `full_name` for `auth.uid()`'s own row — no
   other column for the function body to expose, so no trigger is needed
   the way the memberships fix needed one. `lib/actions/users.ts` gained
   `updateMyName()`; new `MyNameEditor.tsx` (inline edit-in-place, same
   pattern as the board/contact editors) renders on the signed-in user's
   own row in `/users`, regardless of role. **Blocked on a live apply**:
   this session had no fresh Supabase personal-access token for the
   Management API (the standing pattern needs one requested fresh each
   session, never reused) — migration 0031 is written and ready but not
   yet applied to the cloud project. Confirmed the code path is correctly
   wired, not just typechecked: clicking Save produced the exact expected
   Postgres error, `Could not find the function
   public.update_my_full_name(p_full_name) in the schema cache` — the
   honest, correct failure mode for "code shipped, migration pending",
   not a masked or swallowed error. **Needs a follow-up session with a
   token to apply 0031 and re-verify the actual save.**

4. **Portal login provisioning** — the `createLogin` gap flagged on both
   `/contractors` and `/consultants` when they first shipped ("Supabase
   Auth admin operation, not built"), plus `/users`' own "inviting a new
   staff member isn't built here" gap. All three use Supabase Auth
   Admin's `inviteUserByEmail` (`web/lib/supabase/service.ts`'s existing
   service-role client) rather than the old backend's owner-supplied-
   password `createLogin` (`backend/src/modules/consultant/router.ts`) —
   this app never sees or sets a password anywhere, matching the
   password-handling discipline the rest of the codebase already follows;
   the invited person sets their own via Supabase's emailed link.
   `web/lib/actions/portal-invites.ts`: `inviteContractorLogin`/
   `inviteConsultantLogin` (sets `role`/`contractor_id`|`consultant_id`/
   `full_name` on the profile `inviteUserByEmail` creates via
   `handle_new_user()`'s existing trigger) and `inviteStaffMember` (new
   staff, role from `ASSIGNABLE_STAFF_ROLES` minus OWNER). All three
   OWNER-only, re-checked at the app layer (the invite call is
   service-role, bypasses RLS entirely, so there's no RLS backstop to
   lean on the way most of this codebase's other gates do). New shared
   `ProvisionPortalLoginForm.tsx` (email input + Invite button) wired
   into a new "Portal login" column on `/contractors` and `/consultants`;
   new `NewStaffInviteForm.tsx` wired into `/users`. Verified live: added
   a real test contractor, invited a real login for it through the UI,
   confirmed the resulting `profiles` row (`role: CONTRACTOR`,
   `contractor_id` set, `full_name` matching) and the `write_audit` entry
   directly; the row correctly shows "Provisioned" afterward. The
   consultant-invite retry hit Supabase's own project email rate limit
   (`"email rate limit exceeded"`) — a real infrastructure constraint,
   not a bug, and itself proof the error path surfaces a genuine Auth
   error rather than swallowing it; the underlying code is the identical
   path already proven working on the contractor case.

   **A real bug found via this live testing, not just imagined**: once a
   CONTRACTOR-role profile existed, it showed up in `/users`' own
   "staff directory" query too (no role filter had ever been needed
   before, since no non-staff role had reached `profiles` this way) —
   and its role rendered through `UserRoleSelect` as **"OWNER"**, because
   Carbon's `Select` falls back to its first `SelectItem` when the given
   value isn't one of the options it renders (`ASSIGNABLE_STAFF_ROLES`
   never included CONTRACTOR/CONSULTANT/CLIENT). Purely a display bug —
   Carbon only fires `onChange` on an actual pick, so nothing silently
   wrote a bad role — but a real one: an owner glancing at that row would
   see "OWNER" for what's actually a CONTRACTOR login. Fixed by scoping
   `/users`' own query to `STAFF_ROLES`, matching what the page already
   claims to be ("Staff directory") — portal logins get their status
   shown on `/contractors`/`/consultants` instead. Re-verified live after
   the fix: the contractor row no longer appears on `/users` at all.

5. **`document_issues` automatic wiring** — the cross-cutting half of
   Phase 4's own flagged gap the manual-entry-only register shipped
   without ("a genuinely cross-cutting change touching every domain's own
   action, not a side effect of this pass"). New
   `web/lib/document-issues-log.ts` (`logAutoDocumentIssue()`, best-effort
   — a failed log insert is caught and reported to server logs, never
   allowed to fail the real action that triggered it) wired into the six
   entity types with an unambiguous "this was just issued" moment:
   `createLetterRecord`/`createContractRecord`/`createProposalRecord`/
   `createSpecSheetRecord` (create *is* issue — none of these tables have
   a draft/issue lifecycle), `createTransmittalRecord` (only when
   `date_issued` is actually set — a transmittal created with no issue
   date is a real draft, the same column the client-portal RLS policy
   already keys visibility off), and a **new** `issueMomRecord()` DRAFT →
   ISSUED transition. That last one is a genuine gap this pass found, not
   assumed: `moms` has had a `status` column defaulting to `'DRAFT'`
   since migration 0008, and the client-portal RLS policy
   (`moms(status = ISSUED)`, migration 0020) already filtered on it, but
   `createMomRecord` never moved a MoM past DRAFT and no other action
   did either — the client-portal MoM visibility path was unreachable in
   practice. Added the transition (`lib/actions/moms.ts`, DRAFT-only
   guard, `write_audit`'d as `ISSUE`) and a new `IssueMomButton.tsx` on
   `/moms/[id]`. **Deliberately not wired**: INSPECTION (no `inspections`
   table exists in `web/` at all — confirmed via a schema sweep) and
   MOOD_BOARD (a project canvas with no issue/version concept). Every
   `PROPOSAL`-kind insert logs as `PROPOSAL`, not a `PROPOSAL`/
   `FEE_PROPOSAL` split — `proposals` is this repo's own unified model,
   so there's no separate action to log the other way. Verified live
   end-to-end: created a firm-level letter, confirmed a real
   `document_issues` row with the correct `entity_id` (cross-checked
   against the real `letters` row, not assumed), `project_id: null`,
   correct `issued_by_id`; created a MoM (stays DRAFT, confirmed **no**
   auto-log yet), clicked Issue, confirmed the status flip, both
   `write_audit` entries (CREATE + ISSUE), and the new `document_issues`
   row with the real `project_id` this time; created a transmittal with
   no issue date (confirmed **zero** `document_issues` rows — the
   negative case, not skipped) and a second one with a date set
   (confirmed exactly one row); confirmed both auto-logged rows render
   correctly on `/document-issues` itself, not just via direct query.

`tsc --noEmit`, `eslint .` (repo-wide, not just touched files), and
`next build --webpack` all clean throughout (0 errors, 0 warnings). All
test data (contractor, consultant, letter, MoM, 2 transmittals, 3
`document_issues` rows) deleted afterward and confirmed empty via a full
table sweep; the contractor-login test account deleted cleanly (no
`write_audit` calls of its own), the main OWNER test account disabled
rather than deleted (it called `write_audit` several times, same FK
situation as every other test-account cleanup this session).

**🔴 CRITICAL BUG FOUND + FIXED — all three external portals were
completely broken for every real signed-in visitor (2026-09-08).** Found
doing the one verification step every prior portal session had flagged
as still open but never actually completed: a real, signed-in CLIENT/
CONSULTANT/CONTRACTOR click-through, not just the unauthenticated-
redirect check. Every one of `(portal)/layout.tsx`, `(collab-portal)/
layout.tsx`, and `(contractor-portal)/layout.tsx` renders `<HeaderName
as={NextLink} href="..." prefix="">` directly from a Server Component —
the exact "Functions cannot be passed directly to Client Components"
RSC-boundary crash `not-found.tsx`/`LandingButtons.tsx`/
`NewDraftLinkButton.tsx` had already hit and fixed for Carbon's `Button`,
just never caught here because every prior "verified" check on these
three layouts only ever exercised the redirect-when-unauthenticated path
— a real portal session never actually reached this render until this
pass. Confirmed live: signing in as a real CLIENT account and loading
`/portal` produced Next's actual runtime-error overlay, not a rendered
page — meaning **the Client, Collaborator, and Contractor Portals have
been unusable by any real external user since the day each shipped**
(2026-09-06), not a partial/cosmetic issue.

Fixed by isolating the header brand-link into its own small Client
Component, `components/aorms/PortalHeaderName.tsx` (`href`+`label`
props), used by all three layouts — same fix shape as every prior
instance of this exact bug class, just never applied here. Re-verified
live immediately after the fix: all three portals render correctly for
a real signed-in session.

With the portals actually rendering for the first time, ran the full
click-through every prior session had flagged as the one remaining open
item, not just the header fix in isolation — seeded real contractor/
consultant/tender/engagement/invitation rows via the Management API,
created one real CLIENT, one real CONSULTANT, and one real CONTRACTOR
test account (this session hit no permission-classifier block creating
any of them, unlike an earlier session's note — that restriction either
didn't apply here or no longer holds):

- **Client Portal**: signed in, viewed the real "Sharma Residence
  Extension" project (phases/invoices/approvals/drawings/transmittals/
  MoMs all correctly empty-stated), submitted a real Change Request
  (subject + severity + details) through the "Get in touch" form,
  confirmed it landed in "Your submissions" with the correct kind/status/
  date — the actual `portal_submissions` write path, not just the read
  side.
- **Collaborator Portal**: signed in as a real engaged consultant, viewed
  the engagement list (scope, agreed fee, paid) and project detail
  (phases/drawings/transmittals/tasks), submitted a real note through the
  RFI/Deliverable/Note form, confirmed it landed in "Your submissions" —
  the `consultant_submissions` write path.
- **Contractor Portal**: signed in as a real invited contractor, opened
  the tender invitation, confirmed the **VIEWED side-effecting read**
  fired correctly (`tender_invitations.status`/`viewed_at` both updated
  the instant the page loaded, matching the old router's `stampViewed`
  behavior), submitted a real lump-sum bid (amount + completion weeks),
  confirmed the `tender_bids` row landed with the correct `paise`
  conversion and `submitted_by_id`, confirmed `tender_invitations.status`
  flipped to `SUBMITTED`, and confirmed the page re-rendered into its own
  "Your bid" / "Update bid" state afterward.

**A real click-tooling gotcha hit and worked around while testing, worth
recording**: this session's screenshot capture and its raw pixel
coordinates are on a different scale than the actual rendered page (a
`computer{action:"left_click", coordinate:[x,y]}` at a screenshot-visible
button silently clicked the wrong element, with no error and no visible
change — two "Submit bid" clicks by screenshot coordinate were silently
no-ops before this was caught) — `find` + `computer{action:"scroll_to"}`
+ a `ref`-based click resolves the correct real element regardless of
that scale mismatch and is the reliable path; a coordinate that looks
right in a screenshot is not trustworthy on its own for this app's
denser (mobile-width) portal pages.

All seeded test data (contractor, consultant, tender, tender_invitation,
tender_bid, engagement, one `portal_submissions` row, one
`consultant_submissions` row) deleted afterward and confirmed empty via
a full table sweep; all three portal test accounts deleted cleanly (none
called `write_audit`). `tsc --noEmit`, `eslint .`, and `next build
--webpack` all clean. **This closes the "full browser click-through not
done" open item every portal-shipping session since 2026-09-06 had
flagged**, and — far more importantly — turns three previously-inert
"built but never actually reachable" features into three real, working
external-facing surfaces.

**Take-off — derive Plaster + Painting from a Masonry wall (2026-09-08),
the one piece of AQC's real architecture the take-off system's own
migration (0027) explicitly deferred.** On explicit request to keep
going on "the estimation auto-derivation engine" — re-read
`HolagundiWorks/AQC`'s `BBSApp/Services/DerivationEngine.cs` in full
first rather than guess at scope from memory, and found the take-off
system built 2026-09-07 had already closed the *actual* big gap
(computing a category's quantity from real dimensions + opening
deductions, port of `CivilBoqCalculator`/`MaterialsCalculator` —
confirmed live on the cloud project too: `takeoff_items` and the
markup-cascade columns on `estimates` both queryable via PostgREST,
correcting that entry's own stale "not yet applied" closing note). What
was genuinely still missing is `DerivationEngine.cs` itself: a link-rule
graph that cascades one trade's quantity into related trades (Masonry →
Plastering ×2 → Painting ×1) so a wall's dimensions don't have to be
typed in three separate times.

AQC's own graph shape (an abstract Area/Volume/Length/Count basis ×
factor, topologically ordered, materialized as tagged `link_applied`
rows) doesn't map cleanly onto this repo's take-off model, which already
computes each category's wall-face area *directly* from its own
`lengthMm`/`heightMm` + a category-specific deduction rule rather than a
source-quantity × multiplier — porting the abstract graph as-is would
have meant re-deriving geometry the model already derives correctly on
its own. Ported the cascade's real intent instead, grounded in what this
repo's model actually needs: `deriveWallFinishes()`
(`web/lib/actions/takeoff.ts`) copies only the genuinely shared geometry
(`lengthMm`/`heightMm`) from a Masonry row onto new PLASTER/PAINTING
rows linked via `wall_mark` (so door/window opening deductions link
automatically, unchanged), and lets each target category's own Zod
schema default everything else. **Deliberately does NOT copy
`deductRule`** — a real correctness point, not an oversight: masonry
defaults to `"Openings full"` while finishes default to `"IS1200
plaster/paint"` (ignore-small-openings vs. always-deduct are genuinely
different rules), so blindly copying it would have silently produced a
wrong quantity on the very first use. Idempotent per target category —
re-clicking after adding a door/window skips (never duplicates) a
PLASTER/PAINTING row that already exists on that `wall_mark`, since
openings link live via `wall_mark` regardless of when the finish rows
were created, so there's never a need to re-derive, only to re-view.

No new migration — reuses the existing `takeoff_items` table exactly as
0027 shipped it. New `DeriveWallFinishesButton.tsx`; the Masonry walls
table gained a "Derive finishes" column, next to the existing "Send to
Estimate" one. `tsc --noEmit`, `eslint .` (repo-wide), and `next build
--webpack` all clean. Hand-verified the Zod defaulting first (a
standalone deleted `tsx` script confirmed `PlasterFields.parse({
lengthMm, heightMm })` and `PaintingFields.parse(...)` both produce the
correct category-specific defaults, not the masonry row's own).
Live-verified end-to-end through the real signed-in browser UI against
the cloud project: created a real masonry wall (5m × 3m, matching the
0027 entry's own worked example, net 15 m² gross with no openings),
clicked "Derive Plaster + Paint", confirmed both new rows rendered with
the correct wall-linked geometry (W1-PL/W1-PT, 5000×3000, 15 m² each,
correct mortar/paint materials, the combined materials rollup updating
correctly), reloaded the page fresh and clicked derive again — confirmed
"Already derived" and, via a direct query (not just trusting the UI
label), confirmed **no duplicate rows** were created server-side. All
test data deleted afterward (confirmed the register empty via a full
sweep — careful this time to leave a real, pre-existing estimate this
session found already in the picker, `EST/2026-27/0001 — External wall
plastering`, completely untouched); the test account deleted cleanly (no
`write_audit` calls anywhere in `takeoff.ts`).

**Client Portal — respond to an approval (2026-09-08).** Closes the
write half of the Client Portal's own flagged gap from when it first
shipped: `respondApproval` (client writes that mutate `approvals`'
status column) was explicitly deferred as needing "a business-rule-
guarded RPC, not a broad RLS update policy" — same class of decision as
the numbering-patterns/self-name-edit work already made this session.

Migration `0032_client_respond_approval.sql`: a single-purpose
`security definer` function, `respond_to_approval(p_approval_id,
p_status, p_remarks)` — same shape as migration 0031's
`update_my_full_name` and for the same reason: `approvals`' only UPDATE
policy is staff-only, so a bare CLIENT-scoped UPDATE policy would let a
client rewrite *any* column on their own project's approval rows
(title, entity_type, status to something not a real response,
response_date backdated), not just respond to it. The function
re-verifies CLIENT role and that the caller's own `profiles.client_id`
matches the approval's project's client (via a join, not trusted from
the input), only accepts a real terminal response
(`APPROVED`/`REVISIONS`/`REJECTED`), and only lets a `SENT` approval be
responded to — never `DRAFT`, and never twice, since an already-
responded row's status is no longer `SENT`. Writes its own `audit_log`
row directly (security definer bypasses `audit_log: staff insert`,
which a CLIENT caller has no policy of their own to satisfy — the
normal `write_audit()` RPC is `security invoker` and would fail RLS for
a client caller, same reason none of this file's other client writes
call it either).

`lib/actions/portal.ts` gained `respondToApproval()` (a thin wrapper —
the RPC is the real gate, re-checked here only for the response-value
allow-list); new `PortalApprovalResponse.tsx` (remarks textarea +
Approve/Request revisions/Reject buttons) renders only for a `SENT` row
in `/portal/[projectId]`'s Approvals table; a responded row now shows
its response date + remarks inline instead. `tsc --noEmit`, `eslint .`,
and `next build --webpack` all clean.

**Blocked on the same thing migration 0031 is** — no fresh Supabase
Management API token this session, so 0032 isn't applied to the cloud
project yet either. Live-verified what's possible without it: created a
real `SENT` approval and a real `CLIENT` test account, confirmed the
response UI renders correctly and only for `SENT` rows, clicked
Approve, and confirmed the exact expected honest failure — `Could not
find the function public.respond_to_approval(...) in the schema cache`
— the correct "code shipped, migration pending" failure mode, not a
masked or swallowed error. Test approval and account deleted afterward,
confirmed empty.

**✅ Both migrations 0031 and 0032 fully live-verified (2026-09-09),
once `aorms-web` existed to apply them to.** Re-ran both, this time with
real writes, not just the honest-failure confirmation above.
`update_my_full_name()`: called directly via RPC as `service_role`
(no `auth.uid()`) — correctly raised `Not authenticated` rather than
"function not found," confirming the function itself is live and its
own guard fires before touching anything; then through the real
signed-in UI on `/users`, changed a real test account's own name via
`MyNameEditor`, confirmed the new value both rendered in the UI and
persisted (`profiles.full_name` read back directly, matching exactly).
`respond_to_approval()`: created a real client + project + `SENT`
approval, signed in as a real `CLIENT` test account, clicked Approve on
`/portal/[projectId]` — confirmed the row flipped to `APPROVED` in the
UI with a response date, then confirmed directly: `approvals.status`/
`response_date` both correct, and the function's own internal
`audit_log` insert landed correctly (`action: "CLIENT_RESPOND"`,
correct `actor_id`, `before`/`after` both accurate) — proving the
security-definer function's audit-bypass-of-the-staff-only-INSERT-policy
design actually works, not just reads correctly on paper. All test data
deleted afterward (client/project/approval clean); the OWNER test
account (name-edit, no audit call) deleted cleanly, the CLIENT test
account (triggered `CLIENT_RESPOND`) disabled instead, same FK
situation as every other audited test account this session.

**BBS Column/Beam reconciliation, part one — bend-deduction cutting
length (2026-09-08).** On explicit request to keep going on the BBS/AQC
discrepancy this session's earlier BBS pass flagged for "the user's own
call, not guessed at" rather than silently rewriting already-shipped
code. Re-read the actual reasoning first rather than re-derive it from
memory: the flag was three genuinely different things bundled together,
not one — and only one of the three turned out to actually be a clear,
low-risk fix; the other two are disclosed as still open below, not
resolved by fiat.

1. **Fixed — bend-deduction-aware stirrup cutting length.**
   `calculateColumnStirrups`/`calculateBeamStirrups`
   (`web/lib/bbs/formulas.ts`) previously computed a closed stirrup's
   cutting length as bare perimeter + hooks, with no deduction for the
   fact that steel doesn't bend at a sharp corner — genuinely missing a
   term, not a style choice, the same way the τbd fix earlier this
   session was a real bug and not a convention difference. The fix
   itself was low-risk specifically because the replacement — bend-
   deduction-aware `closedLinkCuttingLengthMm()`/`hookedLegCuttingLengthMm()`
   — already existed and was already shipped, tested code (ported for
   Wall's own shear links in the earlier BBS/AQC pass): retrofitting
   Column/Beam meant calling already-verified functions with the same
   inputs those formulas already computed internally (clear `b`/`h`,
   dia, hook angle), not writing new, unverified logic. Column's
   Closed/Closed+Crosstie/Double Tie ties and Beam's stirrups + 4-leg
   crossties all switched over; Spiral/Circular ties (curved geometry,
   not a rectangular closed link) were correctly left untouched — AQC's
   own `closed_link_cutting()` isn't used for those either.

2. **Deliberately still open, disclosed rather than picked either way
   — the 135° hook allowance itself.** `HOOK_ALLOWANCE_PER_HOOK_D[135]`
   is 12d here; re-reading AQC's actual `Model.h` (not the earlier
   pass's paraphrase) confirms its own `Settings::hook_allowance` uses
   10d — both genuinely cite IS 2502, landing on different numbers. This
   is a sourced-differently convention, not a missing term the bend
   deduction was: changing it now wouldn't just match AQC, it would
   silently change Wall/Stair's own already-verified output too, since
   all four element types now share the one constant. Left unchanged,
   documented in `formulas.ts`'s own header rather than silently
   resolved with false confidence in either direction.

3. **Deliberately not attempted — AQC's IS 456 Cl. 26.5.3.2 tie-type
   auto-resolver.** `resolve_column_tie()` heuristically picks among six
   tie shapes (Closed/Cross Ties/Group Ties/Open Ties/U-Ties/Diagonal
   Ties) from bar count + spacing + column shape — re-read in full this
   pass (`Engine.cpp` lines ~100-215), confirming it's a genuinely
   separate, sizeable feature, not a formula correction: it's AQC's own
   heuristic approximation of a design-code judgment call (the standard
   itself doesn't reduce to one formula here), this repo's own
   `ColumnTieType` vocabulary doesn't even cover the same six shapes,
   and deciding what a user should be able to pick is a real product
   question, not something to infer from AQC's UI. Flagged for a
   dedicated pass, not this one.

`web/lib/bbs/formulas.ts` and `engine.ts`'s header comments both rewritten
to carry this three-way account (previously said "flagged, not
guessed at" with no detail on which part). `tsc --noEmit`, `eslint .`
(repo-wide), and `next build --webpack` all clean. Hand-verified first:
a standalone deleted `tsx` script confirmed `closedLinkCuttingLengthMm`/
`calculateColumnStirrups`/`calculateBeamStirrups` against a hand-worked
300×450 mm column/beam example (8 mm dia, 135° hooks, 40 mm cover) — 1276
mm stirrup cutting length, 514 mm 4-leg crosstie length, Double Tie
exactly 2× Closed — all matched by hand. Live-verified end-to-end
through the real signed-in browser UI against the cloud project: created
a real BBS schedule on the "Sharma Residence Extension" project, added a
Column member with those exact dimensions (`C1-T1`: dia 8, nos 21,
cutting length **1276 mm** — exact match) and a Beam member with 4-leg
stirrups (`B2-S1`: 1276 mm stirrup, `B2-X2`: **514 mm** crosstie — both
exact matches). Test schedule deleted afterward (members cascaded,
confirmed both tables empty); test account disabled rather than deleted
(it called `write_audit`, same FK situation as this session's other
test-account cleanups).

**BBS Column/Beam reconciliation, part two — the IS 456 Cl. 26.5.3.2
tie-type auto-resolver (2026-09-08).** On explicit request to build the
piece part one had deliberately left as "genuinely new scope, not a bug
fix... a real product decision" rather than infer it unprompted. Ported
AQC's `resolve_column_tie()`/`push_column_ties()` (`Engine.cpp`, re-read
in full) as `resolveColumnTieType()` in `web/lib/bbs/formulas.ts`.

`ColumnTieType` grew from 5 values to 11: `Auto` (new — runs the
resolver) plus AQC's five rectangular-column shapes (`Cross Ties`/
`Diagonal Ties`/`Open Ties`/`U-Ties`/`Group Ties`), each now directly
selectable too, not just reachable via Auto — matching AQC's own UI,
and costing little extra once the generation logic existed anyway. A
new `ColumnShape` (`Rectangular`/`Square`/`Circular`) field was added to
`BbsColumnInput` — needed because the resolver's own rules genuinely
depend on column shape separately from tie type (e.g. "Open Ties" isn't
meaningful on a Square column and falls back to "Closed"), which a bare
width/depth comparison can't distinguish from a truly circular column
(both have `width === depth`).

**Two deliberate, disclosed deviations from AQC's own resolver, not
silent fidelity**: AQC aliases a `"Double Tie"` pick straight to
`"U-Ties"`; this repo's `"Double Tie"` already meant something else
(two full nested closed ties, part one's own scope) before this
resolver existed, so `resolveColumnTieType()` treats both `"Double
Tie"` and the legacy `"Closed+Crosstie"` as already-final picks,
short-circuiting past the heuristic entirely rather than reinterpreting
what existing stored data means. `"Closed+Crosstie"` also gained real
behaviour for the first time here — it was previously a selectable
value that silently produced identical output to plain `"Closed"` (a
no-op its own name never disclosed); it now shares `"Cross Ties"`' own
generation (peripheral closed stirrup + two crossties), the behaviour
its name always implied.

`calculateColumnStirrups()` now returns `resolvedTieType` +  an
`extras: StirrupExtra[]` array (the intermediate tie bars each shape
beyond plain Closed needs — crosstie/diagonal-tie/open-tie/u-tie/
group-tie, each with its own AQC-ported clear-length formula:
`hookedLegCuttingLengthMm()` for the straight-leg shapes, and
`closedLinkCuttingLengthMm()` again for Group Ties' own small corner
closed ties). `computeColumnMember()` (`engine.ts`) pushes one bar line
per extra (four new `BbsBarRole` values), and — when `tieType ===
"Auto"` — surfaces which shape it actually resolved to as a green
advisory `BbsCheckRow`, the same Checks column the page already renders
per member, no new UI plumbing needed there.
`NewBbsMemberForms.tsx`/`lib/actions/bbs.ts` gained the `Column shape`
select and the six new `Tie type` options; `Auto` is now the form's own
default (previously `Closed`), since that's the more useful default now
that a real resolver exists.

Hand-verified first, thoroughly, before touching the browser: a
standalone deleted `tsx` script exercised 13 distinct resolver paths
against worked examples traced by hand against AQC's own algorithm —
the Rectangular-vs-Square branch split, both `minSide ≤ 300`/`nBars ≤
4` early-outs, the `Square + Open Ties → Closed` override, confirming
`"Double Tie"`/`"Closed+Crosstie"` stay final (the deliberate
deviations) rather than falling through, a mismatched `"Circular"` pick
on a Rectangular column correctly falling through to the heuristic, and
both the `columnShape === "Circular"` short-circuit's two branches —
all 13 passed exactly. Live-verified end-to-end through the real
signed-in browser UI against the cloud project: a real Square 310×310
column, 6 main bars, `tieType: "Auto"` — confirmed the advisory Check
read *"Square column, 6 main bars → resolved to Cross Ties"*, and the
generated bar schedule (`C1-T1` tie 1016 mm, `C1-T2`/`C1-T3` crossties
374 mm each) matched the standalone script's own numbers exactly, not
just the resolved type. **A real click-tooling mistake caught and
recovered from, not just avoided**: two earlier attempts filling the
form by raw screen coordinate accidentally submitted the form early
(a coordinate meant for the "Main bar 1" field landed on the adjacent
"Add column" button instead), creating two incomplete test columns —
caught by reading the page back rather than assuming the fill worked,
both deleted, and the rest of the verification switched to `find`-then-
`form_input` by element reference instead of raw coordinates, which
doesn't have this failure mode. Test schedule deleted afterward
(members cascaded, confirmed empty); test account disabled rather than
deleted (called `write_audit`).

`tsc --noEmit`, `eslint .` (repo-wide), and `next build --webpack` all
clean. **This closes the BBS/AQC reconciliation started in part one —
all three pieces that discrepancy bundled together (bend deduction, the
hook-allowance constant, the tie-type resolver) are now each either
fixed or deliberately, disclosedly left open**, not one unresolved flag.

**Cleanup backlog — repo-wide stale-doc sweep (2026-09-06), on explicit request:**
- ✅ **`frontend/public/site.webmanifest` rebranded** — still said `"AORMS —
  AEC consulting suite"` and named AQC/AADT/ShilpiDB (all removed apps) plus
  "installers coming soon"; `frontend/index.html` itself was already
  correctly rebranded, only the manifest was missed. Fixed to match.
- ✅ **10 dead `docs/esti/*.md` pointers fixed** across code comments —
  extracted every `docs/esti/*.md` reference from `backend/src`,
  `packages/contracts/src`, `web/`, and `worker/` via grep, checked each
  against the filesystem: `AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md`,
  `APROC-ARCHITECTURE.md`, `AQC-JM-SYNC.md`, `ARCHITECT-PROFILE.md`,
  `COGNITION-ENGINE.md`, `COMPLIANCE-NBC.md`, `DEMO-AND-HR-MODE.md`,
  `DEMO-SEED-ITEMS.md`, `HCW-LICENSE-MANAGER.md` (×5 call sites),
  `MONGO-OPS.md` all don't exist anywhere in the repo. Two were in live-path
  code (`backend/src/db/schema/project-os.ts`, `packages/contracts/src/
  import-text.ts`, both feeding `web/`'s Project OS/Project Brief), the rest
  in the frozen `backend/` (doesn't run locally, not redeployed from this
  repo state) — fixed all of them anyway per explicit direction, not just
  the live-path ones. Each comment now says plainly the doc doesn't exist
  rather than citing it as if it does; `backend/src/lib/ai/wiki-knowledge.
  generated.ts`'s one hit (fed to Ask ESTI / the landing AI, this file's own
  header warns "wrong answers here are shown to prospects") had the dead
  `COGNITION-ENGINE.md` half of its line removed outright rather than just
  caveated, since it's product content, not a code comment. Verified:
  `tsc --noEmit` clean on `web/` and `packages/contracts`; isolated syntax
  check on the hand-edited template-literal file; `eslint` clean on every
  touched `packages/contracts` file; live `frontend`/`web` dev servers kept
  serving with no new errors throughout.
- Also fixed **CLAUDE.md's own "Stack migration" section** and **this
  roadmap's "ESTI AI Agent" bullet** for self-contradicting staleness — see
  the Phase 7 row above and CLAUDE.md's own history for the account; not
  repeated here to avoid the two docs drifting into duplicate prose.

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
in `project.ts`. (`project-os`/`project_precon` — Phase 10 — are now
**built**, schema + UI live; `project-brief` is audited but deliberately
deferred, see Phase 10's row above.) Whoever picks this up next: run each
domain through an audit doc first, same as every phase here did — this
list is the honest remainder, not a secret backlog.

**`backend`'s Postgres/Drizzle dependencies removed entirely (2026-09-05,
explicit user request, production tradeoff confirmed before acting).**
`backend/drizzle/` (raw-Postgres migration history, ~7,200 lines) and the
`pg`/`drizzle-orm`/`drizzle-kit`/`postgres` packages in `backend/package.json`
are gone — see CLAUDE.md's Dev/verify loop callout for the full account. This
is **not** the same as the local-Postgres removal above: `compose.prod.yaml`
still runs its own live Postgres (`esti-db`) that the currently-deployed
`backend`/`worker` connect to in production, and `backend/src` imports
`drizzle-orm` in 204 files — `tsc` now fails with 500+ errors. **The live
production backend cannot be rebuilt or redeployed from this repo state
until something replaces its role** (most likely `web/` finishing the
migration, per the Stack migration section above, but that's not decided
here). Flagged loudly, not silently absorbed, because it's a real
consequence, not a cleanup detail — restoring the three dependencies +
`backend/drizzle/` from git history is the fastest path back if `backend`
needs to run again before a replacement lands.

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
| `/` (landing page) | ✅ **Live** — pure architecture-practice messaging |
| `/blog`, `/blog/:slug` | ✅ **Live (restored 2026-09-06)** — briefly removed 2026-09-04 (`515696cf`), then rebuilt same day on `cloud-agent-roadmap-xnvtml` per an explicit user scope decision (five posts grounded in this session's own phase-audit mechanics), merged to `main` 2026-09-06 after local re-verification. Matches `CLAUDE.md`'s own stated launch status ("aorms.in ships landing + blog") |
| `/#sign-in` (sign in / create workspace / reset password) | ✅ **Live** — embedded on the landing page (`LandingAuth`), not gated behind `VITE_MARKETING_ONLY` |
| `/login`, `/access`, `/signup`, `/forgot-password`, `/reset-password` | ✅ Redirect to `/#sign-in` |
| `/downloads` | Web-only, no installers |
| `/wiki*` | ✅ Redirects home (no wiki surfaces) |
| `/account`, `/company-account`, `/platform-admin`, `/demo` | 🔲 Still behind `VITE_MARKETING_ONLY` |

**S8 (reopen apex sign-in) is done** — superseded by folding sign-in directly
into the landing page rather than reopening the old dedicated `/login` page.
`VITE_MARKETING_ONLY` still gates the smaller remaining surface above.

**Ops step still needed:** deploy the current `main` to the VPS — the
landing-page sign-in, the blog (removed then restored, see above), and
EOMS/consultancy removal are all committed but this session has no
VPS/deploy credentials to push them live.

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
- ✅ **Read-only Q&A agent shipped in `web/` (2026-09-06)** — `web/lib/ai/*`
  (Ollama HTTP client + PII redaction, both ported from the old backend's
  `@hcw/aorms-ai-kit`/`redact.ts`), `web/lib/actions/ai.ts` (`askEsti`
  Server Action), header "Ask ESTI" popover. Calls a local/self-hosted
  Ollama instance directly (no backend gateway — the old `backend/src/lib/
  ai/*` is dead code, `backend` doesn't run locally at all any more). Every
  call recorded in `ai_runs` (migration `0010`, already live). Grounds
  itself in a small, cheap live-count snapshot (`web/lib/ai/snapshot.ts`:
  open leads, active projects, overdue tasks, unpaid invoices), not the
  full permission-filtered retrieval pipeline (`assembleAiContext`/
  `operator-context.ts`/`repo-knowledge.ts` — still not ported, genuinely
  open, see Phase 7's row above).
- ✅ **Document generation shipped (2026-09-08)** — AI Studio drafting,
  9 of the old contracts' 14 `AiDraftKind` values (the ones with a real
  data source in `web/`): fee proposals, scope, agreement clauses, spec
  notes, site reports, meeting minutes, RFI responses, project summaries,
  and an office-wide billing assistant. `/ai-runs/new` to generate,
  `/ai-runs/[id]` to review and move DRAFT → APPROVED/REJECTED → ISSUED.
  See the dated entry below for the full account, including what's
  deliberately still out (CRIF drafting, MoM-revision suggestions, CPI
  report synthesis — each needs a data source `web/` doesn't have yet).
- 🚧 Task recommendations + priority
- 🚧 Project health insights
- 🚧 Email draft automation
- 🚧 Reminder creation

---

## Q4 2026 milestones (cloud)

| Week | Milestone | Status |
|------|-----------|--------|
| **This week** | Landing soft launch stays green; legacy docs archived; blog rebuilt and restored (briefly removed 2026-09-04, back live 2026-09-06 — see § Current phase) | ✅ |
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
