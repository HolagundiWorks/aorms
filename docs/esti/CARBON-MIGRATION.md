# HCW-UI-Kit → IBM Carbon Design System — migration & roadmap

**Status:** Proposed · **Created:** 2026-08-02 · **Owner:** HCW / frontend
**Scope:** Whole frontend — app screens, portals, licensing console, **and** the
public landing / marketing pages.

> This document plans the move **off** `@hcw/ui-kit` (+ MUI) **onto** the **IBM
> Carbon Design System** (`@carbon/react` v11). It is the deliberate reverse of
> the 2026-07 Carbon→MUI migration recorded in
> [`HCW-UI-KIT.md`](HCW-UI-KIT.md); read that first for how the current system
> came to be. Until Wave 6 completes, **`@hcw/ui-kit` remains canonical** — see
> [`CLAUDE.md`](../../CLAUDE.md) § UI / design system.

---

## 0. Governing rule — PURE Carbon, no custom UI/UX (non-negotiable)

> **The target is stock IBM Carbon. No custom UI/UX elements.**

Every screen — app and landing — is composed **only** from stock `@carbon/react`
components and documented Carbon patterns (UI Shell, DataTable, Notifications,
Modal, Tile, Grid). Concretely, this rule means:

- **No bespoke components** where Carbon provides one, and **no inventing**
  components Carbon deliberately omits (no custom dock, rail, orb, KPI widget,
  avatar). If Carbon has no component for a need, use the nearest Carbon pattern
  (`HeaderGlobalBar` actions, `Tile`, `Tag`, `OverflowMenu`) — do **not** build a
  new one.
- **No HCW material languages** — glass and soft/neumorphic surfaces are
  dropped. Elevation is Carbon `Layer`/`Tile` only. Flat, functional.
- **No brand forks of component appearance** — use Carbon themes
  (`white`/`g10`/`g90`/`g100`) and IBM Plex. Brand expression is limited to the
  theme's interactive/accent **token** and logo lockups; it must not restyle
  Carbon components away from spec.
- **No MUI, no `@hcw/ui-kit`** in the final state; and no hand-rolled CSS that
  reproduces a component Carbon already ships.
- **Custom code is confined to composition and layout** — arranging stock Carbon
  components with the Carbon grid and spacing tokens is expected; restyling them
  is not.

The **only** sanctioned non-Carbon primitives are unavoidable app plumbing that
render **stock Carbon internally** and add no new visual language — a global
toast container (Carbon `ToastNotification`), a `document.title`/breadcrumb
side-effect wrapper (Carbon `Breadcrumb`), and route/skeleton glue. These wrap
Carbon; they do not introduce custom UI.

This rule **supersedes the open decisions in § 8** — they are resolved in favour
of pure Carbon (flat, IBM Plex, Carbon UI Shell, no glass, IBM data-viz).

---

## 1. Why (intent)

Adopt Carbon as the single design system for the entire product — app to
landing — replacing the layered HCW material system (flat · soft · glass) and
its MUI substrate with Carbon's flat, token-driven, enterprise language and
component library. One vendor system, one accessibility baseline, IBM Plex
type, and Carbon's grid/token governance end-to-end.

This is a **design-language change, not only a component swap**. The current
system's thesis is *"depth encodes importance"* (neumorphic soft surfaces,
glassmorphism for the live layer, Radiant Orange accent, the Rail · Stage ·
Dock spatial model, Urbanist). Carbon is intentionally **flat**: elevation via
`Layer` tokens, no glass/neumorphism, IBM Plex Sans, the 2x grid, and the
`$blue-60` interactive default. Wave 0 must settle how much HCW brand identity
survives inside Carbon (see § 8, Open decisions).

---

## 2. Current-state inventory (measured 2026-08-02)

| Surface | Count | Notes |
| --- | --- | --- |
| `.tsx`/`.ts` files in `frontend/src` | **276** | whole frontend |
| Files importing `@mui/material` | **198** | the real component substrate |
| Files importing `@mui/icons-material` | **93** | → `@carbon/icons-react` |
| Files importing `@hcw/ui-kit` | **78** | kit primitives (built on MUI) |
| Files referencing `--cds-*` tokens | 20 | Carbon token **values already preserved** |
| Distinct `--cds-*` tokens in `styles.scss` | 34 | frozen Carbon compat block |

**Kit primitive usage (by import frequency):**

