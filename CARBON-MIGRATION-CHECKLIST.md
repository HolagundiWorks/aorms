# Carbon Migration Implementation Checklist

**Phase 1: Readiness (Week 1)**

## Adapt Remaining Bucket-1 Primitives

- [ ] **ToastHost/pushToast adapter** (68 uses)
  - [ ] Create `frontend/src/carbon/adapters/ToastHost.tsx`
  - [ ] Implement global `ToastNotification` container
  - [ ] Export `pushToast()` function with same signature
  - [ ] Test rendering + animations
  - [ ] Add `toast-notification` to `carbon-tree.scss`
  - [ ] tsc + eslint green
  - [ ] PR: "feat(carbon): add ToastHost adapter"

- [ ] **Avatar/getInitials adapter** (≤3 uses, low priority)
  - [ ] Create `frontend/src/carbon/adapters/Avatar.tsx`
  - [ ] Compose from Carbon `Tile`/`Layer` + initials
  - [ ] Export `Avatar()` with same API
  - [ ] tsc + eslint green
  - [ ] PR: "feat(carbon): add Avatar adapter"

- [ ] **Review Wave 2 adapters for completeness**
  - [ ] StatusDot works across 302 call-sites
  - [ ] DataState renders correctly (skeletons + empty state)
  - [ ] ConfirmModal danger state works
  - [ ] PageBreadcrumb + document.title sync works
  - [ ] All adapters in `carbon/adapters/index.ts`

## Audit & Categorize 232 Files

- [ ] **Generate categorization**
  - [ ] Run audit script (see CARBON-MIGRATION-WAVE3-PLAN.md § Appendix)
  - [ ] Output to `CARBON-WAVE3-AUDIT.md` (detailed file listing by category)
  - [ ] Verify count: 232 files total

- [ ] **Create categorized PR checklist**
  - [ ] Category: Components/leaves (~60 files)
  - [ ] Category: Tables/DataGrid (~15 files)
  - [ ] Category: Forms (~20 files)
  - [ ] Category: Routes (Office, Projects, Other) (~65 files)
  - [ ] Category: Layouts & shells (~15 files)
  - [ ] Category: Portals (~12 files)
  - [ ] Category: Deferred/overlays (~27 files)
  - [ ] Category: Marketing/landing (~30 files)

- [ ] **Lock design decisions**
  - [ ] Product: Confirm pure Carbon (no custom UI/UX)
  - [ ] Design: IBM Plex or override to Urbanist?
  - [ ] Design: Accent token (Carbon blue-60 or brand override)?
  - [ ] Design: Theme mapping (light/dark/accessible modes)?
  - [ ] Document in `CARBON-MIGRATION-DECISIONS.md`

---

## Phase 2-3: Tranche P1 — Shared Leaves (~60 files)

**Highest reuse; other tranches depend on these.**

### Batch P1.1: Sheet 1 (15 files)

- [ ] **Files to migrate:**
  - [ ] `RowActionsMenu.tsx`
  - [ ] `CurrentPhaseSelect.tsx`
  - [ ] `PeriodFilter.tsx`
  - [ ] `StudioBreath.tsx`
  - [ ] `AuthStageCanvas.tsx`
  - [ ] `CapabilityBadge.tsx`
  - [ ] `AlertsBell.tsx`
  - [ ] `AormsAnalogueClock.tsx` (or skip if custom)
  - [ ] `CardGridSkeleton.tsx` (already done?)
  - [ ] `UpgradeToPro.tsx`
  - [ ] `GoogleIconCircle.tsx`
  - [ ] `ErrorBoundary.tsx`
  - [ ] `WellnessReminderBanner.tsx`
  - [ ] `StretchGuide.tsx`
  - [ ] `EyeExerciseGuide.tsx`

- [ ] **Per file: Swap imports**
  - [ ] MUI components → Carbon (see QUICK-START.md § 3)
  - [ ] Kit primitives → `carbon/adapters` (StatusDot, DataState, etc.)
  - [ ] Icons → will do in Wave 4
  - [ ] Wrap in `<CarbonScope>` if needed

- [ ] **Per file: Test & lint**
  - [ ] tsc --noEmit green
  - [ ] eslint --fix
  - [ ] Zero MUI/kit imports (grep confirm)
  - [ ] Visual test in browser
  - [ ] Update snapshot if design changed

