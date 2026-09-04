# AORMS Local Development Roadmap

**Status:** ACTIVE — local stack verified working end-to-end; Next.js/Supabase
migration Phase 1 built here  
**Updated:** 2026-09-04  
**Scope:** Work done in the **local dev environment** (Podman compose stack,
this machine, `main` branch) — plus, per the resumed split
([`../../CLAUDE.md`](../../CLAUDE.md) § Branch & environment split,
[CLOUD-AGENT-WORKFLOW.md](./CLOUD-AGENT-WORKFLOW.md)), **verifying and
merging** the short-lived `cloud-agent/<task-slug>` branches cloud sessions
push. Net-new feature work still happens here too when it isn't explicitly
assigned to a cloud-agent branch. The phase history below (Sept 2026
web-only pivot cleanup, Carbon migration) predates any of this split.

**Platform (current, live):** React + Carbon Design System + Fastify backend +
PostgreSQL, run locally via Podman. **Target platform** (in progress, built
here): Next.js + Carbon + Supabase — see the `web/` package and
[NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md); this local
environment now tests both stacks side by side.

---

## Local dev environment

Podman compose stack (`compose.yaml`) — see
[`../../CLAUDE.md`](../../CLAUDE.md) § Dev / verify loop for day-to-day
commands (container restarts, typecheck/lint, migrations).

```bash
podman compose up -d --build
# Do NOT `cp .env.example .env` for local dev — that file is a PRODUCTION
# template (NODE_ENV=production, a strict SESSION_SECRET check that crashes
# the backend on boot). compose.yaml bakes in safe dev defaults for every
# variable; a local dev pod needs no .env file at all. .env.example matters
# only when preparing an actual deployment.
#
# SPA      → http://localhost:5173
# Backend  → http://localhost:4000/health  ·  tRPC at /trpc
# MinIO    → http://localhost:9001 (console)
```

**Verified working end-to-end (2026-09-04):** full stack up via
`podman compose up -d --build` (Postgres, Redis, MongoDB, MinIO, Ollama,
backend, worker, frontend all healthy), migrations apply cleanly, demo seed
(`pnpm --filter @esti/backend seed:demo`) completes, and sign-in
(`principal@demo.aorms.in` / `demo1234`) round-trips through the real UI
(landing page → `LandingAuth` → Studio Intelligence dashboard → Clients →
Projects all render real seeded data).

**Known gotchas hit getting there (2026-09-04), now fixed:**
- The bind mount `./desktop/artifacts/keys:/keys:ro` (licensing signing key,
  unrelated to the deprecated desktop *app*) needs that directory to exist on
  the host before `up` — Podman/Docker refuses to create it. `mkdir -p
  desktop/artifacts/keys` once; already gitignored.
- **Drizzle migration journal drift:** three migration files
  (`0225_moodboard.sql`, `0228_contractor_submission_attention.sql`,
  `0229_joint_measurement.sql`) existed on disk but were missing from
  `backend/drizzle/meta/_journal.json` — silently never applied. Fixed in
  commit `9e06f99b`. **If you add a migration file by hand instead of via
  `drizzle-kit generate`, you must add its journal entry too** — drizzle's
  postgres-js migrator only compares a single `MAX(created_at)` cutoff against
  each journal entry's `when` timestamp, not per-file hashes, so a missing or
  out-of-order entry is silently skipped forever, not just delayed.

---

## Local test/verify loop (2026-09)

1. `git fetch --all && git pull` on `main`; check `git branch -r` for any
   pushed `cloud-agent/<task-slug>` branch waiting on verification.
2. **If a `cloud-agent/*` branch is waiting:** follow
   [CLOUD-AGENT-WORKFLOW.md](./CLOUD-AGENT-WORKFLOW.md) § Handoff — pull it,
   re-run its self-verification checklist yourself (don't assume it was run),
   do the functional verification a cloud session couldn't (live stack, live
   Supabase, browser click-through), then merge to `main` and push, or send
   it back with specific fixes needed.