| Primitive | Uses | Primitive | Uses |
| --- | --- | --- | --- |
| `StatusDot` | 302 | `ActionDock` | 18 |
| `DataState` | 243 | `chromeIconSx` | 12 |
| `PageBreadcrumb` | 116 | `GlassRail` | 11 |
| `useScreenActions` | 88 | `KitRoot`/`MuiRoot` | 16 |
| `pushToast`/`ToastHost` | 68 | `HealthGlassOrb` | 5 |
| `Surface` | 63 | `SectionDock` | 3 |
| `ConfirmModal` | 55 | `KpiStrip` / `Avatar` / `BrandMark` / `TaskbarFooter` | ≤3 each |

**Structural facts that help:**

- `@carbon/react` was fully removed in 2026-07 — **no Carbon React components
  remain**, so there is no half-migrated state to reconcile, only a clean
  re-introduction.
- The `--cds-*` `:root` block in `styles.scss` still carries Carbon's colour /
  spacing / type values — a ready **token bridge** for Wave 1.
- The kit is a thin layer **on top of MUI**; the 78 kit files and 198 MUI files
  overlap heavily. The real work is the **198-file MUI → Carbon** conversion;
  the kit primitives are a **shim boundary** we can exploit (§ 5, Wave 2).
- Marketing has its **own** editorial CSS system (`landing.scss`, `esti-lp-*`)
  independent of the kit — it migrates separately (Wave 5).

**Structural facts that hurt:**

- No Carbon equivalents for `ActionDock`, `GlassRail`, `SectionDock`,
  `TaskbarFooter`, `HealthGlassOrb`, `KpiStrip`, `Avatar`, `useScreenActions` —
  these are **bespoke** and must be reimplemented on Carbon primitives.
- Glass/soft surfaces, Radiant Orange as the single accent, and Urbanist are
  **not** Carbon; they are brand decisions to keep or drop (§ 8).
- `frontend/src/lib/product-nomenclature.ts` and governance docs assume the kit
  is canonical; the whole doc chain in CLAUDE.md must be re-pointed at the end.

---

## 3. Target architecture (Carbon v11)

| Concern | Today (`@hcw/ui-kit` + MUI) | Target (Carbon) |
| --- | --- | --- |
| Component library | `@mui/material` + kit primitives | `@carbon/react` |
| Icons | `@mui/icons-material` | `@carbon/icons-react` |
| Theme provider | `KitRoot`/`MuiRoot` + `createHcwTheme` | `<GlobalTheme>` + `<Theme>` (`white`/`g10`/`g90`/`g100`) |
| Tokens | kit `tokens.js` + `--cds-*` compat | `@carbon/styles` (real Sass tokens) + `@carbon/themes` |
| Type | Urbanist (`@fontsource/urbanist`) | IBM Plex Sans/Mono (`@carbon/styles` type) — *or keep Urbanist as a theme override (decision)* |
| Grid | MUI `Grid` (`size=` API) | `@carbon/react` `Grid`/`Column` (2x, 16-col) or CSS grid |
| Elevation | flat / soft / glass `Surface` | `Layer` tokens + `Tile` (flat only) |
| Spatial model | Rail · Stage · Dock | Carbon **UI Shell** (`Header`, `SideNav`, `HeaderGlobalBar`) + bespoke dock |
| Feedback | `ToastHost`/`pushToast` | `ToastNotification` + a Carbon toast container |
| Loading/empty | `DataState` | `SkeletonText`/`SkeletonPlaceholder` + bespoke empty-state |
| Density / a11y | `createHcwTheme({ density, coga })` | Carbon `useTheme` + `--cds-` layout tokens; density via `size` props |

**Coexistence:** during Waves 2–5, both `@carbon/react` and `@mui/material`
are installed and both a Carbon `<Theme>` and the kit `KitRoot` mount, so
screens migrate incrementally without a big-bang cutover. Wave 6 removes MUI +
the kit.

---

## 4. Component & token mapping

### 4.1 Kit primitive → Carbon

