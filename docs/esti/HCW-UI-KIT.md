# HCW-UI-Kit — the layered design system

**UX principles (why):** **[HCW-UI-UX-PRINCIPLES.md](HCW-UI-UX-PRINCIPLES.md)** — laws,
spatial roles, dock contract, a11y, and screen review checklist. **This document (how):**
tokens, layers, components, and SCSS. **Live showcase:** `/design-system` on the public site.

**HCW-UI-Kit** (*Human Centric Works UI Kit*, package `@hcw/ui-kit`) is the single,
centralised design system deployed against **every** AORMS surface — **AORMS-Studio**
(the advisory workspace), client & consultant portals, the licensing console, ESE, the Estimate
app, and any future deployable. Change a token or a primitive here and every
surface that mounts the kit moves together.

## Redesign workflow — kit first

When you change how a **shared** element looks (ActionDock button, SectionDock
chip, dialog shell, layer recipe), update it **once** in `@hcw/ui-kit` and let
every portal inherit the change. Do **not** fork rgba/blur/radius recipes in
`frontend/src/glass.scss`, `landing.scss`, or page SCSS.

| Step | Where | What |
|------|--------|------|
| 1 | `src/tokens.ts` | Colours, radii (`BUTTON_RADIUS`, `DOCK_PILL_RADIUS`, `DIALOG_RADIUS`), layer recipes (`ACTION_DOCK_TRAY`, `LIQUID_GLASS_BUTTON`, `SECTION_DOCK_CHIP_GLASS`, …) |
| 2 | `src/chrome-sx.ts` | Shared MUI `sx` helpers (`actionDockButtonSx`, `sectionDockChipSx`, …) |
| 3 | Kit component | `ActionDock.tsx`, `SectionDock.tsx`, `theme.ts` (`MuiDialog`, `MuiButton`, …) |
| 4 | `src/portal-chrome.scss` | Portal-wide class enforcement (imported once in `frontend/src/main.tsx`) |
| 5 | `/design-system` | Specimens must use **real kit components** or import `*Sx` helpers — not hand-rolled CSS |
| 6 | `landing.scss` | **Layout/editorial only** (contours, marketing atmosphere, hero grid). No duplicate glass recipes |

After editing the kit in Docker dev, sync or restart `esti-frontend` so the bind
mount picks up `src` (Windows mounts can lag).

## Thesis — *depth encodes importance*

Three material languages are stacked by visual depth. **The flatter and calmer a
thing is, the more it is "just information"; the more it lifts, softens, or glows,
the more it is "an object you act within" or "an action/alert that wants you now."**
You never pick a layer by taste — you pick it by the element's **role**.

| Layer | Language | Material | Used for | Job |
|---|---|---|---|---|
| **1** | **Hyperminimalist** | FLAT — Fog-Gray canvas, Pure-White, hairline rules, no box, no shadow | data tables, body text, headings, labels, inputs **at rest** (~90% of pixels) | legibility, calm |
| **2** | **Neumorphic** | SOFT — same-material block extruded/recessed with soft dual shadows, no border | dialogs, text panels, widgets, highlight / summary cards, text-entry wells | "a physical object you work within" |
| **3** | **Glassmorphism** | GLASS — translucent frosted glass, blur + light edge, floats above everything | **hover states, CTAs, the action dock, priority notifications, active/important widgets** | attention + action |

Mnemonic: **Flat = info at rest · Soft = objects you handle · Glass = actions &
alerts that rise to the top.** The single Radiant-Orange accent concentrates in
Layer 3, so *actionability itself* is what glows.

**Shape:** `RADIUS` is **0** on every surface (panels, inputs, rails, menus,
chips). **`BUTTON_RADIUS` (4px)** on generic `MuiButton`. **`DOCK_PILL_RADIUS`
(capsule / 9999px)** on the **ActionDock tray** (`ACTION_DOCK_TRAY`) and dock
buttons (flat pill at rest → liquid-glass capsule on hover). **`DIALOG_RADIUS`
(8px)** on `MuiDialog` paper.

**Tabs:** rectangular, **transparent** (no selected fill). The active tab shows a
**top alert line** (`TAB_ALERT_WIDTH` inset rule in Radiant Orange) — not a
bottom slider or background wash.

