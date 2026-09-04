# AORMS Local Development Roadmap

**Status:** ACTIVE — local test/verify loop  
**Updated:** 2026-09-04  
**Scope:** Work done in the **local dev environment** (Podman/Docker compose
stack, this machine, `main` branch) — primarily **testing and verification**
of what the cloud branch (`cloud-agent`) builds: running the stack, typecheck/
lint/unit/e2e tests, manual verification, bug fixes found while testing. See
[`../../CLAUDE.md`](../../CLAUDE.md) § Branch & environment split for the full
policy, and [ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md) for where **primary feature
development** (including the [Next.js/Supabase migration](./NEXTJS-SUPABASE-MIGRATION.md))
now happens. The phase history below (Sept 2026 web-only pivot cleanup, Carbon
migration) predates this split and stays as a record of local-dev work already
done; new net-new feature work should start on `cloud-agent`, not here.

**Platform (current, live):** React + Carbon Design System + Fastify backend +
PostgreSQL. (Target platform for new development is Next.js + Supabase — see
[NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md); this local
environment keeps testing the current stack until that migration lands.)

---

## Local dev environment

Podman/Docker compose stack (`compose.yaml`) — see
[`../../DEVELOPMENT.md`](../../DEVELOPMENT.md) for setup and
[`../../CLAUDE.md`](../../CLAUDE.md) § Dev / verify loop for the day-to-day
commands (container restarts, typecheck/lint, migrations).

```bash
cp .env.example .env
podman compose up -d --build
# SPA      → http://localhost:5173
# Backend  → http://localhost:4000/health  ·  tRPC at /trpc
# MinIO    → http://localhost:9001 (console)
```

---

## Local test/verify loop (2026-09)

The day-to-day job here is now **testing**, not authoring new features:

1. `git fetch --all && git pull` on `main`; pull `cloud-agent` too when asked
   to verify unmerged cloud work.
2. Bring up the stack (above), run the app, click through the area under test.
3. `tsc --noEmit`, `eslint`, unit tests (`vitest`, `pytest` in `worker/`), and
   Playwright/e2e where they exist — see [`../../CLAUDE.md`](../../CLAUDE.md)
   § Dev / verify loop for exact commands.
4. Fix bugs found while testing directly; for larger feature gaps, note them
   for the `cloud-agent` branch rather than building them out here.
5. Once the Next.js/Supabase migration ([spec](./NEXTJS-SUPABASE-MIGRATION.md))
   starts landing on `cloud-agent`, this loop extends to testing that stack
   too (Next.js dev server, Supabase local/staging project) alongside the
   current one — updated here once that phase actually starts.

---

## Current phase — office system pivot cleanup

**🚧 Codebase cleanup (Sept 2026)** — full plan:
[OFFICE-SYSTEM-CLEANUP-PLAN.md](./OFFICE-SYSTEM-CLEANUP-PLAN.md)

- ✅ **Strategy locked** — office management system only (no AStudio, AConsulting, AProc, ADraft, ShilpiDB)
- ✅ **CLAUDE.md updated** — product definition changed to office hub
- ✅ **Legacy docs archived** — `docs/esti/archived/`
- 🚧 **Carbon Design System migration** — Wave 2 complete, Wave 3 launching
- 🚧 **Codebase cleanup** — allied-app references removed from frontend; `desktop/` directory removal still pending

### Phase 1: Codebase Cleanup
- [x] Remove allied app constant references from frontend (`AStudio`, `AConsulting`, `AProc`, `ADraft`, `ShilpiDB`, `AORMS_CONNECT` — 0 remaining, verified by grep)
- [ ] Delete `desktop/` directory (Tauri shell still present — `desktop/src-tauri/`, `desktop/AStudio.Shell/`)
- [x] Remove installer/setup logic (`frontend/src/lib/desktop-installers.ts` deleted)
- [ ] Remove desktop native bridge (`frontend/src/lib/desktopNativeBridge.ts` still present)
- [x] Fix UTF-8 smart-quote corruption in `landing-seo.ts` (was breaking `tsc`)
- [~] tsc + eslint + vite build — down to 16 pre-existing JSX errors in `Landing.tsx` / `DashboardTab.tsx` (unrelated to this cleanup, not yet fixed)

### Phase 2: Landing Pages & Marketing ✅
- [x] Update `Landing.tsx` — office hub benefits (clients, projects, proposals, invoicing, team, KB, delivery)
- [x] Remove allied app CTAs + feature cards
- [x] `/downloads` redirects to `/login` (web-only, no installers)
- [x] Update blog, footer, nav, meta tags, auth pages (Login, ComingSoonAuth, AccountHub, RequestPlan)