- [ ] **Create PR: "feat(carbon): migrate P1.1 leaves"**
  - [ ] Title: clear + batched
  - [ ] Description: files migrated + adapter usage
  - [ ] Checklist: tsc green, eslint green, visual reviewed
  - [ ] Wait for: CI + product sign-off

### Batch P1.2, P1.3, P1.4: Similar workflow for remaining ~45 files

- [ ] Batch P1.2: 15 files (Timeline, floating panels, etc.)
- [ ] Batch P1.3: 15 files (Library/compliance components)
- [ ] Batch P1.4: 15 files (Performance, team, admin helpers)

**Each batch = 1 PR, tsc+eslint+visual gate before merge.**

---

## Phase 2-3: Tranche P2 — DataTables (~15 files)

**Use existing Carbon DataGrid adapter (MUI X → Carbon).**

- [ ] **Files using @mui/x-data-grid** (verify in audit)
  - [ ] ProjectInvoicesPanel (already done)
  - [ ] Tenders
  - [ ] Filing
  - [ ] MasterPlanLibrary
  - [ ] AuditLog
  - [ ] Payroll
  - [ ] RequestsTab
  - [ ] AttendanceTab
  - [ ] Alerts
  - [ ] Vendors
  - [ ] Users
  - [ ] Leads
  - [ ] Letters
  - [ ] Contracts
  - [ ] And ~30 more per audit

- [ ] **Migration steps:**
  - [ ] Swap `import { DataGrid } from '@mui/x-data-grid'` → `from '../carbon/adapters'`
  - [ ] Replace row `Menu` → Carbon `OverflowMenu` (via adapter)
  - [ ] MUI `Chip` → `StatusDot` adapter (→ Carbon Tag)
  - [ ] MUI `LinearProgress` → Carbon `ProgressBar`
  - [ ] Test sort, pagination, column flex in browser (adapter QA)
  - [ ] tsc + eslint green

- [ ] **Parallel P2 with P1** (can start Week 2)

- [ ] **Create PR per file cluster** (or one large "P2: DataGrid migration")

---

## Phase 2-3: Tranche P3 — Forms (~20 files)

**Input fields, form validation, create/edit dialogs.**

- [ ] **Files identified in audit** (grep for TextField, Select, etc.)

- [ ] **Migration steps (per QUICK-START.md § 3):**
  - [ ] MUI `TextField` → Carbon `TextInput` / `TextArea` / `PasswordInput`
  - [ ] MUI `Select` → Carbon `Select` / `Dropdown`
  - [ ] MUI `Checkbox` / `Radio` → Carbon `Checkbox` / `RadioButton`
  - [ ] MUI `Switch` → Carbon `Toggle`
  - [ ] MUI `DatePicker` → Carbon `DatePicker`
  - [ ] Form bindings (Formik, etc.) remain as-is (not MUI-specific)
  - [ ] Layout: Box/Stack → Carbon Stack or CSS flex
  - [ ] Dialog forms → Carbon `Modal`

- [ ] **Test:**
  - [ ] Form submit works
  - [ ] Validation messages display
  - [ ] Accessibility (labels, hints, error text)
  - [ ] tsc + eslint green

- [ ] **Can start Week 3** (after P1 leaves are stable)

---

## Phase 2-3: Tranche P4-6 — Routes (Projects, Office, Other) (~65 files)

**App screens; composed of P1-3 leaves.**

### P4: Office & Finance (25 files)
- `Proposals.tsx`
- `Invoices.tsx`
- `Reconcile.tsx`
- `FilingPanel.tsx`
- `Payroll.tsx`
- And similar

**Workflow:**
- [ ] P1-3 leaves already migrated → just wire them together
- [ ] Replace screen-level MUI imports (layout, spacing)
- [ ] Wrap in page shell (RailLayout, still MUI for now)
- [ ] tsc + eslint green
- [ ] Visual test

### P5: Projects (20 files)
- `ProjectDetail.tsx`
- `ProjectMoodboard.tsx`
- `ProjectDeliveryPanel.tsx`
- And tabs/sections

**Workflow:**
- [ ] Same as P4; depends on P1-3

