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
| **S8** | Reopen apex `/login` — real sign-in + firm-portal demos | 🔲 |
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
