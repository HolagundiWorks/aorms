# AORMS — Office Management System

**Version:** 2.0 (web-only office system)  
**Date:** 2026-09-04  
**Status:** Active | Pivot from suite architecture to unified office hub

---

## Overview

**AORMS** is a cloud-based **office management system** for **AEC firms and consultancies**.  
A single unified web application (SPA) for managing:
- **Clients** — CRM, interactions, contacts
- **Projects** — tracking, phases, milestones, status
- **Proposals & Contracts** — creation, approval, versioning
- **Invoicing** — billing, GST compliance, reconciliation
- **Team & Payroll** — roster, assignments, leaves, payroll
- **Knowledge Bank** — specifications, standards, compliance library
- **Finance** — cash book, expenses, financial reports, reconciliation
- **Delivery** — site supervision, snags, inspections, progress reports

**Built-in AI:**
- **ESTI** — Office automation agent; recommendations, insights, task automation
- **EOMS** — External knowledge bank API (connected to hub)

---

## Architecture

**Technology stack:**
- **Frontend:** React 19 + Vite (SPA) + IBM Carbon Design System
- **Backend:** Fastify + tRPC + Drizzle ORM
- **Database:** PostgreSQL (VPS deployment)
- **Python Worker:** Redis Streams consumer (PDF rendering, DXF conversion, reconciliation)
- **Deployment:** Cloud VPS only (no local-first, no desktop apps)

**Code structure:**
- Monorepo (pnpm): `packages/contracts` · `backend/` · `frontend/` · `worker/`
- Single-sign-on → office hub (federated identity if configured)
- Web-only SPA; no desktop apps, no installers, no local-first architecture

---

## Features by Domain

### Office Core
- **Dashboard** — KPIs, action center, notifications, health modules
- **Clients** — CRM; interaction log; lead capture; tender issuance
- **Projects** — phase-driven workflow; estimation; delivery; moodboards
- **Tasks** — billable/non-billable; ASPRF scoring; time attribution
- **Approvals** — internal workflows; decisions; revisions (MINOR/MAJOR/CRITICAL)

### Financial
- **Proposals** — unified (COA fee + scope agreements)
- **Invoicing** — GST billing; line items; reconciliation; payment tracking
- **Reconciliation** — bank/26AS/AIS/GSTR matching (via Python worker)
- **Cash Book** — office cash management; expense tracking
- **Reports** — GST/TDS filing abstracts

### Delivery & Supervision
- **BBS** — bar bending schedules (IS 456 cutting lengths)
- **Steel Reconciliation** — scheduled vs issued vs consumed kg tracking
- **Running Bills** — project RA bills with advances/deductions
- **Snags** — site issues; tracking; resolution
- **Inspections** — site inspection PDF reports
- **Progress Reports** — project status + photos

### Knowledge & Library
- **Specifications** — material catalog; finishes; makes; specs
- **Compliance** — NBC, FAR, setbacks, fire, regulatory rules
- **Standards** — design standards by discipline
- **Master Plans** — PDF/DWG file library
- **Lessons Learned** — project retrospectives; NC/CAPA

### Team & HR
- **Roster** — staff directory; roles; specializations
- **Assignments** — project staff allocation; workload
- **Leaves** — leave management; balances; approvals
- **Payroll** — payslips; salary processing
- **ASPRF** — 30-day composite performance scoring (reliability, quality, impact, collaboration, learning, wellbeing)
- **Attendance** — daily attendance; time attribution

---

## Data Model (Simplified)

```sql
-- Core
users
  id, email, role, firm, active
  permissions (can / capability)

firms
  id, name, config, settings

clients
  id, name, type (firm/consultant), contact, status

projects
  id, client, name, status, phases
  brief, precon (R&O)

tasks
  id, project, title, classification (billable/non-billable)
  work_type (design/technical/construction), hours, asprf_score

-- Financial
proposals
  id, project, type (fee/scope), amount, status, approval_gate

invoices
  id, project, amount, gst, status, payment_date
  line_items (service/product, qty, rate, tax)

-- Delivery
bbs
  id, project, bar_diameter, quantity, cutting_length, shape_code

steel_reconciliation
  id, project, diameter, scheduled_kg, issued_kg, consumed_kg

running_bills
  id, project, ra_number, amount, advances, deductions, status

-- Knowledge
specifications
  id, category, item, make, spec, finish, cost_per_unit

standards
  id, discipline, name, description, file_id
```