In code the layer recipes are tokens (`LAYERS.flat|soft|glass|clearGlass|headingGlass`,
`NEU_RAISED`, `ACTION_DOCK_TRAY`, `GLASS_SURFACE`, `CLEAR_GLASS_SURFACE`,
`HEADING_GLASS_SURFACE`, the recessed `NEU_INSET` for inputs, `NEU_POP` for
dialogs), and the `<Surface layer="…">` primitive applies them:

```tsx
<Surface layer="soft" sx={{ p: 2 }}>…a summary card…</Surface>        // Layer 2
<Surface layer="glass" sx={{ p: 2 }}>…a priority alert…</Surface>     // aliases soft (deprecation)
```

### Layer decision tree

```
Is it a page-level CTA?                    → ActionDock / MarketingLandingDock (not a Surface)
Is it information at rest (table/text)?    → flat
Is it a contained object (dialog/panel)?   → soft
Is it actionable / alert / dock chrome?    → soft raised (+ accent where needed)
Is it a marketing sub-card / tile?         → flat (transparent + hairline — NO glass)
```

**Do not** put glass on every card. Pure neumorphism is opaque — Fog Gray canvas,
soft chrome, Radiant Orange only for true accent.

## Spatial model — Ribbon · Stage · Footer · Dock · Clock

**Canon:** [PAGE-STRUCTURE.md](PAGE-STRUCTURE.md) (2026-08). **Left rail retired** on
marketing and staff apps. Portals keep SoftRail until the portal redesign.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  TOP RIBBON (soft neu) — brand / primary nav                             │
├──────────────────────────────────────────────────────────────────────────┤
│  STAGE (full width) — page header + working surface                      │
│                         ╭─ ActionDock / MarketingLandingDock ─╮          │
├──────────────────────────────────────────────────────────────────────────┤
│  Taskbar footer (staff) · AnalogueClock (± Pomodoro)                     │
└──────────────────────────────────────────────────────────────────────────┘
```

| Region | Width | Layer | Role |
|--------|-------|-------|------|
| **Top ribbon** | full content / shell | Soft (L2) | Marketing: brand only. Staff: `AppRibbon` primary nav. |
| **Stage** | full width | Flat (L1) + soft cards (L2) | Working surface / long-form story. Staff lists use `RailLayout` as a **stage page shell** (header strip + full-width main — no left column). |
| **TaskbarFooter** | full width · staff only | Soft (L2) | Calculator · launcher cluster · tray. Absent on marketing. |
| **ActionDock** | staff · bottom | Soft tray | Page-level CTAs via `useScreenActions`. |
| **MarketingLandingDock** | marketing · bottom | Soft | Section spy + Sign in / Create / Downloads / Calculator. |
| **Clock** | fixed bottom-right | Soft | Marketing `MarketingClockPomodoro`; staff kit `AnalogueClock`. |

### Marketing shell — public site (`MarketingNeuFrame`)

**Status: final UI (2026-08)** on `aorms.in` (`Landing.tsx` + `MarketingNeuFrame` /
`MarketingShell` + `landing.scss`). Content column **1200px**
(`MARKETING_CONTENT_MAX_PX`).

| Region | Marketing rule |
|--------|----------------|
| **Top bar** | Sticky soft-neu brand ribbon (`MarketingTopBar`) — logo + expansion. |
| **Stage** | Scrolls; single `#lp-main` / `#lp2-main` landmark. Landing IA: Overview · Outcomes · Platform · Rhythm · Start. |
| **TaskbarFooter** | **Absent**. |
| **Bottom dock** | `MarketingLandingDock` — section links + auth/tool actions. **Not** staff ActionDock. |
| **Atmosphere** | Optional `LandingEntourage` (buildings) — marketing only. |

#### Hero composition (brand test)

First viewport must read as **one composition**:

1. **AORMS logo** (`<AormsLogo variant="hero" />` — CSS-mask `/aorms-logo.png`, Radiant Orange) — **not** plain text “AORMS”
2. One headline (`h1`)
3. One short supporting sentence
4. CTA group + optional `WorkspacePreview` — section nav lives in the bottom dock

#### Contour atmosphere (Layer 0)

`LandingContours` is a fixed, non-interactive backdrop (chaos → clarity hill).
Depth is scroll-driven via `--lp-depth` (**0.08 → 1 across the full page
scroll range**, not mid-fold). Progress uses smoothstep + frame lerp so the
hill keeps elevating through the footer. **Z-stack steps are 3× the 2026-07
baseline** so elevation reads clearly:

