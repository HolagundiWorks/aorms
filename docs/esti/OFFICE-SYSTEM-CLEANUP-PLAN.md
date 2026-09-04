# AORMS Pivot to Office Management System — Cleanup Plan

**Date:** 2026-09-04  
**Strategy:** Remove all allied app references; pivot to pure office management system (web-only)  
**Effort estimate:** 2–3 days (code + landing pages + docs)

---

## Executive Summary

AORMS is **now a pure office management system** (web-only SPA). Removed:
- All allied consultancy apps (AStudio, AConsulting, AProc, ADraft, ShilpiDB)
- Desktop components (AORMS Connect launcher, Tauri shell, Windows installer)
- Local-first architecture, license manager, per-app login
- Separate product URLs and marketing CTAs

**What stays:**
- ESTI AI agent (built into office hub)
- EOMS knowledge bank API
- Office management features (clients, projects, proposals, invoices, team, finances, KB)

---

## Phase 1: Codebase Cleanup (232 code removals)

### 1.1 Remove allied app references (~77 imports/constants)

**Task:** Search and remove references to: `AStudio`, `AConsulting`, `AProc`, `ADraft`, `ShilpiDB`, `ASTUDIO`, `ACONSULTING`, `APROC`, `AADT`, `SHILPIDB`

**Files affected:**
```bash
# Count: 77 instances across frontend
grep -r "AStudio\|AConsulting\|AProc\|ADraft\|ShilpiDB\|ASTUDIO\|ACONSULTING\|APROC\|AADT\|SHILPIDB" \
  frontend/src --include="*.tsx" --include="*.ts" -l | wc -l
```

**Cleanup steps:**
- [ ] `frontend/src/lib/product-nomenclature.ts` — remove allied app constants
- [ ] `frontend/src/components/` — remove allied app component imports
- [ ] `frontend/src/routes/` — remove allied app route references
- [ ] `frontend/src/lib/desktop-installers.ts` — remove installer download logic
- [ ] Any localStorage/session references to desktop apps

**Script to identify all files:**
```bash
grep -r "AStudio\|AConsulting\|AProc\|ADraft\|ShilpiDB" frontend/src --include="*.tsx" --include="*.ts" -l > /tmp/cleanup-files.txt
```

### 1.2 Remove desktop/Tauri components

**Files to delete/clean:**
- [ ] `desktop/` — entire directory (desktop apps removed)
- [ ] `frontend/src/lib/desktopNativeBridge.ts` — desktop native bridge (keep web-only)
- [ ] References to `tauri`, `TAURI_INVOKE`, window.\_\_TAURI\_\_ 
- [ ] Tauri config (`tauri.conf.json`, `src-tauri/`)

**Search:**
```bash
grep -r "tauri\|nativeShell\|TAURI_INVOKE\|__TAURI__" frontend/src --include="*.tsx" --include="*.ts" -l
```

### 1.3 Remove installer/setup logic

**Files affected:**
- [ ] `frontend/src/lib/desktop-installers.ts` — remove download URLs, setup wizards
- [ ] `frontend/src/routes/Downloads.tsx` — remove installer CTAs (keep landing page)
- [ ] `deploy/build-installer.ps1`, `deploy/sign-exe.ps1` — remove Windows installer scripts
- [ ] References to `coming_soon` installer gates (SimpleDL, download manifests)

### 1.4 Remove "suite" architecture references

**Search for:**
```bash
grep -r "SUITE_\|suite\|product suite\|APPS\|app suite" frontend/src docs/ --include="*.tsx" --include="*.ts" --include="*.md" -i
```

**Update:**
- [ ] Remove `SUITE_CORE_APPS`, `SUITE_MANAGER_APPS`, `SUITE_TECHNICAL_APPS` constants
- [ ] Update any "switch between apps" logic to remove allied apps
- [ ] Update sidebar nav; remove nested app structure

### 1.5 TypeScript + Lint

After removals:
- [ ] `tsc --noEmit` — fix type errors
- [ ] `eslint --fix` — clean up imports
- [ ] `vite build` — ensure build succeeds
- [ ] Check for dangling imports (deleted files still referenced)

