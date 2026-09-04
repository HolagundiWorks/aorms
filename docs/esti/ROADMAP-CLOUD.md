# AORMS Cloud Roadmap (aorms.in / production)

**Status:** ACTIVE — soft launch (landing + blog live); Next.js/Supabase stack
migration planned  
**Updated:** 2026-09-04  
**Scope:** What ships to the **production VPS** (`aorms.in`) and when — deployment
status, feature rollout to the live office hub, and cloud infrastructure. This
is also where **primary feature development happens** — on the `cloud-agent`
branch, in cloud (hosted agent) sessions, merging up to `main`. For the local
test/verify loop that checks this work, see [ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md)
and [`../../CLAUDE.md`](../../CLAUDE.md) § Branch & environment split.

---

## Stack migration — Next.js + Supabase (planned)

Full spec: [NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md).

**Target:** Next.js + TypeScript + Carbon Design System + Supabase, replacing
the current React SPA + tRPC + Fastify + raw PostgreSQL + Python worker stack.
Deployment target moves from the VPS (`compose.prod.yaml`) to Hostinger
Managed App Hosting; Supabase replaces self-hosted PostgreSQL/auth/storage.

| Item | Status |
| --- | --- |
| Target-architecture spec written | ✅ [NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md) |
| Repo audit (map current tRPC procedures / Fastify routes / components to Next.js equivalents — see spec § 36–37) | 🔲 |
| Phase 1 — Foundation (Next.js + TS + Carbon + Supabase + auth + app shell) | 🔲 |
| Phase 2 — Core ERP (orgs, users, roles, clients, projects, tasks) | 🔲 |
| Phase 3 — Commercial (proposals, quotations, contracts, invoices, payments) | 🔲 |
| Phase 4 — Technical (estimation, BOQ, measurements, documents, drawings) | 🔲 |
| Phase 5 — Reporting (dashboards, reports, exports, analytics) | 🔲 |
| Phase 6 — Advanced processing (PDF/DWG, Python worker) | 🔲 |
| Phase 7 — Optional AI | 🔲 |

**Where this happens:** `cloud-agent` branch, cloud sessions. **Do not** start
this migration from a local session — pull `cloud-agent` to see current
progress, and use local sessions to test/verify what lands, per
[`../../CLAUDE.md`](../../CLAUDE.md) § Branch & environment split. The current
production stack (tRPC/Fastify/VPS) stays live and unchanged until a phase
above is actually merged and verified — nothing on this list is implemented yet.

---

## Current phase — soft launch

Per [`../../CLAUDE.md`](../../CLAUDE.md) § Launch status and
[PRODUCTION-OPS.md](./PRODUCTION-OPS.md) § Soft launch:

| Surface | Status |
| --- | --- |
| `/` · `/blog` (landing pages) | ✅ **Live** |
| `/login`, `/access`, `/signup`, `/account` (office hub SPA) | 🔲 Coming soon (`VITE_MARKETING_ONLY` gate) |
| `/downloads` | ✅ Redirects to `/login` (web-only, no installers) |
| `/wiki*` | ✅ Redirects home (no wiki surfaces) |

**Gate:** `VITE_MARKETING_ONLY` (default **true** on public builds) —
`frontend/src/lib/marketing-gate.ts`.

**Next milestone — S8:** reopen apex `/login` for real sign-in and firm-portal
demos, once firm-portal tabs are honest (see PRODUCTION-OPS.md § S8).

**Codebase-side prerequisite: verified met (2026-09-04).** The "honest tabs"
requirement is fully implemented — `visibleFirmPortalSections()`
(`frontend/src/components/portal/FirmPortalSections.ts`) hides any firm-portal
chrome tab whose `panels` key isn't wired, and all four portals (Client,
Contractor, Collaborator, Site) pass a `panels` object matching their
documented capability list (no Alert stubs, no unwired tabs). This was already
covered by `visibleFirmPortalSections.test.ts`; the marketing-gate switch
itself (`isMarketingOnly()` / `isMarketingAuthPath()`, the exact toggle S8
flips) previously had **no** test coverage — added in
`frontend/src/lib/marketing-gate.test.ts` (20 cases: default-on behavior,
every truthy/falsy env value, and the gated-path matcher). Both suites pass;
`tsc` is unchanged at its 16 pre-existing, unrelated JSX errors.

What remains for S8 is **ops only**, not code: flip `VITE_MARKETING_ONLY=false`
on the VPS per PRODUCTION-OPS.md § S8 (`s8-reopen-demos.sh` / the
`s8-reopen-demos.yml` GitHub Action) — this session has no VPS/deploy
credentials, so that step is left to an operator.

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
| `worker` `pytest` | ⬜ not verified — no Python interpreter on the machine that ran this pass |

**Still open:**

- `pnpm audit --audit-level=high` findings from the 2026-09-04 audit pass are
  **not yet addressed**: `pdfjs-dist` (pinned `6.1.200`, arbitrary JS
  execution on a malicious PDF — worth prioritizing given how PDF-heavy this
  app is), a `fast-uri` transitive advisory needing the existing
  `pnpm.overrides` pin bumped (not re-added), plus lower-urgency dev-tooling-only
  findings in `browserslist`/`nanoid`.
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
| CI (`esti-ci` — TypeScript, lint, test, build, audit, visual regression, Python worker) | 🚧 Install step fixed (on `cloud-agent`, not yet `main`); typecheck + audit still red — see § CI / build health |

Deploy references: [VPS-INSTALL.md](./VPS-INSTALL.md) ·
[PRODUCTION-OPS.md](./PRODUCTION-OPS.md) · [`../../deploy/README.md`](../../deploy/README.md).

---

## Office hub feature rollout (cloud-facing)

Status reflects what a signed-in user reaches on `aorms.in` once S8 reopens
`/login` — not local-dev code completeness (see ROADMAP-LOCAL.md for that).

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

### EOMS Knowledge API 🔲
- External knowledge store integration
- Search + filtering
- Trending + recommendations
- Connected to office hub

---

## Q4 2026 milestones (cloud)

| Week | Milestone | Status |
|------|-----------|--------|
| **This week** | Landing + blog soft launch stays green; legacy docs archived | ✅ |
| **This week** | Restore CI's ability to run (`pnpm install` fix merged to `main`) | 🚧 fixed on `cloud-agent`, not yet on `main` |
| **This week** | Clear `pnpm typecheck` red (16 JSX errors) and `pnpm audit --audit-level=high` findings | 🔲 |
| **S8** | Reopen apex `/login` — real sign-in + firm-portal demos | 🔲 (codebase prerequisite met — ops-only step remains) |
| **EOQ** | Office hub v2.0 live on Carbon Design System · SSO + ESTI AI ready | 🔲 |

Engineering work that gates these milestones (codebase cleanup, Carbon
migration waves) is tracked in [ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md) —
this file tracks only what's actually live for users.

---

## Q1 2027+ roadmap (cloud)

### Q1 2027
- ESTI AI agent fully live on the office hub
- EOMS knowledge bank live
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
- **Stack migration spec?** See [NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md)
- **Engineering / local-dev status?** See [ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md)
- **Market fit / GTM?** See [MARKET-FIT.md](./MARKET-FIT.md)

---

**Last updated:** 2026-09-04  
**Companion doc:** [ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md)
