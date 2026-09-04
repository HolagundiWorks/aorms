# Carbon Migration — Wave 3 Acceleration Plan (2026-09-04)

**Status:** Active Implementation  
**Owner:** Web-first platform  
**Goal:** Complete Wave 3 (MUI → Carbon conversion) and reach Wave 4/5 readiness  

---

## Executive Summary

AORMS Carbon migration is **Wave 3 in progress** (Sept 2026). We have:
- ✅ Wave 0-1 foundation complete (Carbon theme infrastructure, adapters, tree-shaking)
- ✅ Wave 2 adapters delivered (StatusDot, DataState, ConfirmModal, PageBreadcrumb)
- 🚧 Wave 3 partially complete: **41 files migrated, 232 files remain**
- ⏳ Wave 4-6: Icon swap, landing, decommission (planned but not started)

**Current inventory:** 506 remaining MUI/HCW imports across 232 files.

**This plan:** Prioritized Wave 3 tranches with parallel workstreams, dependency ordering, and quality gates.

---

## Phase 1: Readiness & Quick Wins (Week 1)

### 1.1 Adapt remaining bucket-1 primitives (high-reuse shims)

Complete Wave 2 adapters for:
- **`ToastHost`/`pushToast`** (68 uses) → Carbon `ToastNotification` global container
- **`Avatar`/`getInitials`** (≤3 uses, low priority) → compose from Carbon `Tile`/icon
- Missing **form field adapters** (if used)

**Effort:** 1-2 days  
**Blocker removal:** Yes — unblocks 68 call-sites from MUI form imports

### 1.2 Audit & document the 232 files by category

Auto-categorize remaining files:
1. **Components (leaf UI, tables, forms)** — ~60 files; highest reuse
2. **Routes (screens/pages)** — ~80 files; mid-weight
3. **Layouts & shells** (RailLayout, portals, auth) — ~15 files; structural
4. **Utilities & providers** — ~10 files; plumbing
5. **Landing/marketing** — ~30 files; separate Wave 5 path
6. **Deferred (overlays, popovers)** — ~27 files; defer post-browser-QA

**Deliverable:** categorized audit in [CARBON-WAVE3-AUDIT.md](./CARBON-WAVE3-AUDIT.md)  
**Effort:** 4-6 hours (scripted + manual review)

### 1.3 Lock in design decisions from CARBON-MIGRATION.md § 0

**Pure Carbon governing rule:**
- ✅ No custom UI/UX where Carbon provides one
- ✅ No HCW material languages (glass/neumorphism dropped)
- ✅ No component restyling away from spec
- ✅ Custom code confined to composition & layout
- ❓ **Font choice:** IBM Plex (Carbon default) or keep Urbanist as override?
- ❓ **Accent token:** Carbon `$blue-60` or brand override?
- ❓ **Theme variants:** `white`/`g10`/`g90`/`g100` mapping to app light/dark/accessible?

**Owner:** Product/Design  
**Blocker:** No — proceed with Carbon defaults; brand tuning is Wave 6

---

## Phase 2: Dependency-Ordered Tranches (Weeks 2–6)

### Tranche Priority Matrix

| Priority | Files | Est. effort | Blocker | Start |
|----------|-------|-------------|---------|-------|
| **P1: Leaves** | ~60 | 15 days | Adapters (1.1) | Week 2 |
| **P2: Tables** | ~15 | 5 days | P1 leaves | Week 2 |
| **P3: Forms** | ~20 | 6 days | P1 leaves | Week 3 |
| **P4: Routes (office)** | ~25 | 8 days | P1-3 | Week 3 |
| **P5: Routes (projects)** | ~20 | 7 days | P1-3 | Week 4 |
| **P6: Routes (other)** | ~20 | 6 days | P1-5 | Week 4 |
| **P7: Layouts** | ~15 | 5 days | P1-3 | Week 5 |
| **P8: Portals** | ~12 | 4 days | P1-3 | Week 5 |
| **P9: Deferred** | ~27 | TBD | Browser QA | Post-Wave-3 |

**Total Wave 3 effort:** ~56 days (8 weeks, serial; 3–4 weeks parallel)

---

## Phase 3: Execution — Per-Tranche Recipe

### Standard migration recipe (all tranches)