---

## Phase 2: Landing Pages & Marketing Cleanup

### 2.1 Update `Landing.tsx` (home page)

**Current:** Shows suite of apps with CTAs to AStudio, AConsulting, AProc, etc.  
**Target:** Focus on office hub benefits (client management, project tracking, proposals, invoicing, team collaboration, KB)

**Changes:**
- [ ] Remove allied app feature cards (AStudio, AConsulting, AProc, ADraft)
- [ ] Update hero section: **"Unified Office Management for AEC Firms"** (not "Suite of Apps")
- [ ] Focus on office features: clients, projects, proposals, invoices, team, finances, knowledge base
- [ ] Remove desktop installer CTAs
- [ ] Add "Log in to your office hub" CTA (instead of per-app logins)

### 2.2 Update `/blog` index and content

**Changes:**
- [ ] Remove posts about AStudio, AConsulting, AProc practices
- [ ] Keep general AEC industry + office management content
- [ ] Update "our products" references → "AORMS office management system"

### 2.3 Update `downloads` page (if it exists)

**Current:** Lists installers for Connect, AStudio, AConsulting, AProc, ADraft  
**Target:** Remove entire page or redirect to login (web-only, no downloads)

**Option A (keep page):**
- [ ] Remove all installer download links
- [ ] Replace with "Log in to your office hub" CTA
- [ ] Or: redirect `/downloads` → `/login`

**Option B (remove page):**
- [ ] Delete downloads route
- [ ] Update nav to remove downloads link

### 2.4 Update layout & navigation

**Changes:**
- [ ] Remove "Products" dropdown (if shows allied apps)
- [ ] Update footer: remove allied app links
- [ ] Update meta tags + SEO (remove "suite", "multiple apps" messaging)
- [ ] Update all CTAs: "Get started" → "Log in to office hub"

### 2.5 CSS cleanup

**Search and update:**
- [ ] `landing.scss` — remove allied app styling (cards, cards-grid sections)
- [ ] `frontend/src/styles.scss` — remove desktop/installer-specific styles
- [ ] Unused icon classes (AStudio logo, AConsulting icon, etc.)

---

## Phase 3: Documentation Cleanup ✅

### 3.1 Update core docs

- [x] **[`AORMS-OFFICE-SYSTEM.md`](./AORMS-OFFICE-SYSTEM.md)** — office hub overview, features, architecture; suite references confined to "Removed (Legacy)" section
- [x] **`AORMS-SUITE.md`** → archived
- [x] **`AORMS-CONNECT.md`** → archived
- [x] **`LOCAL-FIRST.md`** → archived

### 3.2 Update other docs