| Kit primitive | Carbon target | Migration note |
| --- | --- | --- |
| `Surface layer="flat"` | `Tile` / `Layer` | direct |
| `Surface layer="soft"` | `Tile` + `Layer` (one step up) | drop neumorphism |
| `Surface layer="glass"` | `Tile` / `Layer` | **drop glass** — flat only (§0) |
| `GlassRail` | UI Shell `SideNav` + `Header` | **replace** with stock UI Shell; auth forms move off the rail |
| `ActionDock` + `useScreenActions` | `HeaderGlobalBar` actions / page `Button` set | **replace** — keep the hook as plumbing, **no custom dock UI** |
| `StatusDot` (302) | stock `Tag` (+ status icon) | thin adapter rendering stock Carbon; migrate call-sites by import swap |
| `DataState` (243) | `SkeletonText`/`SkeletonPlaceholder` + Carbon empty-state | thin adapter over stock Carbon |
| `PageBreadcrumb` (116) | `Breadcrumb` + `document.title` side-effect | sanctioned plumbing wrapper (§0) |
| `ConfirmModal` (55) | `Modal`/`ComposedModal` (`danger`) | thin adapter over stock `Modal` |
| `ToastHost`/`pushToast` (68) | `ToastNotification` + container | sanctioned plumbing wrapper (keep API, stock renderer) |
| `KpiStrip` / `MissionHeader` / `DecisionQueue` / `AwarenessStrip` | **compose** stock `Tile` + `Tag` + Carbon type | no custom widget — arrangement only |
| `HealthGlassOrb` | stock `Tag` / status icon | **drop the orb** — no custom visual |
| `Avatar`+`getInitials` / `BrandMark` | initials in a stock `Tile`/`Tag`; logo lockup only | no custom Avatar component |
| `TaskbarFooter` / `SectionDock` | UI Shell `Header`/`SideNav` | **replace** with stock UI Shell — no custom nav |
| `chromeIconSx` | Carbon icon `size` props | delete |
| `createHcwTheme` / `KitRoot` / `MuiRoot` | `GlobalTheme` + `Theme` | replace at root |

### 4.2 MUI component → Carbon (the 198-file lift)

| MUI | Carbon | | MUI | Carbon |
| --- | --- | --- | --- | --- |
| `Button` | `Button` | | `Table*` | `DataTable` / `Table*` |
| `TextField` | `TextInput`/`TextArea`/`PasswordInput` | | `Dialog` | `Modal`/`ComposedModal` |
| `Select`/`MenuItem` | `Dropdown`/`Select` | | `Tabs`/`Tab` | `Tabs`/`TabList`/`Tab` |
| `Autocomplete` | `ComboBox`/`MultiSelect` | | `Accordion` | `Accordion`/`AccordionItem` |
| `Checkbox`/`Radio`/`Switch` | `Checkbox`/`RadioButton`/`Toggle` | | `Chip` | `Tag` |
| `Grid`/`Stack`/`Box` | `Grid`/`Column`/`Stack` + CSS | | `Tooltip` | `Tooltip`/`DefinitionTooltip` |
| `Typography` | Carbon type tokens / `<h*>`+classes | | `Menu` | `OverflowMenu` |
| `CircularProgress`/`Skeleton` | `Loading`/`Skeleton*` | | `Snackbar`/`Alert` | `*Notification` |
| `DatePicker` (X) | `DatePicker` | | `Pagination` | `Pagination` |

### 4.3 Tokens / Sass

- Replace the frozen `--cds-*` compat block in `styles.scss` with real
  `@carbon/styles` imports (`@use '@carbon/styles'`), then the 20 files using
  `--cds-*` resolve against Carbon's own tokens (mostly no change — the values
  already match).
- `DATA_VIZ` canvas colours → `@carbon/colors` / IBM data-viz palette.
- Spacing inline values → Carbon `$spacing-0X` tokens; type → Carbon type set.

---

## 5. Roadmap (waves)

Each wave has explicit **exit criteria**. `typecheck + lint green` and
`e2e/tests/visual-regression.spec.ts` **baselines re-captured** are required to
close every wave from 2 onward.

### Wave 0 — Decisions & spikes (1 sprint)
Settle § 8 open decisions (identity, glass, font, accent, monorepo path).
Spike: stand up `@carbon/react` + `<Theme>` alongside the kit on **one throwaway
screen** to validate coexistence, the token bridge, and the build (bundle size,
CSP for fonts). **Exit:** decisions signed off; a Carbon component renders in
the running app next to kit components.