### P6: Other Routes (20 files)
- `Team.tsx`, `Hr.tsx`
- `Admin.tsx`, `Users.tsx`, `AuditLog.tsx`
- `Alerts.tsx`
- And remaining routes

**Workflow:**
- [ ] Same as P4-5; depends on P1-3

**Parallel:** P4, P5, P6 can run in parallel once P1-3 are ~70% done.

---

## Phase 2-3: Tranche P7 — Layouts (RailLayout, app shell) (~15 files)

**⚠️ CRITICAL PATH — changes every authenticated screen at once.**

- [ ] **RailLayout.tsx** (the key file)
  - [ ] Replace: neumorphic glass side-nav → Carbon `SideNav` + `Header`
  - [ ] Spatial model: left column (nav) + right scrolling content
  - [ ] Remove: glass surfaces, soft materials, Radiant Orange
  - [ ] Vertical rail `Tabs` → horizontal Carbon `Tabs` in content (proven on Filing, Leads)
  - [ ] `ActionDock` stays as plumbing; screen actions → `HeaderGlobalBar` or page `Button` set
  - [ ] Wrap in `<CarbonScope>` for theming
  - [ ] Full browser QA: all authenticated screens render + navigate

- [ ] **Dependent layout files** (portals, auth shells)
  - [ ] `PortalNeuFrame` → Carbon `Tile` + layout
  - [ ] `AuthRailLayout` (auth shell) → Carbon `Header` + centered card (no glass)
  - [ ] App footer / taskbar (if any custom) → review for stock Carbon equivalent

- [ ] **Full regression testing**
  - [ ] All authenticated screens render inside new RailLayout
  - [ ] Navigation works (sidebar toggle, links)
  - [ ] Vertical tabs converted to horizontal Carbon Tabs
  - [ ] Keyboard nav works (Carbon compliance)
  - [ ] Visual baselines re-captured + reviewed

- [ ] **Schedule for Week 5** (after P1-6 leaves are stable; full QA window)

- [ ] **Create PR: "feat(carbon): migrate RailLayout & authenticated shell"**
  - [ ] Large PR; document the change carefully
  - [ ] Include before/after screenshots (neumorphic → flat)
  - [ ] Product sign-off required

---

## Phase 2-3: Tranche P8 — Portals (~12 files)

**Client, Collaborator, Contractor portal shells.**

- [ ] **Depends on:** P1-3 leaves being migrated
- [ ] **Blocks:** Nothing (can parallelize with P7)
- [ ] **Steps:**
  - [ ] Unauthenticated portal shells → rebuild on Carbon `Header` (no glass)
  - [ ] Compose from stock Carbon patterns (UI Shell, Tile, Grid)
  - [ ] tsc + eslint green
  - [ ] Visual test

- [ ] **Schedule for Week 5** (after P1-6)

---

## Phase 2-3: Tranche P9 — Deferred (Overlays, Popovers) (~27 files)

**Pending browser QA of Carbon overlays.**