### Phase 3: Documentation ✅
- [x] Create `AORMS-OFFICE-SYSTEM.md`
- [x] Archive obsolete docs (SUITE, CONNECT, LOCAL-FIRST, PLATFORM-NOMENCLATURE-suite-v1, DEVELOPMENT-SPEC, WEB-PORTAL, FIGMA-TOKEN-SYNC, repo-scaffolds, LANDING-REDESIGN-CONTEXT)
- [x] Split roadmap into cloud (this doc's companion) and local-dev (this doc)
- [x] Update navigation (`NAVIGATION.md` rewritten for unified single nav tree)
- [x] Update `ARCHITECTURE.md`, `PRODUCTION-OPS.md`, `MARKET-FIT.md`

### Phase 4: Configuration & Backend
- [ ] Remove installer env vars + build targets
- [ ] Remove Tauri dependencies from `package.json`
- [ ] Remove allied app API endpoints + tRPC namespaces
- [ ] Update contracts/types (remove allied app constants)

**Effort:** 2–3 days (all phases)

---

## Carbon Design System Migration (dev-side execution)

[Detailed plan: CARBON-MIGRATION-WAVE3-PLAN.md](./CARBON-MIGRATION-WAVE3-PLAN.md)

**Wave 3: App MUI → Carbon (4–6 weeks)**
- ✅ Wave 2 adapters complete (StatusDot, DataState, ConfirmModal, PageBreadcrumb, ToastHost — 784 call-sites unblocked)
- 🚧 Wave 3 kick-off (8 tranches, P1–P9)
  - **P1:** Shared leaves (60 files)
  - **P2:** DataTables (15 files) — parallel with P1
  - **P3:** Forms (20 files)
  - **P4–6:** Routes (65 files) — parallel
  - **P7:** Layouts (15 files, RailLayout critical) — full QA
  - **P8:** Portals (12 files)
  - **P9:** Overlays (27 files, deferred) — post-Wave-3 spike

**Wave 4: Icon swap (1 week, parallel to Wave 3 P7–P9)**
- MUI icons → Carbon icons (93 files)

**Wave 5: Landing & marketing (2 weeks, parallel)**
- Rebuild editorial system (`landing.scss`)
- Unauthenticated pages → Carbon

**Wave 6: Decommission (1 week)**
- Remove MUI + HCW-UI-Kit
- Update docs (`HCW-UI-KIT.md` marked superseded) + AI wiki index

**Exit criteria per wave:** `tsc` + `eslint` green locally, visual baselines
re-captured (Playwright).

---

## Technical debt & polish (dev-side)

### Design System 🚧
- Carbon Design System migration (Waves 3–6, parallel)
- Visual regression testing baseline updates
- Accessibility validation (keyboard nav, focus, COGA)

### Performance 🔲
- Code splitting optimization
- Bundle size reduction (removing MUI)
- Caching strategy for office data

### Testing 🔲
- E2E test coverage (Playwright)
- Unit test coverage (backend, frontend)
- Visual regression baseline (after Carbon migration)

---

## Getting started (local)

1. **Code cleanup** (Phase 1)
   ```bash
   # Find remaining allied-app references
   grep -r "AStudio\|AConsulting\|AProc\|ADraft\|ShilpiDB" frontend/src --include="*.ts" --include="*.tsx" -l

   # Remove the legacy desktop/ directory (still pending)
   rm -rf desktop/

   # See OFFICE-SYSTEM-CLEANUP-PLAN.md Phase 1 for the full checklist
   ```

2. **Landing pages** (Phase 2 — done, verify locally)
   ```bash
   npm run dev   # or: podman compose up -d --build
   ```

3. **Documentation** (Phase 3 — done)
   - `AORMS-OFFICE-SYSTEM.md` is the canonical product doc
   - `docs/esti/archived/` holds superseded specs

4. **CI verification** (local, before pushing)
   - `tsc --noEmit` — currently 16 pre-existing JSX errors in `Landing.tsx` / `DashboardTab.tsx`, unrelated to the pivot cleanup
   - `eslint` ✅ green
   - `vite build` — blocked on the same 16 `tsc` errors above

---

## Documentation structure

**Active canon (edit here):**
- [`../../CLAUDE.md`](../../CLAUDE.md) — agent instructions (office system)
- [AORMS-OFFICE-SYSTEM.md](./AORMS-OFFICE-SYSTEM.md) — product overview + architecture
- [ARCHITECTURE.md](./ARCHITECTURE.md) — technical architecture (backend, frontend, worker)
- [CARBON-MIGRATION.md](./CARBON-MIGRATION.md) — full Carbon design system roadmap
- [CARBON-MIGRATION-WAVE3-PLAN.md](./CARBON-MIGRATION-WAVE3-PLAN.md) — Wave 3 execution (8 tranches)
- [CARBON-PHASE1-STATUS.md](./CARBON-PHASE1-STATUS.md) — current readiness status
- [OFFICE-SYSTEM-CLEANUP-PLAN.md](./OFFICE-SYSTEM-CLEANUP-PLAN.md) — 6-phase cleanup
- [NAVIGATION.md](./NAVIGATION.md) — canonical sidebar IA

**Cloud / production (primary feature development, `cloud-agent` branch):**
see [ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md) ·
[NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md) ·
[PRODUCTION-OPS.md](./PRODUCTION-OPS.md) · [VPS-INSTALL.md](./VPS-INSTALL.md)

**Archived (legacy):**
- `docs/esti/archived/` — superseded suite/desktop-era documents

---

## Support & questions

- **Cleanup questions?** See [OFFICE-SYSTEM-CLEANUP-PLAN.md](./OFFICE-SYSTEM-CLEANUP-PLAN.md)
- **Carbon migration?** See [CARBON-MIGRATION-WAVE3-PLAN.md](./CARBON-MIGRATION-WAVE3-PLAN.md)
- **Architecture questions?** See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Stack migration spec?** See [NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md)
- **Deployment / what's live? Where does new feature work happen?** See [ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md)
- **Branch policy (cloud vs local)?** See [`../../CLAUDE.md`](../../CLAUDE.md) § Branch & environment split

---

**Last updated:** 2026-09-04  
**Companion doc:** [ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md)
