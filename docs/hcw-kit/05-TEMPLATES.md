# Page templates — canonical anatomies

**Status:** Updated 2026-08-07 (no-rail soft neu · portals on `PortalNeuFrame`). These are not new inventions
(Constitution VI): each template names its live reference — clone that, don't
improvise. Shell contract: **ribbon · stage · taskbar footer · ActionDock · clock**
([PAGE-STRUCTURE.md](../esti/PAGE-STRUCTURE.md) · [UI-SITE-MAP.md](../esti/UI-SITE-MAP.md)). Breadcrumb + `document.title` via
`PageBreadcrumb`; CTAs via `useScreenActions`. **Left rail retired** on staff,
marketing, and portals.

## T1 — Dashboard (reference: `StudioAbstract.tsx`, route `/`)

```
STAGE (full width under AppRibbon)
├ stage head: zone-health / attention (shape-coded)
├ ≤4 KPI cards (TYPE_SCALE.kpi values)
├ tab strip (transparent, inset top alert line)
└ per-tab: 4 KPIs + one DataGrid that scrolls inside its tile
Footer · ActionDock · AnalogueClock (shell)
```
Rules: ≤4 KPIs visible (Miller); health = shape + colour; numbers drill through.
No left SoftRail / GlassRail.

## T2 — List / register (reference: `Consultants.tsx`, `Invoices.tsx`)

```
RailLayout (stage page shell — soft header + full-width main)
├ header: title · description · optional tabs · aside filters · actions
├ PageBreadcrumb (in main)
├ Box sx={layoutSx.listToolbar} — search + filters
├ optional success Alert (dismissible)
└ DataState → DataGrid (≤8 columns · StatusDot · RowActionsMenu)
Dock: CENTER "New <object>" · dialog publishes [] while open
Create/edit = Dialog — never an always-visible form
```

## T3 — Detail (reference: `ProjectDetail.tsx`)

```
RailLayout · PageBreadcrumb (list → this record, 2–4 levels)
├ header: record identity + StatusDot
├ tab strip for facets (each facet = its own panel)
└ facet panels own queries; mutations carry meta.errorTitle
Dock: RIGHT commit · LEFT destroy (ConfirmModal)
```

## T4 — Settings / preferences (reference: `WorkspaceSettingsPanel.tsx`)

```
Stacked `esti-form-panel` blocks, one concern each (Appearance · Photo ·
Password · 2FA…), subtitle1 headings, helper text via esti-label--helper.
Success = dismissible Alert or toast; every mutation pending-disables its button.
```

## T5 — Auth (reference: `Login.tsx` + `AuthRailLayout` + `AuthSplitCard`)

```
AuthRailLayout: horizontal soft-neu brand|form card on Fog Gray
· MarketingTopBar · pinned tabs Workspace · Portals · Account
· Account scopes Personal · Company · Licensing (?scope=)
· AuthBrandPane · AuthLabeledField · autoComplete · errors inline · single submit
· Legacy /access → ?tab=portals; company/licensing unauth → Account scopes
```

## T6 — Portal (external + account hubs) (reference: `Portal.tsx` + `ExternalPortalShell` / `PortalShell`)

```
PortalNeuFrame (no left SoftRail) — tokens: lib/portal-chrome.ts
├ soft top bar — 1200px column · 16px inset · min-height 56
├ stage — 1200px · hub panels / request forms / account tabs
├ floating FirmPortalFooter — 60px · same column as top · calc · sections · power
├ ActionDock (CLIENT only) — Change request · Feedback · Schedule meeting
└ AormsAnalogueClock 100px (AORMS mark in dial) — clears footer stack
Account hubs: PortalCard (soft) for Overview / Companies / Profile / Security panels.
All firm portals inherit heights/location via PortalNeuFrame + PORTAL_CHROME.
```

## T7 — Marketing page (reference: `Landing.tsx` + `MarketingNeuFrame`)

```
MarketingNeuFrame / MarketingShell:
├ MarketingTopBar (sticky soft brand ribbon)
├ stage — 1200px content column · single #lp-main
├ MarketingLandingDock (section spy + Blog / Downloads / Sign in / Calculator)
└ MarketingClockPomodoro
Landing sections: Overview · Outcomes · Platform · Rhythm · Start.
Soft/flat Surfaces only — no left rail, no staff ActionDock on marketing.
```

## T8 — Report / document output (reference: `Filing.tsx`, PDF cells)

```
List template (T2) + per-row generate/download actions; generation shows an
honest busy state and lands the output action in place. Money via formatINR;
en-IN dates.
```

## T9 — Wizard / multi-step flow (reference: `AccountHub.tsx`)

```
Multi-step guided flow on the shell contract:
├ STAGE HEADER / aside strip — step progress (Stepper or checklist)
├ STAGE — CURRENT step only (one concern; never the whole flow at once)
└ DOCK — LEFT "Back" · RIGHT "Next" / "Finish" — publish [] while Dialog open
```
Rules: goal-gradient progress visible; one step = one decision; Next disabled
until valid; completed steps editable.

## T10 — AI / mission orchestration (reference: kit primitives)

```
RailLayout (stage shell — no left GlassRail)
├ MissionHeader · AwarenessStrip · ObjectiveList · ConfidenceBand (in header / stage)
├ PhaseStrip · DecisionQueue · FreezeTable · risks / artifacts
└ DOCK — LEFT reject/defer · CENTER alternative · RIGHT approve/freeze
   publish [] while decision Dialog open
```

Four questions above the fold (≤30s): mission · done · needs judgment · next.
Compose from `@hcw/ui-kit` — do not invent a fifth chrome region.

---

*Template catalog complete (T1–T10). Register a D-item only if a new pattern is
needed without a shipped reference to clone.*