- [ ] **Files:**
  - [ ] `HeaderPomodoro.tsx` (portaled MUI Popover)
  - [ ] `AiCarbon.tsx` (portaled overlay)
  - [ ] `ProjectRailNav.tsx` (restyled vertical nav — don't restyle)
  - [ ] And similar

- [ ] **Blocker:** MUI `Popover` escapes overflow/transform clipping; Carbon `Popover`/`Toggletip` render in-place
  - [ ] Need browser spike to verify clipping behavior
  - [ ] May need custom `PopoverContainer` + `usePopover` hook

- [ ] **Defer to post-Wave-3**
  - [ ] Complete P1-8 first
  - [ ] Then spike overlays + migrate P9
  - [ ] These can temporarily remain MUI during Wave 3 close

---

## Phase 4: Quality Assurance (Ongoing)

### Visual Regression Testing

- [ ] **Per tranche: update baselines**
  - [ ] Run: `cd e2e && pnpm test --project=visual`
  - [ ] Review diffs in `visual-regression.spec.ts-snapshots/`
  - [ ] Cosmetic drift (neumorphism → flat) is expected
  - [ ] Approve diff if intentional, fail if unexpected layout shift

- [ ] **Post-Wave-3: final baseline capture**
  - [ ] All migrated screens' baselines finalized
  - [ ] No pending visual regressions

### Accessibility Checklist (per `07-UX-REVIEW-CHECKLISTS.md`)

- [ ] Keyboard navigation (Tab, Shift+Tab, Enter, Escape)
- [ ] Focus visible on all interactive elements
- [ ] Screen reader testing (Carbon components are WCAG-tested)
- [ ] Color contrast (Carbon tokens meet WCAG AA)
- [ ] Touch targets (min 44×44 px)

### Build & Bundle

- [ ] `tsc --noEmit` green (no type errors)
- [ ] `eslint` green (no lint errors)
- [ ] `vite build` succeeds
- [ ] Bundle size stable or decreased (MUI removal expected to shrink)
- [ ] No CSP violations

---

## Phase 5: Wave 4 Prep — Icon Swap (Parallel, Week 6)

**@mui/icons-material → @carbon/icons-react**

### Icon Migration Script

- [ ] **Create auto-mapping script**
  ```bash
  # sed/regex script mapping MUI → Carbon icon names
  # Handle common names: ChevronRight, Delete, Settings, etc.
  ```

- [ ] **Apply to 93 files**
  - [ ] Mechanical replace (import swap + name mapping)
  - [ ] Verify no broken imports
  - [ ] tsc green

- [ ] **PR: "feat(carbon): swap icons MUI → Carbon"**
  - [ ] Single large PR (93 files)
  - [ ] Automated mapping + minimal conflicts expected

- [ ] **Exit criteria:**
  - [ ] Zero `@mui/icons-material` imports remain
  - [ ] All icons render correctly
  - [ ] tsc + eslint green

---

## Phase 6: Wave 5 Prep — Landing & Marketing (Parallel, Week 7)

**Landing/marketing CSS system (`landing.scss`) migrates separately.**

- [ ] **Retarget `landing.scss` → Carbon tokens**
  - [ ] Replace esti-lp-* custom colors with Carbon palette
  - [ ] Type scale → Carbon type classes

- [ ] **Rebuild marketing shell**
  - [ ] No taskbar, no dock (different from app)
  - [ ] Carbon `Header` + bespoke top-level nav
  - [ ] No glass/neumorphism; flat Carbon patterns

- [ ] **Rebuild unauthenticated pages**
  - [ ] `Landing.tsx` (home)
  - [ ] `Login.tsx`
  - [ ] `/aproc`, `/aconsulting` (product pages)

- [ ] **Re-shoot marketing baselines**

- [ ] **PR: "feat(carbon): migrate landing & marketing pages"**

---

## Final Wave 3 Exit Criteria

- [ ] ✅ **All 232 files migrated** (or deferred to post-Wave-3 spike)
- [ ] ✅ **Zero MUI/kit imports** in migrated files (except Wave 6 cleanup code)
- [ ] ✅ **tsc + eslint green** across all migrated files
- [ ] ✅ **Visual baselines updated** (all regression snapshots re-captured + reviewed)
- [ ] ✅ **Accessibility verified** (keyboard nav, focus, COGA)
- [ ] ✅ **No bundle size regression** (expect slight decrease due to MUI removal)
- [ ] ✅ **Product sign-off** on cosmetic changes (neumorphic → flat)
- [ ] ✅ **All PRs merged** to main

---

## Transition to Waves 4-6

- [ ] **Wave 4 (icons):** Mechanical, low-risk. 1 week parallel to Wave 3 P7-9.
- [ ] **Wave 5 (landing):** Separate system. 2 weeks parallel to Wave 3 P7-9.
- [ ] **Wave 6 (decommission):** Remove MUI, kit, docs. 1 week after 4-5 complete.

---

## Sign-Off & Release

- [ ] **Product:** Approves cosmetic changes (flat vs. neumorphic)
- [ ] **Design:** Verifies brand identity preserved (within pure Carbon rule)
- [ ] **QA:** Confirms accessibility + functional parity
- [ ] **Eng:** Confirms build green + no regressions
- [ ] **Release:** Tag and document as major version (API unchanged, but visual system changed)

---

**Owner:** Claude Haiku 4.5  
**Date:** 2026-09-04  
**Last updated:** 2026-09-04