3. Bring up the stack (above), run the app, click through the area under test.
4. `tsc --noEmit`, `eslint`, unit tests (`vitest`, `pytest` in `worker/`), and
   Playwright/e2e where they exist — see [`../../CLAUDE.md`](../../CLAUDE.md)
   § Dev / verify loop for exact commands.
5. Fix bugs found while testing directly.
6. For the Next.js/Supabase migration, `cd web && pnpm dev` runs the new
   stack (port 3000 by default) alongside the current one — see
   [ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md) § Stack migration for Phase status.

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
- [x] `tsc` + `eslint` + `vite build` — all green (0 errors, 0 warnings) as of 2026-09-04; the 72 TypeScript errors and assorted lint issues these tools surfaced after the `cloud-agent` merge are fixed (see ROADMAP-CLOUD.md § CI / build health)
- [x] EOMS (external knowledge-bank API) removed — backend client/router, contracts, frontend panel, env var all deleted
- [x] Engineering-consultancy angle removed — `consultancy` tRPC namespace + DB schema deleted; AORMS is pure architectural consultancy

### Phase 2: Landing Pages & Marketing ✅
- [x] Update `Landing.tsx` — office hub benefits (clients, projects, proposals, invoicing, team, KB, delivery); pure Carbon rewrite
- [x] Remove allied app CTAs + feature cards
- [x] `/downloads` — web-only, no installers
- [x] Blog removed entirely (content, routes, nav, sitemap, RSS feed)
- [x] Sign-in/create-workspace/password-reset folded into the landing page (`LandingAuth`, `/#sign-in`) — no dedicated auth pages; `/login` etc. redirect there

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
- Unit test coverage (backend, frontend) — small addition: `marketing-gate.test.ts`
  now covers the S8 cutover switch (`isMarketingOnly`, `isMarketingAuthPath`);
  the portal-honesty mechanism (`visibleFirmPortalSections`) already had coverage
- Visual regression baseline (after Carbon migration)

---

## Getting started (local)

1. **Code cleanup** (Phase 1)
   ```bash
   # Find remaining allied-app references
   grep -r "AStudio\|AConsulting\|AProc\|ADraft\|ShilpiDB" frontend/src --include="*.ts" --include="*.tsx" -l

   # Remove the legacy desktop/ directory (still pending) — NOTE: compose.yaml
   # bind-mounts ./desktop/artifacts/keys:/keys:ro for the licensing signing
   # key, unrelated to the deprecated desktop app. If desktop/ is removed
   # wholesale, recreate that one directory (mkdir -p desktop/artifacts/keys)
   # or update compose.yaml to drop the mount first.
   rm -rf desktop/

   # See OFFICE-SYSTEM-CLEANUP-PLAN.md Phase 1 for the full checklist
   ```

2. **Landing pages** (Phase 2 — done, verify locally)
   ```bash
   podman compose up -d --build   # do NOT cp .env.example .env — see § Local dev environment above
   ```

3. **Documentation** (Phase 3 — done)
   - `AORMS-OFFICE-SYSTEM.md` is the canonical product doc
   - `docs/esti/archived/` holds superseded specs

4. **CI verification** (local, before pushing)
   - `tsc --noEmit` — ✅ green (frontend, backend, contracts all 0 errors)
   - `eslint` ✅ green (0 errors, 0 warnings)
   - `vite build` ✅ succeeds

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

**Cloud / production:**
see [ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md) ·
[NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md) ·
[CLOUD-AGENT-WORKFLOW.md](./CLOUD-AGENT-WORKFLOW.md) ·
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
- **Branch policy (cloud vs local)?** See [`../../CLAUDE.md`](../../CLAUDE.md) § Branch & environment split · [CLOUD-AGENT-WORKFLOW.md](./CLOUD-AGENT-WORKFLOW.md) for the full rules

---

**Last updated:** 2026-09-04  
**Companion doc:** [ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md)