---

## Authentication & Access

**SSO only:**
- Office hub accessed via federated identity (OAuth2, SAML, or built-in)
- No desktop login, no per-app login
- All users have a single identity + role-based permissions

**Role-based access:**
- Permissions defined in `packages/contracts/src/permissions.ts`
- Capabilities: `clients:view`, `projects:create`, `invoices:approve`, `team:manage`, `admin:full`
- Per-domain row-level security (users see only their firm's data)

---

## AI Agent (ESTI)

**Built-in office automation:**
- **Recommendations** — task prioritization, overdue alerts, client follow-ups
- **Insights** — project health, team workload, financial dashboard
- **Task automation** — email drafts, report generation, reminder creation
- **Document generation** — proposals, invoices, specifications (via Python worker)

**Local-only inference:**
- Runs on office hub (no external AI calls unless configured)
- Ollama/Foundry Local for on-premises LLM
- Prompts + SDK in `@hcw/aorms-ai-kit`

---

## Knowledge Bank API (EOMS)

**External knowledge store:**
- Specifications, standards, compliance rules, lessons learned
- Accessed from office hub via REST API
- Supports search, filter, trending, recommendations

---

## Deployment

**VPS deployment (cloud-only):**
- Ubuntu 22.04 LTS
- Docker Compose (application stack)
- PostgreSQL (managed or self-hosted)
- Reverse proxy (Nginx)
- SSL/TLS (Let's Encrypt)

**No local installations:**
- Web browser → office hub SPA
- No desktop installer, no Tauri shell, no Windows setup

**CI/CD:**
- GitHub Actions → build + test + deploy
- Staging VPS for QA
- Production VPS for live

---

## Development

**Local setup:**
```bash
# Monorepo
pnpm install
pnpm run dev   # Frontend + backend + worker

# Compose stack
docker compose up
# App at http://localhost:5173
# Backend at http://localhost:3000
# PostgreSQL at localhost:5432
```

**Testing:**
- Unit tests: `backend/`, `frontend/`
- E2E tests: Playwright (`e2e/tests/`)
- Visual regression: Carbon Design System baseline snapshots

---

## Removed (Legacy)

❌ **Allied consultancy apps:**
- AStudio (architecture practice manager)
- AConsulting (engineering practice manager)
- AProc / AQC PM (project management technical)
- AQC Estimation / BBS (separate repos)
- ADraft / ShilpiDB (drafting / geometry)

❌ **Desktop components:**
- AORMS Connect (desktop launcher)
- Tauri shell
- Windows installer
- Local-first architecture
- License manager

❌ **Architecture:**
- Suite of separate apps
- Per-app login
- Desktop + web parity

---

## Roadmap

**Q4 2026:**
- ✅ Wave 3 (app MUI → Carbon Design System)
- ✅ Wave 4 (icon swap: MUI → Carbon icons)
- ✅ Wave 5 (landing + marketing pages → Carbon)
- ✅ Wave 6 (decommission MUI + HCW kit)

**Q1 2027:**
- Office hub v2.0 (Carbon Design System live)
- ESTI AI agent (local inference integration)
- EOMS knowledge bank (live)
- SSO + federated identity setup

**Q2+ 2027:**
- Advanced reporting (BI dashboards)
- Mobile app (if needed; web-responsive primary)
- Integrations (Shopify, QuickBooks, etc.)
- Multi-language support

---

## Contact & Support

**Documentation:**
- [Architecture](./ARCHITECTURE.md)
- [Carbon Migration](./CARBON-MIGRATION.md)
- [Roadmap](./ROADMAP.md)
- [Production Ops](./PRODUCTION-OPS.md)

**Code:**
- GitHub: `HolagundiWorks/aorms` (this repo)
- Issues: Use GitHub Issues for bugs + features
- Discussions: GitHub Discussions for Q&A

---

**Last updated:** 2026-09-04  
**Status:** Active | Pivot complete