- [x] **`NAVIGATION.md`** — rewritten for the unified single `nav` tree (matches `App.tsx`); removed the 3-surface taskbar model
- [x] **`ROADMAP.md`** — checklist reconciled against actual repo state (Phase 1/2/3 status corrected); later **split** into [`ROADMAP-CLOUD.md`](./ROADMAP-CLOUD.md) (what's live) and [`ROADMAP-LOCAL.md`](./ROADMAP-LOCAL.md) (engineering), with `ROADMAP.md` kept as a short index so the ~13 existing incoming links stay valid
- [x] **`ARCHITECTURE.md`** — rewritten for web-only stack (Carbon, no desktop/Tauri/local-first)
- [x] **`PRODUCTION-OPS.md`** — removed installer/D6 gating, AORMS Connect staff-ERP note, and the "ESTI is desktop-only" AI section; rewrote ESTI AI § for office hub
- [x] **`MARKET-FIT.md`** — repositioned from suite/local-first GTM to web-only office hub GTM; M8 checklist retired

### 3.3 Archive removed docs

**Moved to `docs/esti/archived/` (this pass):**
- `AORMS-PLATFORM-NOMENCLATURE.md` → `AORMS-PLATFORM-NOMENCLATURE-SUITE-V1.md` (superseded by `CLAUDE.md` § Product naming)
- `AORMS-DEVELOPMENT-SPEC.md` (superseded by `AORMS-OFFICE-SYSTEM.md`)
- `WEB-PORTAL.md` (desktop installer wiring — feature removed)
- `FIGMA-TOKEN-SYNC.md` (LF6 desktop↔web token-sync ritual — superseded by Carbon migration)
- `repo-scaffolds/` (AStudio/AConsulting sibling-repo scaffolds — never created, no longer planned)
- `docs/marketing/LANDING-REDESIGN-CONTEXT.md` → `docs/marketing/archived/` (pre-pivot suite landing brief)

**Also rewritten in place (not archived — still active, now accurate):**
- `AORMS-SURFACE-URLS.md` — matches current `aorms-surface-urls.ts` (single `platform` + `admin` surface, allied-app subdomains redirect to `/login`)
- `README.md` (docs index) — dropped ~20 links to already-archived docs, added an Archived section
- Root `README.md`, `DEVELOPMENT.md` — opening description rewritten from "AORMS-Studio shipped app" to web-only office hub; nomenclature links repointed from the archived doc to `CLAUDE.md`
- `ESTI-PULSE.md` — "AORMS-Studio workspace" → "AORMS office hub" (2 lines)
- `ACCESS-HIERARCHY.md`, `VPS-INSTALL.md` — broken/stale links and desktop-installer language fixed

**Known still-stale (out of this pass's scope — kit/marketing docs, not core product docs):**
`HCW-UI-KIT.md`, `PAGE-STRUCTURE.md`, `UI-SITE-MAP.md`, `HCW-UI-UX-PRINCIPLES.md`,
`AORMS-BRANDING-KIT.md`, `HCW-KIT-AI-KNOWLEDGE-BASE.md`, marketing campaign docs
(`docs/marketing/INSTAGRAM-CAMPAIGN.md`, `LINKEDIN-CAMPAIGN.md`), `docs/holagundi/*`,
`docs/HCW-UX.md`. `HCW-UI-KIT.md` is already scheduled for rewrite at the Carbon
Wave 6 decommission (see `CLAUDE.md` § UI). There is also a large pre-existing web
of broken doc-to-doc links across `docs/hcw-kit/` and `docs/` unrelated to the
allied-app pivot (e.g. `COGNITION-ENGINE.md`, `DESKTOP-WINUI-UX.md`,
`HCW-CONSTRUCTION-PATTERNS.md` never existed) — not touched here.

---

## Phase 4: Configuration & Env Updates

### 4.1 Remove installer-related env vars

**Search:**
```bash
grep -r "INSTALLER\|DOWNLOAD\|INSTALLER_URL\|ASTUDIO\|ACONSULTING" .env* .github/
```

**Update:**
- [ ] Remove `VITE_ASTUDIO_URL`, `VITE_ACONSULTING_URL`, etc.
- [ ] Remove installer download URLs from env
- [ ] Remove Windows code-signing certificates (if used)

### 4.2 Update build config

**Changes:**
- [ ] `frontend/package.json` — remove Tauri deps (if any)
- [ ] `vite.config.ts` — remove desktop build targets
- [ ] `tsconfig.json` — remove Tauri type definitions
- [ ] `.github/workflows/` — remove desktop/installer build jobs

---

## Phase 5: Database & Backend Updates

### 5.1 Check backend for allied app references

**Search:**
```bash
grep -r "astudio\|aconsulting\|aproc\|aadt" backend/src --include="*.ts"
```

**Update:**
- [ ] Remove allied app API endpoints (if any)
- [ ] Remove allied app module imports
- [ ] Update tRPC router to remove allied app namespaces
- [ ] Check `CLAUDE.md` module map for obsolete namespaces

### 5.2 Database schema cleanup (future migration)

- [ ] Document removal of allied app tables (if they exist)
- [ ] Create migration to archive/delete orphaned data
- [ ] Update contracts/types to remove allied app types

---

## Phase 6: Testing & Validation

### 6.1 Build & type-check

- [ ] `tsc --noEmit` ✅ no type errors
- [ ] `eslint` ✅ no linting errors
- [ ] `vite build` ✅ production build succeeds
- [ ] No CSP violations in built CSS/JS

### 6.2 Visual regression

- [ ] Screenshot landing page (home, blog, login)
- [ ] Verify no broken images (allied app icons)
- [ ] Verify no broken links (allied app URLs)
- [ ] Test on mobile (responsive)

### 6.3 Functional testing

- [ ] Login flow works (SSO)
- [ ] Office hub loads (authenticated)
- [ ] Navigation works (no allied app links)
- [ ] No console errors

### 6.4 Search & replace verification

```bash
# Confirm no allied app references remain
grep -r "AStudio\|AConsulting\|AProc\|ADraft\|ShilpiDB\|astudio\|aconsulting\|aproc" \
  frontend/src backend/src --include="*.tsx" --include="*.ts" | wc -l
# Should be 0
```

---

## Checklist

### Code Cleanup
- [ ] Remove 77 allied app references (AStudio, AConsulting, AProc, ADraft, ShilpiDB)
- [ ] Delete `desktop/` directory
- [ ] Remove desktop native bridge references
- [ ] Remove installer/setup logic
- [ ] Remove "suite" architecture constants
- [ ] tsc + eslint + build ✅ green

### Landing Pages
- [ ] Update `Landing.tsx` — focus on office hub, remove allied app CTAs
- [ ] Update blog index + content
- [ ] Remove/redirect `/downloads` page
- [ ] Update nav, footer, meta tags
- [ ] Clean up `landing.scss` (remove allied app styling)

### Documentation ✅
- [x] Create `AORMS-OFFICE-SYSTEM.md` (new canon)
- [x] Archive obsolete docs (SUITE, CONNECT, LOCAL-FIRST, PLATFORM-NOMENCLATURE-v1, DEVELOPMENT-SPEC, WEB-PORTAL, FIGMA-TOKEN-SYNC, repo-scaffolds, LANDING-REDESIGN-CONTEXT)
- [x] Update nav, roadmap, architecture, production ops, market-fit
- [x] Remove allied app examples + references from core product docs (kit/marketing docs deferred — see § 3.3 note)

### Configuration
- [ ] Remove installer env vars
- [ ] Update build config (remove desktop targets)
- [ ] Remove Tauri dependencies

### Backend
- [ ] Search for allied app references in tRPC router
- [ ] Remove allied app endpoints/modules
- [ ] Update contracts/types

### Testing
- [ ] Landing page visual review
- [ ] Login flow functional test
- [ ] Office hub loads correctly
- [ ] No broken links/images
- [ ] Zero allied app references in code (grep verification)

---

## Implementation Order

**Week 1:**
1. Phase 1: Code cleanup (77 references, desktop removal)
2. Phase 2: Landing pages
3. Phase 3: Documentation

**Week 2:**
4. Phase 4: Config updates
5. Phase 5: Backend review
6. Phase 6: Testing & validation

**Parallel:**
- Update CLAUDE.md (already done)
- Create new docs (AORMS-OFFICE-SYSTEM.md)
- Archive old docs

---

## Expected Outcomes

✅ **Codebase:** No allied app references; web-only SPA  
✅ **Landing pages:** Office hub focused; no installer CTAs  
✅ **Documentation:** Updated to office management system  
✅ **Build:** tsc + eslint + vite ✅ green  
✅ **Marketing:** Clear messaging (office mgmt, not suite of apps)

---

## Related Docs

- [`CLAUDE.md`](../../CLAUDE.md) — Updated (2026-09-04) ✅
- [`AORMS-OFFICE-SYSTEM.md`](./AORMS-OFFICE-SYSTEM.md) — To be created
- [`CARBON-MIGRATION-WAVE3-PLAN.md`](./CARBON-MIGRATION-WAVE3-PLAN.md) — Still valid (office hub focus)

---

**Owner:** Claude Haiku 4.5  
**Date:** 2026-09-04  
**Status:** Plan complete; ready for implementation
