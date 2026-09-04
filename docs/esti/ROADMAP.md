# AORMS Office Management System — Roadmap

**Status:** ACTIVE | Web-only office hub (no allied apps)  
**Updated:** 2026-09-04 (MAJOR PIVOT: office system only)  
**Platform:** React + Carbon Design System + Fastify backend + PostgreSQL

---

## Current Phase

**🚧 Phase 0: Infrastructure & Foundation (Sept 2026)**
- ✅ **Strategy locked** — office management system only (no AStudio, AConsulting, AProc, ADraft, ShilpiDB)
- ✅ **CLAUDE.md updated** — product definition changed to office hub
- ✅ **Legacy docs archived** — 46+ old documents removed
- 🚧 **Carbon Design System migration** — Wave 2 complete, Wave 3 launching Week 2
- 🚧 **Codebase cleanup** — Remove 77+ allied app references, delete `desktop/` directory

---

## Active Workstreams

### 1. **Cleanup & Migration (Weeks 1–2)**

**Phase 1: Codebase Cleanup**
- [x] Remove allied app constant references from frontend (`AStudio`, `AConsulting`, `AProc`, `ADraft`, `ShilpiDB`, `AORMS_CONNECT` — 0 remaining, verified by grep)
- [ ] Delete `desktop/` directory (Tauri shell still present — `desktop/src-tauri/`, `desktop/AStudio.Shell/`)
- [x] Remove installer/setup logic (`frontend/src/lib/desktop-installers.ts` deleted)
- [ ] Remove desktop native bridge (`frontend/src/lib/desktopNativeBridge.ts` still present)
- [x] Fix UTF-8 smart-quote corruption in `landing-seo.ts` (was breaking `tsc`)
- [~] tsc + eslint + vite build — down to 16 pre-existing JSX errors in `Landing.tsx` / `DashboardTab.tsx` (unrelated to this cleanup, not yet fixed)

**Phase 2: Landing Pages & Marketing** ✅
- [x] Update `Landing.tsx` — office hub benefits (clients, projects, proposals, invoicing, team, KB, delivery)
- [x] Remove allied app CTAs + feature cards
- [x] `/downloads` redirects to `/login` (web-only, no installers)
- [x] Update blog, footer, nav, meta tags, auth pages (Login, ComingSoonAuth, AccountHub, RequestPlan)

**Phase 3: Documentation** ✅
- [x] Create `AORMS-OFFICE-SYSTEM.md` (done ✅)
- [x] Archive obsolete docs (SUITE, CONNECT, LOCAL-FIRST, PLATFORM-NOMENCLATURE-suite-v1, etc.)
- [x] Create fresh roadmap (this file)
- [x] Update navigation (`NAVIGATION.md` rewritten for unified single nav tree)
- [ ] Update `ARCHITECTURE.md`, `PRODUCTION-OPS.md`, `MARKET-FIT.md` (in progress)

**Phase 4: Configuration & Backend**
- [ ] Remove installer env vars + build targets
- [ ] Remove Tauri dependencies from `package.json`
- [ ] Remove allied app API endpoints + tRPC namespaces
- [ ] Update contracts/types (remove allied app constants)

**Effort:** 2–3 days (all phases)

---

### 2. **Carbon Design System Migration (Weeks 2–8)**

[Detailed plan: CARBON-MIGRATION-WAVE3-PLAN.md](./CARBON-MIGRATION-WAVE3-PLAN.md)

**Wave 3: App MUI → Carbon (4–6 weeks)**
- ✅ Wave 2 adapters complete (StatusDot, DataState, ConfirmModal, PageBreadcrumb, ToastHost — 784 call-sites unblocked)
- 🚧 Wave 3 kick-off: Week 2 (8 tranches, P1–P9)
  - **P1:** Shared leaves (60 files) — Weeks 2–3
  - **P2:** DataTables (15 files) — Weeks 2–3 (parallel)
  - **P3:** Forms (20 files) — Week 3
  - **P4–6:** Routes (65 files) — Weeks 3–4 (parallel)
  - **P7:** Layouts (15 files, RailLayout critical) — Week 5 + full QA
  - **P8:** Portals (12 files) — Week 5
  - **P9:** Overlays (27 files, deferred) — Post-Wave-3 spike

