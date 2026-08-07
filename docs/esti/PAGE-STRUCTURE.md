# AORMS — page structure, colours, elements & tokens

**Status:** Canonical · **Adopted:** 2026-08-06 · **Updated:** 2026-08-07 · **Owner:** HCW  
**Reference UI:** platform landing (`Landing.tsx` + `MarketingNeuFrame`) — final language for marketing, staff apps, and portals.

Where this disagrees with older “glass rail · 20%” wording, **this wins**. Historical notes stay in [CARBON-MIGRATION.md](CARBON-MIGRATION.md).

Companion how-to: [HCW-UI-KIT.md](HCW-UI-KIT.md) · Templates: [05-TEMPLATES.md](../hcw-kit/05-TEMPLATES.md) · Nav IA: [NAVIGATION.md](NAVIGATION.md) · Chrome inventory: [UI-SITE-MAP.md](UI-SITE-MAP.md).

---

## Spatial model (no left rail)

```
┌────────────────────────────────────────────────────────────┐
│  TOP RIBBON (soft neu) — brand / primary nav               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  STAGE (full width) — working surface / story              │
│                                                            │
│                     ╭─ bottom dock ─╮                      │
│                     │ section · CTA │                      │
├────────────────────────────────────────────────────────────┤
│  TASKBAR FOOTER (staff only) · CLOCK (± Pomodoro)         │
└────────────────────────────────────────────────────────────┘
```

| Region | Marketing | Staff apps (AStudio / AConsulting / AProc) | Portals |
| --- | --- | --- | --- |
| **Top ribbon** | `MarketingTopBar` — logo + expansion | `AppRibbon` — soft sticky neu bar + primary nav | `PortalNeuFrame` top bar — brand/nav or portal identity + sign-out |
| **Stage** | Full width · content column **1200px** | `.esti-app-content2` full width under ribbon | Full width · **1200px** (`PortalNeuFrame`) |
| **Bottom dock** | `MarketingLandingDock` — section spy + Sign in / Create / Downloads / Calculator | Kit `ActionDock` + `useScreenActions` | None (dock-less by design) |
| **Footer** | Inline marketing footer in content | `AppFooterBar` — calc · launchers · tray | None |
| **Clock** | `MarketingClockPomodoro` bottom-right | Kit `AnalogueClock` bottom-right (single) | Kit `AnalogueClock` bottom-right |
| **Left rail** | **Retired** | **Retired** | **Retired** |

**Retired:** GlassRail / SoftRail as primary chrome · marketing clear-glass floating rail · `RailLayout` left Carbon column (replaced by full-width stage header — export name kept).

---

## Colour & tokens

| Token / role | Value | Use |
| --- | --- | --- |
| Fog Gray canvas | `#F2F4F7` · `colors.background` · `--lp-bg` | Page / stage background |
| Pure White | `#FFFFFF` · `--lp-bg-soft` | Flat cards at rest |
| Quiet muted | `#E7EAF0` · `--lp-bg-muted` | Secondary wells |
| Coal Black ink | `#141517` · `--lp-ink` | Primary text |
| Ink muted / faint | `#5B616B` / `#8A9099` | Secondary / helper |
| Radiant Orange | `#FF4F18` · `--lp-accent` / `--esti-brand-accent` | Single accent (fills → white text; links stay slate) |
| Accent hover | `#DB3E0F` · `--lp-accent-hover` | Hover on accent fills |
| Accent glow | `transparent` | **No glow** |
| Soft radius | **8px** · kit `RADIUS` · `--lp-radius` / `--esti-mkt-chrome-radius` | Soft-square product radius |
| Brand font | **Urbanist** (`--lp-font`) | All UI; calculator result may use VT323 |
| Content max | **1200px** · `MARKETING_CONTENT_MAX_PX` | Marketing column; staff stage uses shell gutters |

**Layers (opaque pure neumorphism — no glass chrome):**

1. **FLAT** — tables, text, headings, info at rest  
2. **SOFT RAISED** — ribbon, docks, dialogs, page headers, highlight cards (`Surface layer="soft"`)  
3. **SOFT ATTENTION** — inset wells, focus, alerts; legacy `layer="glass"` aliases soft raised during deprecation  

Do not hard-code hex in product UI — use kit tokens / theme. Marketing CSS vars live under `.esti-lp` / `.esti-lp-neu` in `landing.scss`.

---

## Elements inventory

### Marketing (`frontend/src/components/landing/`)

| Element | Role |
| --- | --- |
| `MarketingNeuFrame` | Full-page Fog Gray frame + top bar + stage + clock |
| `MarketingTopBar` | Sticky soft brand ribbon |
| `MarketingLandingDock` | Fixed bottom section + auth/tool actions |
| `MarketingClockPomodoro` | Analogue clock + Pomodoro |
| `LandingEntourage` | Decorative isometric buildings (parallax; marketing only) |
| `LandingWellbeingWidget` | In-flow wellbeing + inline `WellnessPanel` |
| `MarketingShell` | Blog / Downloads / etc. — wraps `MarketingNeuFrame` |

Landing IA (five sections): **Overview · Outcomes · Platform · Rhythm · Start**.

### Staff page shell

| Element | Role |
| --- | --- |
| `RailLayout` | **Stage page shell** (name kept) — soft header (title · description · tabs · filters · actions) + full-width scrolling main. **No left column.** |
| `PageBreadcrumb` | Wayfinding + `document.title` |
| `ActionDock` / `useScreenActions` | Page-level CTAs only here (publish `[]` while dialogs open) |
| `AppRibbon` · `AppFooterBar` · `AnalogueClock` | Global chrome in `App.tsx` |
| `Surface` · `StatusDot` · `DataState` · `KpiStrip` · `ConfirmModal` | Kit primitives |

### Auth

| Element | Role |
| --- | --- |
| `AuthRailLayout` | **Centered soft-neu card** (file name legacy — not a left rail) |

### Portals (`frontend/src/components/portal/`)

| Element | Role |
| --- | --- |
| `PortalNeuFrame` | Shared no-rail frame — soft top bar · 1200px stage · AnalogueClock |
| `PortalShell` | Account / company / licensing hub — horizontal nav in top bar |
| `ExternalPortalShell` | Client / consultant / contractor / site — identity + sign-out in top bar |

---

## Page header contract (staff lists / details)

```
┌─ Surface soft — stage header ──────────────────────────────────┐
│ title · description                              [actions]     │
│ tabs (horizontal)                                              │
│ aside / filters strip                                          │
└────────────────────────────────────────────────────────────────┘
┌─ main (flex 1, scroll) ────────────────────────────────────────┐
│ breadcrumb · toolbar · DataState / DataGrid / facet panels     │
└────────────────────────────────────────────────────────────────┘
```

Primary create/commit actions still belong in **ActionDock**, not duplicated as permanent header CTAs when the dock is mounted.

---

## Do / don’t

**Do**

- One spatial model: ribbon · stage · dock · (staff) footer · clock  
- Soft neu chrome; flat content; Radiant Orange only for true accent  
- Marketing content width 1200px; wellbeing in-flow on Rhythm  

**Don’t**

- Reintroduce a left glass / SoftRail on staff, marketing, or portals  
- Put glass on every card or invent accent glows  
- Put staff ActionDock on marketing (use `MarketingLandingDock`) or portals  
- Apply building entourage inside authenticated apps or portals  