```
1. Identify all @mui/* and @hcw/ui-kit imports in the file.
2. Swap kit primitives → ../carbon/adapters (StatusDot, DataState, ConfirmModal, PageBreadcrumb).
3. Replace MUI components with stock Carbon (see CARBON-MIGRATION.md § 4.2 map).
4. Typography: replace <Typography variant="..."> with semantic tags + .cds--type-* classes.
5. Layout: Box/Stack → Carbon Stack or flex div.
6. Wrap root in <CarbonScope> (if not already nested in a Carbon scope).
7. Add any new Carbon components to frontend/src/carbon/carbon-tree.scss.
8. Run tsc + eslint; grep file to confirm zero MUI/kit imports.
9. Visually test in browser; update snapshots if design changed.
```

### Tranche P1: Shared Leaves (~60 files)

**High-reuse components; other tranches depend on these.**

Examples: RowActionsMenu, CurrentPhaseSelect, PeriodFilter, StudioBreath, AuthStageCanvas, etc.

**Expected changes:**
- MUI `MenuItem`/`Menu` → Carbon `OverflowMenu` (already done in some)
- MUI `TextField`/`Select` → Carbon `TextInput`/`Select` (with adapters)
- MUI `Dialog` → Carbon `Modal` (already done in some)
- MUI `Chip` → Carbon `Tag` (already done via StatusDot adapter)
- MUI `Typography` → semantic tags + `.cds--type-*`
- MUI layout → Carbon `Stack` or CSS grid

**QA gate:**
- [ ] tsc + eslint green
- [ ] all 60 files have zero MUI/kit imports
- [ ] visual snapshots updated
- [ ] keyboard/focus working (Carbon compliance)

**Parallel workstreams:** 3–4 developers, batches of 15–20 files each

---

### Tranche P2: DataTables (~15 files)

**Uses MUI X `DataGrid`; Carbon adapter already exists.**

Examples: Tenders, Filing, ProjectInvoicesPanel, AuditLog, etc.

**Changes:**
- `import { DataGrid } from '@mui/x-data-grid'` → `from '../carbon/adapters'`
- Verify column widths, flex, sort, pagination in browser (adapter QA pending)
- Replace row-action `Menu` with Carbon `OverflowMenu`

**QA gate:**
- [ ] DataGrid adapter QA complete (sort, pagination, column flex)
- [ ] all 15 files migrated
- [ ] tsc + eslint green
- [ ] visual baselines updated

**Parallel:** 2 developers, parallel to P1

---

### Tranche P3: Forms (~20 files)

**Creates, edits, searches; scattered across routes.**

**Changes:**
- MUI `TextField`/`Select`/`Checkbox`/`Radio` → Carbon equivalents
- MUI `DatePicker` → Carbon `DatePicker`
- MUI `Form`/`Formik` bindings → remain as-is (not MUI-specific)
- Layout: `Box`/`Stack` → Carbon `Stack` or `Grid`

**QA gate:**
- [ ] all form inputs render + submit correctly
- [ ] validation feedback works
- [ ] accessibility (labels, hints, error text)

---

### Tranche P4-6: Routes (Projects, Office, Other) (~65 files)

**App screens; composed of leaves + tables + forms from P1-3.**

**Composition:** P1-3 leaves are already migrated; these just wire them together and replace the shell chrome (rail nav, header, etc.).