### Wave 1 — Foundation (1 sprint) — **partially delivered 2026-08-02**
Add `@carbon/react`, `@carbon/styles`, `@carbon/icons-react`. Load Carbon's
global CSS **once, inside a `@layer carbon`** cascade layer (`src/carbon/carbon.css`,
imported in `main.tsx`) so the app's unlayered styles always win — Carbon's
reset/base/tokens cannot leak onto the 276 kit/MUI screens. Apply the Carbon
theme **per-subtree** via a `CarbonScope` adapter (`src/carbon/CarbonScope.tsx`),
**not** a `:root` `<GlobalTheme>` — that keeps Carbon's real `--cds-*` off `:root`
so the frozen compat block still serves unmigrated screens (the two token sets
stay separated by DOM). ✅ **Verified in the build:** the emitted CSS wraps all
Carbon rules in `@layer carbon{}` while `:root` tokens + Urbanist stay unlayered;
`tsc`/`eslint`/`vite build` green.

**Tree-shaken (done 2026-08-02):** the prebuilt `styles.min.css` import was
replaced with `src/carbon/carbon-tree.scss` — a selective Sass `@use` of the
Carbon foundation plus only the components in use, imported into `@layer carbon`
via `carbon.css`. A `@use '.../components/<name>'` line is added per wave as new
components appear. ✅ Verified in the build: Carbon's contribution to `main.css`
dropped from ~830 KB to ~393 KB (uncompressed), the `@layer carbon` scoping and
`.cds--g10`/`.cds--white` theme classes are preserved, and `:root` tokens +
Urbanist stay unlayered. No Sass deprecation warnings.

**Remaining for Wave 1:** self-host IBM Plex fonts (`$css--font-face` is off, so
type currently falls back until fonts land); map app light/dark →
`white`/`g10`/`g90`/`g100`; decide the accent token. **Exit:** Carbon theme
available app-wide via `CarbonScope`; zero visual regression on kit screens;
build + CSP green.

### Wave 2 — Carbon adapters + retire the bespoke primitives (1–2 sprints)
Per § 0 (pure Carbon), split the ~20 kit primitives into two buckets:
1. **Thin adapters** that render **stock Carbon** under the same import name/props
   so call-sites migrate by an import swap — `StatusDot`→`Tag`, `DataState`→
   `Skeleton*`/empty-state, `ConfirmModal`→`Modal`, plus the sanctioned plumbing
   wrappers `PageBreadcrumb`→`Breadcrumb` and `pushToast`→`ToastNotification`.
   These add **no new visual language**.
2. **Retire, don't reimplement** — `GlassRail`, `ActionDock`, `SectionDock`,
   `TaskbarFooter`, `KpiStrip`, `HealthGlassOrb`, `Avatar`, `BrandMark`,
   `Surface(soft/glass)`. Their call-sites are rewritten onto stock Carbon
   patterns (UI Shell, `Tile`, `Tag`, `HeaderGlobalBar`) during Waves 3/5. **No
   custom replacements are built.**
This flips the **78 kit files** with near-zero churn for bucket 1 and scheduled
rewrites for bucket 2. **Exit:** adapters render stock Carbon; every retired
primitive has a Carbon-pattern replacement plan; a11y (keyboard/focus) parity
verified; visual baselines re-shot.

**Delivered 2026-08-02** (`frontend/src/carbon/adapters/`): the four highest-use
bucket-1 adapters — `StatusDot`→`Tag` (302 uses), `DataState`→`SkeletonText`+
`Tile` empty-state (243), `PageBreadcrumb`→`Breadcrumb` + `document.title` (116),
`ConfirmModal`→`Modal`(danger) (55) — each exposing the kit prop API so Wave 3
call-sites migrate by import swap (`@hcw/ui-kit` → `../carbon/adapters`). All
render stock Carbon, are exercised on `/carbon-spike`, and pass tsc/eslint/build;
the `breadcrumb` component was added to `carbon-tree.scss`. **Remaining bucket-1:**
`pushToast`/`ToastHost`→`ToastNotification` global container. **Bucket-2**
retirements are rewritten in Waves 3/5 as planned.

### Wave 3 — App MUI → Carbon, by domain (the bulk; 4–6 sprints)
Convert the **198 MUI files** screen-by-screen in dependency order. Suggested
tranches (each = its own PR, green before the next):
1. Shared components (`components/*` leaf UI, tables, forms) — highest reuse.
2. Studio Intelligence (`StudioAbstract.tsx`) + dashboard.
3. Projects · ProjectDetail (Estimation/Delivery/Tenders/Moodboard tabs).
4. Office · Finance (Proposals, Invoices, Tenders, Filing, Payroll).
5. Library · Third Parties · Team/HR · Admin/Users/Audit.
6. Portals (Client, Collaborator, Contractor) + Login/auth.
**Exit per tranche:** typecheck+lint green, visual baselines updated, no MUI
imports left in that tranche.

