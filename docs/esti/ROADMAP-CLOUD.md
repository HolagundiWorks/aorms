# AORMS Cloud Roadmap (aorms.in / production)

**Status:** ACTIVE — soft launch (landing + blog live)  
**Updated:** 2026-09-04  
**Scope:** What ships to the **production VPS** (`aorms.in`) and when — deployment
status, feature rollout to the live office hub, and cloud infrastructure. For
codebase work happening in local dev before it ships here, see
[ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md).

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
- **Engineering / local-dev status?** See [ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md)
- **Market fit / GTM?** See [MARKET-FIT.md](./MARKET-FIT.md)

---

**Last updated:** 2026-09-04  
**Companion doc:** [ROADMAP-LOCAL.md](./ROADMAP-LOCAL.md)