**Wave 4: Icon swap (1 week, parallel to Wave 3 P7–P9)**
- MUI icons → Carbon icons (93 files)

**Wave 5: Landing & marketing (2 weeks, parallel)**
- Rebuild editorial system (`landing.scss`)
- Unauthenticated pages → Carbon

**Wave 6: Decommission (1 week)**
- Remove MUI + HCW-UI-Kit
- Update docs + AI wiki index

**Exit criteria per wave:** tsc + eslint green, visual baselines re-captured

---

## Office Hub Features (In-Flight & Planned)

### **Clients & Projects** ✅
- [ ] Client CRM (interactions, leads, tenders)
- [ ] Project tracking (phases, tasks, milestones)
- [ ] Project moodboards + mood asset management

### **Proposals & Contracts** ✅
- [ ] Unified proposals (COA fee + scope agreements)
- [ ] Version control + client approval gates
- [ ] Digital signatures (DocuSign integration)

### **Invoicing & Finance** ✅
- [ ] GST-compliant invoicing
- [ ] Reconciliation (bank, 26AS, AIS, GSTR via Python worker)
- [ ] Cash book + expense tracking
- [ ] Financial reports + filing abstracts (GST/TDS)

### **Delivery & Supervision** ✅
- [ ] BBS (bar bending schedules) — IS 456 cutting lengths
- [ ] Steel reconciliation (scheduled vs issued vs consumed kg)
- [ ] Running bills (project RA bills with advances/deductions)
- [ ] Site supervision (snags, inspections, progress reports)

### **Team & HR** ✅
- [ ] Team roster + assignments
- [ ] Leaves + payroll management
- [ ] ASPRF composite scoring (reliability, quality, impact, collaboration, learning, wellbeing)
- [ ] Attendance + time attribution

### **Knowledge Bank** ✅
- [ ] Specification catalog (materials, finishes, makes)
- [ ] Compliance library (NBC, FAR, setbacks, fire, regulatory)
- [ ] Design standards by discipline + attached files
- [ ] Master plan file library (PDF/DWG)
- [ ] Lessons learned + NC/CAPA tracking

### **ESTI AI Agent** 🚧
- [ ] Built-in office automation (local inference: Ollama/Foundry)
- [ ] Task recommendations + priority
- [ ] Project health insights
- [ ] Document generation (proposals, invoices, specs)
- [ ] Email draft automation
- [ ] Reminder creation

### **EOMS Knowledge API** 🔲
- [ ] External knowledge store integration
- [ ] Search + filtering
- [ ] Trending + recommendations
- [ ] Connected to office hub

---

## Technical Debt & Polish

### **Design System** 🚧
- Carbon Design System migration (Waves 3–6, parallel)
- Visual regression testing baseline updates
- Accessibility validation (keyboard nav, focus, COGA)

### **Performance** 🔲
- Code splitting optimization
- Bundle size reduction (removing MUI)
- Caching strategy for office data

### **Testing** 🔲
- E2E test coverage (Playwright)
- Unit test coverage (backend, frontend)
- Visual regression baseline (after Carbon migration)

### **Infrastructure** ✅
- Docker Compose stack (`compose.yaml`, `compose.prod.yaml`)
- VPS deployment (`deploy/*.sh`)
- PostgreSQL + Redis Streams (Python worker)
- SSL/TLS + Nginx reverse proxy

---

## Q4 2026 Milestones

| Week | Milestone | Status |
|------|-----------|--------|
| **This week** | Legacy docs archived · cleanup plan + roadmap ready | ✅ |
| **Week 2** | Phase 1–2 cleanup complete · Carbon Wave 3 P1/P2 kick-off | 🚧 |
| **Week 3** | Phase 3–4 cleanup complete · Carbon Wave 3 P3–P6 in parallel | 🔲 |
| **Week 4** | Phase 5 (backend) complete · Carbon Wave 3 routes complete | 🔲 |
| **Week 5** | Carbon Wave 3 P7 RailLayout (critical QA) + P8 portals | 🔲 |
| **Week 6** | Carbon Wave 4 icons (parallel) · Wave 3 exit criteria met | 🔲 |
| **Week 7–8** | Carbon Wave 5 landing + Wave 6 decommission | 🔲 |
| **EOQ** | Office hub v2.0 live on Carbon · SSO + ESTI AI ready | 🔲 |