| Token | Value (3×) | Role |
|-------|------------|------|
| `--lp-step-far` | `42px` | far-band `translateZ` step |
| `--lp-step-mid` | `66px` | mid-band `translateZ` step |
| `--lp-step-near` | `90px` | near-band `translateZ` step |
| `--lp-rise-far/mid/near` | `30 / 48 / 72px` | vertical stack rise |

Owned in `landing.scss` (editorial marketing system) — **not** in `@hcw/ui-kit`
tokens. Kit owns workspace/portal chrome; marketing atmosphere stays in
`landing.scss` so blur/rgba/3-D exceptions do not leak into product screens.

#### Marketing stage materials

| Surface | Treatment | Why |
|---------|-----------|-----|
| **Chrome** (top bar · bottom dock) | Opaque soft neu · 8px | Instruments without glass |
| **Section / outcome cards** | Soft or flat Surfaces | Depth by role |
| **Sub-tiles** | Flat + hairline | Calm information |

Do **not** put `backdrop-filter` on marketing tiles. Prefer kit tokens / `Surface`.

#### FAQ & progressive disclosure

Long FAQ answers use accordion / `<details>` — not a wall of open tiles.
Trust / outcome chips stay capacity-capped (Miller).

#### Brand assets

| Surface | Primitive |
|---------|-----------|
| Marketing hero / ribbon / footer | `AormsLogo` (`frontend`) — mask logo |
| Kit-portable wordmark (no image) | `<BrandMark />` from `@hcw/ui-kit` |
| Auth card | `AuthBrandBlock` / `AormsLogo variant="rail"` |

### Staff stage — canonical reference

**Status: final UI (2026-08).** Shell: `App.tsx` — ribbon · stage · ActionDock ·
footer · AnalogueClock. Page wrapper: `RailLayout` (stage header + full-width main).

Studio Intelligence (`StudioAbstract.tsx`) keeps KPI / zone / tab anatomy **in the
stage** (no left SoftRail). Zone health and KPIs live in the stage head.

#### Login & auth — centered soft card

Unauthenticated forms use `AuthRailLayout` — a **centered soft-neu card** on Fog
Gray (file name is legacy; there is no left rail). autoComplete on identity fields;
errors inline; single submit with progress verb.

#### Shared shell for other screens

`frontend/src/components/RailLayout.tsx` —
`<RailLayout title tabs aside actions>{children}</RailLayout>`.

Renders a soft **stage header** (title · description · horizontal tabs · filter
strip · actions) above a full-width scrolling main. **Left column retired 2026-08.**
Prefer `useScreenActions` for primary create/commit CTAs.

### The action dock — one dock, three zones

A screen never renders its own CTAs; it **publishes** them to the global dock,
which lays them out in three fixed zones so the geography is identical everywhere:

| Zone | Meaning | Examples | Tone |
|---|---|---|---|
| **LEFT** | exit / destroy | Delete · Discard / Save-without-changes · Cancel | `danger` (red) |
| **CENTER** | generate | Add · Create · New | `primary` (orange) |
| **RIGHT** | commit | Save · Edit · Save-changes · Confirm | `primary` (orange) |

