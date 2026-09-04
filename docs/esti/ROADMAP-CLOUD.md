# AORMS Cloud Roadmap (aorms.in / production)

**Status:** ACTIVE — soft launch, sign-in now live on the landing page;
Next.js/Supabase stack migration **in progress** (Phase 1 done)  
**Updated:** 2026-09-04  
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
| Phase 2 — Core ERP (orgs, users, roles, clients, projects, tasks) | ✅ **Landing order complete, all four slices verified end-to-end against the live project.** Migration `0001_phase2_core.sql` applied via the SQL Editor (direct DB access still unavailable from a session — Supabase's direct connection is IPv6-only, this network has no IPv6 route). `profiles`/`audit_log`/`firm`/`clients`/`project_offices`/`phases`/`tasks` all exist with RLS live. `/clients`, `/projects`, `/projects/[id]` (phases), and `/tasks` were each built, then verified through the real browser UI (sign in → create a record → confirm it renders correctly, including FK joins and status tags → confirm the `audit_log` row via REST API with correct actor/action/payload) — see the git history on `main` (2026-09-04) for each slice's commit. Deliberately deferred, not forgotten: gap-free `esti_sequence`-style ref numbering (a placeholder count-based `ref` is used); `computeScores`/`flagInterventions`/`todayQueue` task business logic (own `services/tasks/` layer, separate follow-up); the `teamMembers` vs `profiles` FK question for `tasks.assignee_id`/`reviewer_id` (points straight at `profiles` for now, per the Phase 2 audit's suggested fallback). |
| Phase 3 — Commercial (proposals, quotations, contracts, invoices, payments) | 🔲 Repo audit done — [NEXTJS-MIGRATION-PHASE3-AUDIT.md](./NEXTJS-MIGRATION-PHASE3-AUDIT.md). Corrects scope: no separate "quotations"/"payments" models exist — `esti_proposal` already covers quotations, payments are `invoices.paidPaise` + a separately-scoped reconciliation feature (deferred to Phase 6, depends on the Python worker). Flags two open decisions before implementation starts: purchase orders in/out of this phase, and whether PDF-render enqueueing lands now or waits for Phase 6's Redis Streams/worker pass. Suggested landing order: numbering (`sequences`/`next_ref()`) → shared pure business-logic functions (already portable as-is from `packages/contracts`) → proposals → letters/contracts → invoices. |
| Phase 4 — Technical (estimation, BOQ, measurements, documents, drawings) | 🔲 Repo audit done — [NEXTJS-MIGRATION-PHASE4-AUDIT.md](./NEXTJS-MIGRATION-PHASE4-AUDIT.md). Resolves a Phase 3 open question (`recordDocumentIssue`/`esti_document_issue` is this phase's "Documents" domain, not Phase 3's). Maps 6 actual domains behind the roadmap's 5 names: Rate Books, Estimates (= BOQ + measurement book, one domain), Documents (register/templates/numbering/MOMs), Transmittals, Spec sheets, Drawings. Flags BBS/steel-recon and the plan-markup/joint-measurement takeoff tool as adjacent-but-out-of-scope. Suggested landing order: Rate Books → Estimates → Spec sheets/Transmittals → Drawings → Documents (lands last, its register reads everything else). |
| Phase 5 — Reporting (dashboards, reports, exports, analytics) | 🔲 Repo audit done — [NEXTJS-MIGRATION-PHASE5-AUDIT.md](./NEXTJS-MIGRATION-PHASE5-AUDIT.md). Maps 5 domains: Dashboard (home + ~10 read models + a deterministic "cognition" scoring engine — not LLM, not Phase 7 AI), Reports (GST/TDS/export), Audit log viewer, Workload (+ an unauthenticated iCal Route Handler), ASPRF/Performance. Flags two pre-existing RLS-tier inconsistencies to decide on purpose rather than silently port forward: dashboard financial data is readable by any staff (VIEWER included) while raw invoices are partner-gated; the audit-log viewer is owner-only while its underlying table's RLS is staff-wide. Excludes `admin.usageReports` (licensing-platform, separate service), `rewards` (Team/HR), `search` (own audit pass). Suggested landing order: decide the RLS questions → `profiles` column additions → Reports → ASPRF → Audit log → Workload → Dashboard (last, composes everything else). |
| Phase 6 — Advanced processing (PDF/DWG, Python worker) | 🔲 Repo audit done — [NEXTJS-MIGRATION-PHASE6-AUDIT.md](./NEXTJS-MIGRATION-PHASE6-AUDIT.md). Different in kind from Phases 2–5: the central open question is a **hosting-topology decision** (does Hostinger Managed App Hosting support a persistent Python worker + Redis, or does the worker/queue stay externalized?), not a table-mapping question — flagged for whoever has visited Hostinger's actual docs, not resolved here. Found dead code (`engagement_register` PDF target references physically-removed `esti_cons_*` consultancy tables) and a stale doc comment (references removed EOMS). Surfaced a roadmap gap: `payslip`/`progress_report`/`site_instruction`/`pmc_ra_bill`/`feasibility_report` render targets belong to HR/Payroll and Delivery/AProc domains that have no assigned phase number 2–7. |
| Phase 7 — Optional AI | 🔲 Repo audit done — [NEXTJS-MIGRATION-PHASE7-AUDIT.md](./NEXTJS-MIGRATION-PHASE7-AUDIT.md). **Central finding**: `CLAUDE.md` (desktop-only Ollama, cites archived `LOCAL-FIRST.md`), `PRODUCTION-OPS.md`/`ARCHITECTURE.md` (2026-09 pivot to office-hub backend gateway, `LOCAL-FIRST.md` explicitly archived/superseded), and the actual code (`ai/gateway.ts` still hardcodes desktop-only Ollama, calling `127.0.0.1:11434` from the server — which cannot reach a user's desktop in a cloud deployment) all disagree with each other. Flagged as a product decision to resolve before implementing, not resolved here. What's real and portable regardless: the `esti_ai_run` provenance/audit table + draft-approval-lock workflow, PII redaction, permission-filtered retrieval from firm data, and the mock/template fallback provider. Drops the plan/licensing gate (consistent with Phase 2's tenancy decision). |
| Phase 8 — Roadmap gaps (HR/Payroll, Delivery/AProc, CPI, Knowledge Bank) — **not in the migration spec; proposed here** | 🔲 Repo audit done — [NEXTJS-MIGRATION-PHASE8-AUDIT.md](./NEXTJS-MIGRATION-PHASE8-AUDIT.md). Defined at explicit user request to cover four domains Phases 6–7 surfaced as having no assigned phase number. Resolves two earlier open questions: `esti_repo_source`/Knowledge Bank Portal is live (not dead code, Phase 6/7 audits corrected), and `esti_attendance` exists (unblocks Phase 5's ASPRF reliability KPI). Reopens a Phase 2 decision: HR's `teamMembers` table is separate from `profiles`, contradicting Phase 2's live choice to FK `tasks.assignee_id` straight to `profiles` — needs a decision before `tasks` needs a breaking migration. Notes CPI's `generateReport` is blocked on Phase 7's unresolved AI-provider question. Whoever owns this roadmap should decide whether to adopt this phase as written, renumber it, or merge it elsewhere — not yet adopted. |

**Known gotcha (documented in `web/next.config.ts`):** Next 16's default
Turbopack can't resolve `@carbon/styles`' internal Sass `@use` imports
through pnpm's symlinked `node_modules` — `web/package.json`'s dev/build
scripts force `--webpack` until that's fixed upstream.

**Tenancy decided (2026-09-04): single-tenant per deployment** — no `org_id`
anywhere, RLS scoped by `auth.uid()` + role only.

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

**Cloud-agent assignment:** Phase 3 implementation, following the landing
order [NEXTJS-MIGRATION-PHASE3-AUDIT.md](./NEXTJS-MIGRATION-PHASE3-AUDIT.md)
suggests (numbering → shared business logic → proposals → letters/contracts →
invoices) — branch as `cloud-agent/phase3-<slug>` off a freshly-pulled `main`
and follow [CLOUD-AGENT-WORKFLOW.md](./CLOUD-AGENT-WORKFLOW.md) exactly
(branch naming, do/don't, self-verification, handoff — local verifies and
merges, cloud-agent does not merge to `main`). Resolve the two open decisions
the audit flags (purchase orders in/out of scope, PDF-render enqueueing now
vs. Phase 6) before starting, not during.

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
- **Stack migration spec?** See [NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md) · [Phase 2 audit](./NEXTJS-MIGRATION-PHASE2-AUDIT.md) · [Phase 3 audit](./NEXTJS-MIGRATION-PHASE3-AUDIT.md) · [Phase 4 audit](./NEXTJS-MIGRATION-PHASE4-AUDIT.md) · [Phase 5 audit](./NEXTJS-MIGRATION-PHASE5-AUDIT.md) · [Phase 6 audit](./NEXTJS-MIGRATION-PHASE6-AUDIT.md) · [Phase 7 audit](./NEXTJS-MIGRATION-PHASE7-AUDIT.md) · [Phase 8 audit (proposed, not adopted)](./NEXTJS-MIGRATION-PHASE8-AUDIT.md)
- **Cloud-agent branch/workflow rules?** See [CLOUD-AGENT-WORKFLOW.md](./CLOUD-AGENT-WORKFLOW.md)
- **Engineering / local-dev status?** See [ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md)
- **Market fit / GTM?** See [MARKET-FIT.md](./MARKET-FIT.md)

---

**Last updated:** 2026-09-04  
**Companion doc:** [ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md)