**Changes per screen:**
- Import migrated P1-3 leaves → no change (they're already Carbon)
- Remove MUI imports from the route file itself (layout, spacing)
- Replace custom MUI chrome with Carbon patterns
- Page-level structure: `RailLayout` replacement (see below)

**QA gate (per route):**
- [ ] tsc + eslint green
- [ ] zero MUI/kit imports
- [ ] screenshot compared to baseline (expect cosmetic drift due to Carbon flat vs. HCW neumorphism)

---

### Tranche P7: Layouts (RailLayout, app shell) (~15 files)

**Structural; blocks authenticated-screen rendering.**

**Key file:** `RailLayout.tsx` (the authenticated-screen shell)

**Changes:**
- Current: side-nav with neumorphic glass + soft surfaces
- Target: Carbon `SideNav` + flat `Tile`/`Layer` surfaces (no glass)
- Spatial model: left column (nav) + right scrolling content area (Carbon standard)
- Move vertical rail `Tabs` to horizontal Carbon `Tabs` in the content (proven on Filing, Leads)
- `ActionDock` stays as plumbing; screen actions rendered via `HeaderGlobalBar` or page `Button` set

**⚠️ Impact:** This changes every authenticated screen's shell **at once** — needs **full browser QA**.

**QA gate:**
- [ ] RailLayout renders with Carbon SideNav + no glass
- [ ] All authenticated screens render inside it
- [ ] Vertical tabs converted to horizontal Carbon Tabs where needed
- [ ] Keyboard nav works (Carbon compliance)
- [ ] All visual baselines updated (significant cosmetic change expected)

---

### Tranche P8: Portals (Client, Collaborator, Contractor) (~12 files)

**Unauthenticated portal shells; depend on P1-3 leaves being migrated.**

**Changes:**
- `PortalNeuFrame` (HCW custom) → Carbon `Tile` + layout
- Client/Collab portal shells → rebuild on Carbon `Header` + `SideNav` (if sidebar present) or just `Header` + content
- Login shell → `AuthRailLayout` replacement (see P7 note)

**QA gate:**
- [ ] Portal shells render correctly
- [ ] Navigation works
- [ ] visual baselines updated

---

### Tranche P9: Deferred (Overlays, Popovers) (~27 files)

**Pending browser QA of Carbon `Popover`/`Toggletip` (in-place render vs. escape clipping).**

Examples: `HeaderPomodoro`, `AiCarbon`, `ProjectRailNav` (custom vertical nav)

**Blocker:** MUI `Popover` escapes overflow/transform clipping; Carbon equivalents render in-place and need verification.

**Plan:** After Wave 3 browser QA, spike a replacement `PopoverContainer` + `usePopover` hook on Carbon, then migrate these 27 files.

---

## Phase 4: Quality Assurance (Ongoing)

### Visual regression testing

- **Tool:** Playwright `visual` project (`e2e/tests/visual-regression.spec.ts`)
- **Baseline dir:** `e2e/tests/visual-regression.spec.ts-snapshots/`
- **Per tranche:** Capture new baselines; review diffs (cosmetic drift from neumorphism → flat is expected)
- **Gate:** No unexpected layout shifts, text clipping, or color regressions

### Accessibility checklist (per [`07-UX-REVIEW-CHECKLISTS.md`](../hcw-kit/07-UX-REVIEW-CHECKLISTS.md))

- [ ] Keyboard navigation (Tab, Shift+Tab, Enter, Escape)
- [ ] Focus visible on all interactive elements
- [ ] Screen reader testing (Carbon components are WCAG-tested)
- [ ] Color contrast (Carbon tokens meet WCAG AA; check custom text)
- [ ] Touch targets (min 44×44 px)

### Build & bundle metrics

- [ ] `tsc --noEmit` green (no type errors)
- [ ] `eslint` green (no lint errors)
- [ ] `vite build` succeeds; bundle size stable (expect slight decrease as MUI removed)
- [ ] No CSP violations (Carbon fonts self-hosted by Wave 1.1)

---

## Phase 5: Wave 4 Prep — Icon Swap (Parallel, Week 6)

While Wave 3 tranches 7-9 complete, start **Wave 4: Icon swap** (1 sprint).

### Icon migration: @mui/icons-material → @carbon/icons-react

**Status:** 93 files to migrate  
**Effort:** 3–5 days (mostly mechanical name mapping)

**Script to auto-map:** create a sed/regex script mapping common icon names (ChevronRight → ChevronRight, etc.).

**QA gate:**
- [ ] No `@mui/icons-material` imports remain
- [ ] All icons render correctly (verify Carbon icon names match intended semantics)
- [ ] No broken imports

---

## Phase 6: Wave 5 Prep — Landing & Marketing (Parallel, Week 7)

**Landing/marketing CSS system (`landing.scss`, `esti-lp-*`) migrates separately.**

- Retarget `landing.scss` onto Carbon tokens/type
- Rebuild marketing shell (no taskbar, no dock) on Carbon `Header` + bespoke top-level nav
- Rebuild unauthenticated pages (`Landing.tsx`, `Login.tsx`, `/aproc`, `/aconsulting`)
- Re-shoot marketing visual baselines

**Effort:** 1–2 sprints (after Wave 3 complete; can start once P1 leaves are done)

---

## Timeline Summary

| Phase | Week | Effort | Blocker |
|-------|------|--------|---------|
| Phase 1: Readiness | 1 | 1 week | None |
| Phase 2-3: P1-3 tranches (leaves, tables, forms) | 2–3 | 2 weeks | Phase 1 |
| Phase 2-3: P4-6 tranches (routes) | 3–4 | 2 weeks | P1-3 complete |
| Phase 2-3: P7 tranches (layouts, RailLayout) | 5 | 1 week | P1-6 complete; full browser QA needed |
| Phase 2-3: P8 tranches (portals) | 5 | 1 week | P1-3 complete |
| Phase 2-3: P9 tranches (deferred) | Post-Wave-3 | TBD | Browser QA of overlays |
| Phase 4: QA + baselines | Ongoing | Continuous | Per tranche |
| **Phase 5: Wave 4 (icons)** | 6 (parallel) | 1 week | Phase 3 ~70% done |
| **Phase 6: Wave 5 (landing)** | 7 (parallel) | 2 weeks | Phase 3 ~50% done |
| **Total Wave 3 + 4 + 5** | **~7 weeks** | **~10 weeks effort** | Parallel OK after Phase 1 |

**Compressed parallel schedule:** 7 weeks calendar time with 3–4 developers.

---

## Risk Mitigation

### Risk 1: RailLayout change impacts all authenticated screens

**Mitigation:** 
- RailLayout migration is **critical path**; schedule it for Week 5 after P1-6 leaves are stable
- Plan full browser regression testing (all authenticated screens)
- Create a side-by-side comparison doc (neumorphic vs. flat) for product sign-off before rollout

### Risk 2: DataGrid adapter needs browser QA

**Mitigation:**
- Use existing adapter for P2; do not build a new one
- Test sort, pagination, column flex on a few key screens first (AuditLog, Tenders)
- If issues found, patch adapter before rolling to 15 files

### Risk 3: Overlay/Popover clipping with Carbon

**Mitigation:**
- Defer P9 (27 files) until a spike validates Carbon `Popover`/`Toggletip`
- Build a replacement if needed post-Wave-3
- These 27 files can remain MUI temporarily during Wave 3 close

### Risk 4: Team coordination across 232 files

**Mitigation:**
- Use branching per tranche; each tranche is its own PR
- Document per-file recipe in a shared checklist (see Phase 3 recipe above)
- Daily standup during Weeks 2–5 to track blockers

---

## Success Criteria

### Wave 3 exit criteria

- ✅ **All 232 files migrated** (or deferred to post-Wave-3 spike)
- ✅ **Zero MUI/kit imports** (except Wave 6 cleanup code paths)
- ✅ **tsc + eslint green** across all migrated files
- ✅ **Visual baselines updated** (all regression snapshots re-captured and reviewed)
- ✅ **Accessibility verified** (keyboard nav, focus, COGA)
- ✅ **No bundle size regression** (expect slight decrease)
- ✅ **Product sign-off** on cosmetic changes (flat vs. neumorphic)

### Wave 4 exit criteria

- ✅ **Zero `@mui/icons-material` imports**
- ✅ **All 93 files using `@carbon/icons-react`**

### Wave 5 exit criteria

- ✅ **Landing/marketing carry no MUI/kit imports**
- ✅ **Marketing CSS retargeted to Carbon tokens**
- ✅ **Unauthenticated pages render on Carbon**

### Wave 6 exit criteria

- ✅ **MUI + kit removed from dependencies**
- ✅ **Docs updated** (CLAUDE.md, design-debt register, AI wiki)
- ✅ **Zero breaking changes** in final app (only visual refinement)

---

## Handoff to Waves 4–6

Once Wave 3 exits:
1. **Wave 4 (icons):** Mechanical, low-risk. Can run in parallel with Wave 5.
2. **Wave 5 (landing/marketing):** Separate system; documented in this plan.
3. **Wave 6 (decommission):** Remove MUI, kit, docs cleanup. Safe once 4-5 are complete.

---

## Appendix: File categorization script

```bash
# Run from frontend/src to categorize files by MUI/kit imports
for file in $(grep -r "@hcw/ui-kit\|@mui/material\|@mui/icons-material" . --include="*.tsx" --include="*.ts" -l); do
  echo "$file"
  grep -o "@mui/[^ ]*\|@hcw/[^ ]*" "$file" | sort | uniq | sed 's/^/  - /'
done | sort
```

---

## Related docs

- [`CARBON-MIGRATION.md`](./CARBON-MIGRATION.md) — Full roadmap & decisions
- [`CARBON-WAVE3-AUDIT.md`](./CARBON-WAVE3-AUDIT.md) — Detailed file categorization (to be generated)
- [`07-UX-REVIEW-CHECKLISTS.md`](../hcw-kit/07-UX-REVIEW-CHECKLISTS.md) — Accessibility validation
- [`e2e/tests/visual-regression.spec.ts`](../../e2e/tests/visual-regression.spec.ts) — Visual baselines

---

**Owner:** Claude Haiku 4.5  
**Date:** 2026-09-04  
**Last updated:** 2026-09-04