Create in the middle, commit on the right, destroy on the left — muscle memory
across the whole product (and Fitts's-law-friendly big targets). The dock tray is
a **neumorphic capsule** (`ACTION_DOCK_TRAY`); dock buttons are **flat pills at
rest** and **lift to liquid-glass capsules** on hover/focus. The dock hides itself
when no screen has published actions.

```tsx
// In a screen — declare actions; they appear in the dock, clear on unmount.
useScreenActions(
  [
    { id: "delete", zone: "left",   tone: "danger",  label: "Delete", icon: <Delete/>,  onClick: onDelete, disabled: !selected },
    { id: "new",    zone: "center", tone: "primary", label: "New",    icon: <Add/>,     onClick: onNew },
    { id: "save",   zone: "right",  tone: "primary", label: "Save",   icon: <Save/>,    onClick: onSave,   disabled: !dirty },
  ],
  [selected, dirty],
);
```

## Mounting the kit in a portal

```tsx
import {
  KitRoot, ActionDockProvider, ActionDock, SectionDock, TaskbarFooter, TaskbarButton,
  GlassRail, Surface, useScreenActions, HealthGlassOrb, setUxEventSink,
} from "@hcw/ui-kit";

setUxEventSink((name, payload) => analytics.track(name, payload));

<KitRoot density="comfortable" coga="default">
  <ActionDockProvider>
    <GlassRail glass="frost" rail={<>…</>}>
      <Routes />
    </GlassRail>
    <ActionDock />
    <TaskbarFooter left={…} center={…} right={…} />
  </ActionDockProvider>
</KitRoot>
```

(`MuiRoot` / `createAormsTheme` remain as deprecated aliases of `KitRoot` / `createHcwTheme`.)

Add `"@hcw/ui-kit": "workspace:*"` to the portal's `package.json`, and import the
brand font once (`@fontsource/urbanist` weights 400/500/600/700).

## What's in the package

```
src/
├─ tokens.ts           SCHEMES · TYPE_SCALE · LAYERS · CAPACITY · INTERRUPTION ·
│                      COGA · TRUST · STATUS_SHAPE · DENSITY · LAYOUT · DATA_VIZ*
├─ theme.ts            createHcwTheme({ scheme?, density?, coga? }) · hcwTheme
├─ chrome-sx.ts        layoutSx · chromeIconSx · chromeIconSxFor · typeScaleSx ·
│                      searchFieldSx · actionDockButtonSx …
├─ charts.ts · pictograms.ts
├─ capacity.ts · uxEvents.ts
├─ portal-chrome.scss
├─ KitRoot.tsx         (alias MuiRoot) — scheme · density · coga
├─ Surface · GlassRail · HealthGlassOrb · BrandMark
├─ ActionDock · SectionDock · TaskbarFooter
├─ StatusDot · DataState · ConfirmModal · PageBreadcrumb · Avatar · Toast
├─ AwarenessStrip · ActionOutcome* · KpiStrip
└─ orchestration.tsx   MissionHeader · ObjectiveList · PhaseStrip ·
                       ConfidenceBand · DecisionQueue · FreezeTable (T10)
```

Full attribute tables: [14-HCW-CATALOG.md](../hcw-kit/14-HCW-CATALOG.md).
Versioned from **0.1.0** — [`CHANGELOG.md`](../../CHANGELOG.md).
AI audit contract: [HCW-KIT-AI-KNOWLEDGE-BASE.md](HCW-KIT-AI-KNOWLEDGE-BASE.md).

Source-only (like `@esti/contracts`); the consuming portal's bundler compiles it.
Colour + shape live ONLY here (and, for the landing page's editorial type scale /
contour atmosphere, in `landing.scss`).

Package README: [`README.md`](../../README.md).

## Adoption status & path

**Shipped (2026-07):**
- **Glass Rail reference complete** on Studio Intelligence (`/`): full-viewport-height
  frosted rail, independent stage scroll, stage-head zone health, glass taskbar footer.
  Canonical spec: [§ Glass Rail](#glass-rail--canonical-reference-studio-intelligence).
  Rollout: [AORMS-UI-AUTOPILOT-ROADMAP.md](AORMS-UI-AUTOPILOT-ROADMAP.md) **U0–U6 ✅**.
- **Marketing shell complete** on public site: clear-glass rail · full-width heading
  glass · flat sub-cards · hero logo · contour z-depth 3× · full-page scroll depth ·
  dock-only CTAs · FAQ 3-up. Spec:
  [§ Marketing shell](#marketing-shell--public-site-marketingshell).
- **Kit exports (1.3+):** spatial chrome, psychology pack, T10 orchestration, density,
  COGA calm, `logUxEvent` telemetry, charts/pictograms, catalog.
- Workspace + marketing mount `ActionDockProvider` + `ActionDock`.
- **Taskbar footer** live (`AppFooterBar`); FloatingDock retired.
- Layer 3 via theme: button hover glass; error/warning alerts tinted glass.

**Remaining (incremental):**
1. Estimate app E1 UI pivot — **N/A** (no `estimate/` tree); active cost UI follows [COST-MANAGEMENT-SYSTEM.md](COST-MANAGEMENT-SYSTEM.md) rebuild.
2. Optional: marketing SCSS rail/heads import kit clear-glass tokens instead of
   duplicated rgba recipes.
3. Optional further shrink of `glass.scss` once orb class aliases fully migrate
   (`hcw-health-glass-orb*`).
4. `Projects.tsx` / `Clients.tsx` remain parallel-WIP — do not edit unless asked.
5. Roadmap remainders (product/DesignOps only): full i18n catalogs · Figma
   **component** library — kit halves shipped in 1.4.0 ([13-ROADMAPS.md](../hcw-kit/13-ROADMAPS.md)).