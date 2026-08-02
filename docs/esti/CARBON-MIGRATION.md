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
| `Surface layer="glass"` | `Tile` (raised) / bespoke | **drop glass** or keep as brand override (§8) |
| `GlassRail` | UI Shell `SideNav` + `Header` | rebuild; auth forms move off the rail |
| `ActionDock` + `useScreenActions` | **bespoke** (keep the hook; restyle on Carbon `Button`) | no Carbon analogue |
| `StatusDot` (302) | small status glyph + `Tag`/text (keep shape channel) | wrap once, migrate call-sites by import swap |
| `DataState` (243) | `SkeletonText`/`SkeletonPlaceholder` + empty-state | wrap once |
| `PageBreadcrumb` (116) | `Breadcrumb` + `document.title` side-effect | wrap once |
| `ConfirmModal` (55) | `Modal`/`ComposedModal` (`danger`) | wrap once |
| `ToastHost`/`pushToast` (68) | `ToastNotification` + container + `pushToast` shim | keep the API, swap the renderer |
| `KpiStrip` / `MissionHeader` / `DecisionQueue` / `AwarenessStrip` | bespoke on Carbon `Tile`/type tokens | reimplement |
| `HealthGlassOrb` / `BrandMark` / `Avatar`+`getInitials` | bespoke (Carbon has no Avatar) | reimplement |
| `TaskbarFooter` / `SectionDock` | bespoke on UI Shell | reimplement |
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

### Wave 1 — Foundation (1 sprint)
Add `@carbon/react`, `@carbon/styles`, `@carbon/icons-react`, IBM Plex fonts.
Mount `<GlobalTheme>`/`<Theme>` at the app root (co-existing with `KitRoot`).
Convert the `--cds-*` compat block to real `@carbon/styles` tokens. Establish
the Carbon theme (scheme ↔ `white`/`g10`/`g90`/`g100`, density, and — if kept —
Radiant Orange as the interactive/accent token override). **Exit:** Carbon
tokens/type live globally; no visual regressions on existing screens (kit still
renders); build + CSP green.

### Wave 2 — Primitive parity shims (1–2 sprints)
Reimplement the ~20 kit primitives as **Carbon-backed components exposed under
the same import names/props** (`StatusDot`, `DataState`, `PageBreadcrumb`,
`ConfirmModal`, `ToastHost`/`pushToast`, `Surface`, `ActionDock`+`useScreenActions`,
`KpiStrip`, `Avatar`, `BrandMark`, `HealthGlassOrb`, `SectionDock`,
`TaskbarFooter`). This flips the **78 kit files** to Carbon with near-zero
call-site churn by changing what the shim renders. **Exit:** kit imports render
Carbon internally; the 78 files are visually on Carbon; a11y (keyboard/focus)
parity verified; visual baselines re-shot.

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

## 8. Open decisions (settle in Wave 0)

1. **Visual identity** — adopt Carbon's flat language wholesale, or keep the HCW
   brand (Radiant Orange accent, Urbanist) as a Carbon theme override? This
   drives Waves 1/5 heavily.
2. **Glass & soft layers** — drop entirely for Carbon's flat `Layer`, or
   preserve glass only on marketing (`landing.scss`) as a bespoke exception?
3. **Type** — IBM Plex (Carbon default) vs. keep Urbanist via a type-token
   override.
4. **Spatial model** — replace Rail · Stage · Dock with Carbon UI Shell, or keep
   the bespoke shell skinned with Carbon tokens? (`ActionDock` has no Carbon
   analogue either way.)
5. **Monorepo** — retire `hcwux`/`vendor/hcw-ui-kit` and own a thin
   `frontend/src/carbon/` shim layer, vs. publish a Carbon-based successor kit.
6. **Data-viz** — move `DATA_VIZ` canvas palette to IBM's data-vis palette, or
   keep the current one.

---

## 9. Doc chain to update at Wave 6

`CLAUDE.md` (§ UI / design system, structural-CSS notes) ·
[`HCW-UI-KIT.md`](HCW-UI-KIT.md) (mark superseded) ·
[`HCW-KIT-AI-KNOWLEDGE-BASE.md`](HCW-KIT-AI-KNOWLEDGE-BASE.md) ·
[`docs/hcw-kit/README.md`](../hcw-kit/README.md) 00–14 ·
[`DESIGN-DEBT-REGISTER.md`](../hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md) ·
[`13-ROADMAPS.md`](../hcw-kit/13-ROADMAPS.md) · the AI wiki index
(`backend/src/lib/ai/wiki-knowledge.generated.ts`).