**Started 2026-08-02** — reference migration `components/portal/PortalLicenceCard.tsx`
(kit `Surface` + MUI `Stack`/`Typography` + kit `StatusDot` → stock Carbon
`Tile`/`Stack` + the `StatusDot` adapter, self-wrapped in `CarbonScope`). Also
emitted Carbon's typography utility classes (`.cds--type-*`) in `carbon-tree.scss`
— v11 ships none by default. **Per-file recipe** (tranche 1):
1. Swap kit primitives to `../carbon/adapters` (StatusDot/DataState/ConfirmModal/
   PageBreadcrumb) by import.
2. Replace MUI components with stock Carbon (§ 4.2 map); `Typography`→`.cds--type-*`
   on semantic tags; `Box`/`Stack` layout→Carbon `Stack` or a flex `div`.
3. Wrap the component's root in `<CarbonScope>` so it themes while its host is
   still on the kit (nested scopes are fine once the host migrates).
4. Remove all `@mui/*` and `@hcw/ui-kit` imports; `tsc` + `eslint` green; grep
   the file to confirm none remain.
5. Add any newly-used Carbon component to `carbon-tree.scss`.

**Tranche-1 progress (2026-08-02):** 14 shared leaves migrated — `PortalLicenceCard`,
`PageHeader`, `AdminSection`, `CardGridSkeleton`, `DocumentsSpecsPanel`,
`ProjectBriefPanel`, `DrawingsApprovalsPanel`, `ProjectDeliveryPanel`,
`CurrentPhaseSelect` (→ Carbon `Select`), `UpgradeToPro`, `GoogleIconCircle`,
`ErrorBoundary`, `AuthStageCanvas`, `EstiOrchestrationStatus` (glass `Surface`→
`Tile`), `StudioBreath` (native `useMediaQuery`), `RowActionsMenu` (→ Carbon
`OverflowMenu`), `DemoAdminUnlock` (→ Carbon `Modal`/`PasswordInput`), `WellnessReminderBanner`
(→ Carbon `Button` + icons), `StretchGuide`, `EyeExerciseGuide` (de-MUI'd), `PdfActionButtons`,
`ReleaseMetadataPanel`, `AccountsCarryForward`, `ProjectAppointment` (→ Carbon
`TextInput`/`TextArea`, `Button as={Link}`), `MigrationPanel` (hidden file input
+ `InlineNotification`), `UploadSecurityPanel` (→ Carbon `Toggle`/`PasswordInput`),
`VendorRateCompare`, `SubmissionThread` (both → Carbon `Table`/`TextInput`/
`TextArea` + adapters), `ContextualComments`, `ActivityTab` (→ Carbon `Select`/
`TextArea` + adapters), `EscalationSettingsPanel` (→ Carbon `NumberInput`/
`Toggle`), `WorkloadCalendarSync` (→ Carbon `TextInput readOnly`/`Select` + icons),
`TaskBoardTab` (→ Carbon `Grid`/`Column`/`Checkbox`/`Select` + adapters),
`ProjectSiteReference` (→ Carbon `Table`/`InlineNotification` + adapters),
`PeriodFilter` (shared FY filter → Carbon `Select`/`TextInput`), `PlanPdfCanvas`
(de-MUI'd canvas), `StorageSettingsPanel` (BYOS form → Carbon `Select`/
`TextInput`/`PasswordInput`/`InlineNotification`), `ProjectPhaseProgress`,
`LicensePanel` (→ Carbon `Grid`/`Select`/`TextInput`/`InlineNotification` +
adapters), `EomsCompliancePanel` (→ Carbon `Select`(helperText)/`TextInput`/
`InlineNotification` + adapter), `ProjectStructuralDefaultsPanel` (→ Carbon
`TextInput`/`InlineNotification`/`Button`) — 41 total, all stock Carbon, no
MUI/kit imports remaining, tsc+eslint+build green.

**Sub-tranche 3b — DataGrid (adapter built 2026-08-02):** **62 of the remaining
MUI files use `@mui/x-data-grid`** — the single biggest lever left.
`frontend/src/carbon/adapters/DataGrid.tsx` is a drop-in `DataGrid` + `GridColDef`
over stock Carbon `Table`/`TableHeader`/… so call-sites migrate by import swap
(`@mui/x-data-grid` → `../carbon/adapters`). It honours the MUI X **v9** signatures
(`valueGetter(value, row)`, `valueFormatter(value, row)`, `renderCell({row,id,value,field})`)
and the surveyed feature set (flex/width/minWidth/sortable/filterable/type/align,
getRowId, getRowClassName, onRowClick, density, loading, client-side sort +
pagination); `GridColDef`/props carry an index signature so unhandled MUI props
don't break the swap. First consumer migrated: `ProjectInvoicesPanel`
(tsc+eslint+build green). `pagination` added to `carbon-tree.scss`.
**Still needs browser QA** (sort behaviour, column widths/flex, pagination)
before rolling across the remaining files. Migrated so far via the adapter:
`ProjectInvoicesPanel`, `Tenders`, `Filing`, `MasterPlanLibrary` (4/62). Files with **vertical rail `Tabs`**
(e.g. `Filing`) or `useScreenActions` are deferred to the shell/nav sub-tranche —
Carbon core has no vertical tab component.
`text-area`/`toggle`/`number-input`/`checkbox` added to `carbon-tree.scss`.

`AuthRailLayout` deferred to the shell/marketing sub-tranche (glass-rail auth
shell with responsive `sx` — not a leaf swap).

**Deferred to a dedicated overlay pass:** `HeaderPomodoro`, `AiCarbon`, and
`ProjectRailNav`. The first two rely on a **portaled** MUI `Popover` to escape
the dock's `overflow`/`transform` clipping — Carbon `Popover`/`Toggletip` render
in-place and need clipping verification in a browser first. `ProjectRailNav` is
a restyled vertical nav that belongs with the shell/`GlassRail` sub-tranche
(don't restyle `Button` off-spec per §0).
`select`/`overflow-menu` added to `carbon-tree.scss`; `CarbonScope` now forwards
`as`/`className`/`style` for inline call-sites; `lib/useMediaQuery.ts` is the
MUI-free media-query hook. Remaining tranche-1 components follow the same recipe.

### Wave 4 — Icons (1 sprint, can overlap Wave 3)
Swap `@mui/icons-material` → `@carbon/icons-react` across the 93 files (mostly
mechanical name mapping). **Exit:** no `@mui/icons-material` imports remain.

### Wave 5 — Landing / marketing (1–2 sprints)
Rebuild the editorial system: retarget `landing.scss` (`esti-lp-*`) onto Carbon
tokens/type, and rebuild the marketing shell (rail/stage/dock without a taskbar,
`SectionDock`) on Carbon UI Shell + bespoke pieces. Redo `Landing.tsx` and the
other unauthenticated pages (`Login`, `/aproc`, `/aconsulting`) on Carbon.
Re-shoot marketing visual baselines. **Exit:** landing + marketing pages carry
no MUI/kit imports.

### Wave 6 — Decommission & governance (1 sprint)
Remove `@mui/material`, `@mui/icons-material`, `@hcw/ui-kit`, `vendor/hcw-ui-kit`,
`@fontsource/urbanist` (if dropped), the theme shims (`MuiRoot.tsx`,
`muiTheme.ts`), and any dead `--cds-*` compat. Rewrite the governance chain:
`CLAUDE.md` § UI, `HCW-UI-KIT.md` (mark superseded), `docs/hcw-kit/*`,
`HCW-KIT-AI-KNOWLEDGE-BASE.md`, the design-debt register, and the AI wiki index.
**Exit:** zero MUI/kit imports repo-wide; docs describe Carbon as canonical;
CI green; visual baselines final.

**Indicative total: ~10–14 sprints**, dominated by Wave 3. Waves 3 and 4 can
run in parallel across contributors once Wave 2 lands the shims.

---

## 6. Sequencing & dependency rules

- **Wave 2 before Wave 3** — the shims let the 198-file conversion reuse a
  Carbon-native `StatusDot`/`DataState`/etc. instead of rewriting them 300×.
- Both libraries coexist Waves 1–5; a screen is "done" only when it imports
  **neither** MUI nor the raw kit (only the Carbon-backed shims or Carbon direct).
- Do **not** touch `frontend/src/routes/Projects.tsx` and `Clients.tsx` without
  coordination — they carry ongoing parallel WIP (see CLAUDE.md § Conventions).
- Kit-first rule inverts: shared visual changes now land in the Carbon shims,
  not `hcwux`.

---

## 7. Verification & rollback

- **Per PR:** `tsc --noEmit` (contracts→backend→frontend), `eslint`, and the
  Playwright `visual` project. Baselines under
  `e2e/tests/visual-regression.spec.ts-snapshots/` are **re-captured per wave**
  and reviewed as part of the design sign-off (a changed baseline is expected —
  review it, don't rubber-stamp).
- **Accessibility:** Carbon ships WCAG-tested components; still re-run keyboard/
  focus/COGA checks per [`07-UX-REVIEW-CHECKLISTS.md`](../hcw-kit/07-UX-REVIEW-CHECKLISTS.md).
- **Rollback:** every wave/tranche is an isolated PR on top of a green `main`;
  because both libraries coexist until Wave 6, any tranche can be reverted
  without breaking already-migrated screens. Only Wave 6 is one-way — gate it
  behind full green CI + a tagged release.

---

## 8. Decisions — RESOLVED by § 0 (pure Carbon)

The governing rule settles these; recorded here for traceability.

1. **Visual identity** — **Carbon flat, wholesale.** Brand expression limited to
   the theme accent token + logo lockups; no component restyling.
2. **Glass & soft layers** — **dropped everywhere**, marketing included. Flat
   `Layer`/`Tile` only.
3. **Type** — **IBM Plex** (Carbon default). Urbanist retired.
4. **Spatial model** — **Carbon design principles with side-nav bars** (owner
   directive 2026-08-02). Rail · Stage · glass geometry is **omitted**, not
   reskinned. **Executed:** `RailLayout` (the shared authenticated-screen shell)
   reimplemented flat on Carbon tokens — a bordered side-nav column (heading ·
   section nav · filters · actions) beside a scrolling content area, no glass, no
   MUI. Local **vertical rail tabs move to horizontal Carbon `Tabs` in the
   content** (Carbon convention) — e.g. `Filing`. `ActionDock`/`useScreenActions`
   stay as plumbing until the global UI-Shell pass. ⚠️ This changes every
   authenticated screen's shell at once — **needs browser QA**.
5. **Monorepo** — retire `hcwux`/`vendor/hcw-ui-kit`; keep only a **thin adapter
   layer** (`frontend/src/carbon/`) that renders stock Carbon. No successor kit,
   no custom component library.
6. **Data-viz** — adopt the **IBM data-vis palette** (`@carbon/colors`).

## 9. Wave 0/1 spike — findings (done 2026-08-02)

A probe screen (`frontend/src/routes/CarbonSpike.tsx`, route `/carbon-spike`)
renders stock `@carbon/react` under a Carbon `<Theme>` inside the live app.

- **Integrates cleanly:** `@carbon/react@1.113` / `@carbon/icons-react@11` /
  `@carbon/styles@1.112` install and peer-support React 19; frontend `tsc` +
  `eslint` green; `vite build` succeeds and code-splits Carbon into its own
  `vendor-carbon` chunk (~197 kB / ~57 kB gzip) — loaded only on Carbon routes.
- **Confirmed risk:** importing `@carbon/styles` global CSS applies Carbon's
  reset + base type app-wide once loaded, and its `:root --cds-*` tokens overlap
  the frozen compat block in `styles.scss`. **Wave 1 must scope Carbon styles**
  (Sass `@use` with a layer, or a scoped build) before Carbon lands on shared
  screens. The spike keeps it isolated to `/carbon-spike`.
- **Verdict:** the roadmap is sound; proceed to Wave 1 foundation.

---

## 10. Doc chain to update at Wave 6

`CLAUDE.md` (§ UI / design system, structural-CSS notes) ·
[`HCW-UI-KIT.md`](HCW-UI-KIT.md) (mark superseded) ·
[`HCW-KIT-AI-KNOWLEDGE-BASE.md`](HCW-KIT-AI-KNOWLEDGE-BASE.md) ·
[`docs/hcw-kit/README.md`](../hcw-kit/README.md) 00–14 ·
[`DESIGN-DEBT-REGISTER.md`](../hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md) ·
[`13-ROADMAPS.md`](../hcw-kit/13-ROADMAPS.md) · the AI wiki index
(`backend/src/lib/ai/wiki-knowledge.generated.ts`).