---

## Q1 2027+ Roadmap

### **Q1 2027**
- ✅ ESTI AI agent integration (local inference)
- ✅ EOMS knowledge bank live
- ✅ SSO + federated identity
- ✅ Office hub fully responsive mobile

### **Q2 2027+**
- Advanced BI dashboards + reporting
- Integrations (Shopify, QuickBooks, DocuSign, etc.)
- Multi-language support (Hindi + regional)
- Mobile app (if needed; web-responsive primary)
- Performance optimizations + caching

---

## Documentation Structure

**Active Canon:**
- [`CLAUDE.md`](../../CLAUDE.md) — Agent instructions (office system)
- [`AORMS-OFFICE-SYSTEM.md`](./AORMS-OFFICE-SYSTEM.md) — Product overview + architecture
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Technical architecture (backend, frontend, worker)
- [`PRODUCTION-OPS.md`](./PRODUCTION-OPS.md) — VPS deployment + operations
- [`CARBON-MIGRATION.md`](./CARBON-MIGRATION.md) — Full Carbon design system roadmap
- [`CARBON-MIGRATION-WAVE3-PLAN.md`](./CARBON-MIGRATION-WAVE3-PLAN.md) — Wave 3 execution (8 tranches)
- [`CARBON-PHASE1-STATUS.md`](./CARBON-PHASE1-STATUS.md) — Current readiness status
- [`OFFICE-SYSTEM-CLEANUP-PLAN.md`](./OFFICE-SYSTEM-CLEANUP-PLAN.md) — 6-phase cleanup (2–3 days)
- [`NAVIGATION.md`](./NAVIGATION.md) — Canonical sidebar IA
- [`AORMS-OFFICE-SYSTEM.md`](./AORMS-OFFICE-SYSTEM.md) — Office hub features + data model

**Archived (legacy):**
- `docs/esti/archived/` — 46+ documents (AORMS-SUITE, AORMS-CONNECT, LOCAL-FIRST, APROC, DESKTOP, etc.)

---

## Getting Started

**Week 1 (Starting now):**

1. **Code cleanup** (Phase 1)
   ```bash
   # Remove allied app references
   grep -r "AStudio\|AConsulting\|AProc\|ADraft\|ShilpiDB" frontend/src --include="*.ts" --include="*.tsx" -l
   
   # Delete desktop directory
   rm -rf desktop/
   
   # Run cleanup checklist
   # → See OFFICE-SYSTEM-CLEANUP-PLAN.md Phase 1
   ```

2. **Landing pages** (Phase 2)
   - Update `Landing.tsx` — office hub focus
   - Remove allied app CTAs
   - Test locally: `npm run dev`

3. **Documentation** (Phase 3)
   - Review `AORMS-OFFICE-SYSTEM.md` (new canon)
   - Update team on changes
   - Archive links in guides

4. **CI verification** (Phase 4–5)
   - `tsc --noEmit` ✅ green
   - `eslint` ✅ green
   - `vite build` ✅ succeeds

---

## Support & Questions

- **Cleanup questions?** See [OFFICE-SYSTEM-CLEANUP-PLAN.md](./OFFICE-SYSTEM-CLEANUP-PLAN.md)
- **Carbon migration?** See [CARBON-MIGRATION-WAVE3-PLAN.md](./CARBON-MIGRATION-WAVE3-PLAN.md)
- **Architecture questions?** See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Deployment?** See [PRODUCTION-OPS.md](./PRODUCTION-OPS.md)

---

**Last updated:** 2026-09-04  
**Prepared by:** Claude Haiku 4.5  
**Status:** Ready for implementation
