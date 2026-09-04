# AORMS — page structure, colours, elements & tokens

**Status:** Canonical · **Adopted:** 2026-08-06 · **Updated:** 2026-08-09 · **Owner:** HCW  
**Reference UI:** platform landing (`Landing.tsx` + `MarketingNeuFrame`) — final language for marketing, staff apps, and portals. Staff taskbar + ActionDock clearance share firm-portal chrome tokens (`PORTAL_CHROME`).

Where this disagrees with older “glass rail · 20%” wording, **this wins**. Historical notes stay in [CARBON-MIGRATION.md](CARBON-MIGRATION.md).

Companion how-to: [HCW-UI-KIT.md](HCW-UI-KIT.md) · Composition: [COMPOSITION-PRINCIPLES.md](COMPOSITION-PRINCIPLES.md) · Templates: [05-TEMPLATES.md](../hcw-kit/05-TEMPLATES.md) · Nav IA: [NAVIGATION.md](NAVIGATION.md) · Chrome inventory: [UI-SITE-MAP.md](UI-SITE-MAP.md).

---

## Spatial model (no left rail)

```
┌────────────────────────────────────────────────────────────┐
│  TOP RIBBON (soft neu) — brand / search / status / alerts  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  STAGE (full width) — working surface / story              │
│                                                            │
│                     ╭─ ActionDock (CTAs) ─╮                │
│                     │  16px air above bar │                │
├────────────────────────────────────────────────────────────┤
│  FLOATING TASKBAR (60px · 16px inset) · CLOCK (± Pomodoro) │
└────────────────────────────────────────────────────────────┘
```

| Region | Marketing | Staff apps (AStudio / AConsulting / AProc) | Portals |
| --- | --- | --- | --- |
| **Top ribbon** | `MarketingTopBar` — logo + expansion | `AppRibbon` — brand · search · health/dues · greeting → `/account` · AlertsBell | `PortalNeuFrame` soft top — identity (1200px column · 16px inset) |
| **Stage** | Full width · content column **1200px** | `.esti-app-content2` full width under ribbon | Full width · **1200px** (`PORTAL_CHROME.contentMaxPx`) |
| **Bottom dock** | `MarketingLandingDock` — section spy + Blog / Downloads / Home / Calculator | Kit `ActionDock` + `useScreenActions` — `bottom: var(--esti-dock-bottom)` | **Client · Collaborator · Contractor · Site:** `ActionDock` while focused; provider wraps each role in `App.tsx` |
| **Footer** | Inline marketing footer in content | **Floating** `AppFooterBar` — portal metrics (**60px** · **35px** hits) · LEFT wellness/calc · CENTER module nav · RIGHT sync/sign-out | **Floating** `FirmPortalFooter` — same width as top bar · **60px** · calc · section nav · power |
| **Clock** | `MarketingClockPomodoro` (`AormsAnalogueClock` **100px**) | Same `MarketingClockPomodoro` — clears footer stack + `dockGapPx` | Same ambient clock · clears floating footer |
| **Left rail** | **Retired** | **Retired** | **Retired** |

**Retired:** GlassRail / SoftRail as primary chrome · marketing clear-glass floating rail · `RailLayout` left Carbon column · staff `esti-app-logo-float` watermark · `MarketingRailNav` / `.lp2-rail` · `PublicAuthStageLayout` / `MarketingConversionDock`.

**Brand placement**

| Surface | Brand |
| --- | --- |
| Marketing | `AormsLogo` left in `MarketingTopBar` |
| Staff | `AormsMark` + firm name in `AppRibbon` (no floating watermark) |
| Auth | `AuthBrandBlock` — product eyebrow + `AormsLogo` stage in soft card |
| Account / licensing | `AormsLogo` in `PortalShell` |
| External portals | Portal label + company name |

---

## Colour & tokens

| Token / role | Value | Use |
| --- | --- | --- |
| Soft raised fill | `#eceef2` · kit `NEU_FILL` · `--esti-neu-fill` | Soft chrome (ribbon, footer, Surface soft) — **not** the page canvas |
| Pure White | `#FFFFFF` · `--lp-bg-soft` | Flat cards at rest |
| Quiet muted | `#E7EAF0` · `--lp-bg-muted` | Secondary wells |
| Coal Black ink | `#141517` · `--lp-ink` | Primary text |
| Ink muted / faint | `#5B616B` / `#8A9099` | Secondary / helper |
| Radiant Orange | `#FF4F18` · `--lp-accent` / `--esti-brand-accent` | Single accent (fills → white text; links stay slate) |
| Accent hover | `#DB3E0F` · `--lp-accent-hover` | Hover on accent fills |
| Accent glow | `transparent` | **No glow** |
| Soft radius | **8px** · kit `RADIUS` · `--lp-radius` / `--esti-mkt-chrome-radius` | Soft-square product radius |
| Brand font | **Urbanist** (`--lp-font`) | All UI; calculator result may use VT323 |
| Content max | **1200px** · `MARKETING_CONTENT_MAX_PX` / `PORTAL_CHROME.contentMaxPx` | Marketing + portal column; staff stage uses shell gutters (`--esti-shell-gutter: 24px`) |
| Shared chrome | `frontend/src/lib/portal-chrome.ts` | Floating footer · insets · clock · hit targets · ActionDock clearance — **firm portals + staff shell** |

### Shared chrome tokens (`PORTAL_CHROME`)

Executable: [`frontend/src/lib/portal-chrome.ts`](../../frontend/src/lib/portal-chrome.ts).

| Surface | How vars apply |
| --- | --- |
| Firm portals | `PortalNeuFrame` → `portalChromeCssVars(hasFooter)` |
| Staff shell | `.esti-app-shell2` in `glass.scss` mirrors stack / dock-bottom; `AppFooterBar` / clock read `PORTAL_CHROME` in TS |

| Token | Value | CSS var / use |
| --- | --- | --- |
| `contentMaxPx` | **1200** | Portal top bar · floating footer · stage column |
| `chromeInsetPx` | **16** | Sticky top inset · floating footer bottom inset |
| `topBarMinHeightPx` | **56** | Soft identity bar (portals) |
| `footerHeightPx` | **60** | `--esti-portal-footer-height` — floating taskbar height |
| `footerStackPx` | **76** | `--esti-footer-height` (60 + 16 inset) — clock / dock clear |
| `dockGapPx` | **16** | Air between ActionDock and footer stack |
| — | **stack + gap** | `--esti-dock-bottom` — kit ActionDock `bottom` (staff + portals). Kit fallback `72px` **overlaps** a 76px stack — always set the var. |
| `footerHitPx` | **35** | `--esti-portal-hit` — portal chips; staff footer hits override `chromeIconSx` to 35 |
| `clockSizePx` | **100** | `AMBIENT_ANALOGUE_CLOCK_SIZE_PX` — staff · portal · auth · marketing (**web**) |
| `clockMarkRatio` | **0.2** | AORMS mark in dial centre |
| `clockRightPx` | **16 / 24** | Fixed bottom-right |

**Desktop WinUI clock:** design dial stays 100/127; **shown at 0.8×** (face **80**, Viewbox **102**) — see DESKTOP-WINUI-UX.md. Do not change web `clockSizePx` to match; density of the shell stays **1×**.

Staff stage pad when dock visible: `--esti-dock-stack: 68px` (gap + tray) on `.esti-app-shell2--dock-visible` — content `padding-bottom` = footer-stack + dock-stack + shell gutter.

Do **not** hard-code footer / dock / clock px in SCSS or components — change `PORTAL_CHROME` (and keep `glass.scss` staff vars in sync). WinUI mirrors the same numbers in `Themes/HcwTheme.xaml`.

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

Landing IA (five dock sections): **Overview · Outcomes · Audience · Platform · Start** (Rhythm folds into Start; full-bleed Entourage hero).

### Staff page shell

| Element | Role |
| --- | --- |
| `RailLayout` | **Stage page shell** (name kept) — soft header (title · description · tabs · filters · actions) + full-width scrolling main. **No left column.** |
| `ProjectSectionNav` | Horizontal group chips + peer tabs — Project Detail · Studio Intelligence · Work hub |
| `ProjectFacetTabs` | Nested MUI facets inside a peer panel (Brief · Drawings · Documents · Site bands · Finance · Engagement detail · Work Requests) — **one panel at a time** |
| `PageBreadcrumb` | Wayfinding + `document.title` |
| `ActionDock` / `useScreenActions` | Page-level CTAs only here (publish `[]` while dialogs open); clears floating footer via `--esti-dock-bottom`. **Cap ≤5**; **one** `tone: "primary"` / Radiant Orange commit |

**Capacity (AStudio / AConsulting, 2026-08-09):** brief = greeting + one attention line; Focus defaults to Priorities (Show all discloses Action items / risks); Work portfolio and Requests use facets not stacked lists; Engagement commercial/TQ/rate actions live on stage facets, not the dock; desktop WinUI stage is Tasks-only (hub/licence in tray).
| `AppRibbon` | Top chrome — brand · search · office health/dues · greeting → `/account` · AlertsBell |
| `AppFooterBar` | Floating taskbar (`PORTAL_CHROME`) — wellness · calculator · **module nav** (`RibbonNavCluster`) · sync · sign out |
| `MarketingClockPomodoro` | Ambient clock + Pomodoro — `bottom: footerStack + dockGap` |
| `Surface` · `StatusDot` · `DataState` · `KpiStrip` · `ConfirmModal` | Kit primitives |

### Auth

| Element | Role |
| --- | --- |
| `AuthRailLayout` | Soft-neu **horizontal** brand\|form card on Fog Gray (file name legacy — not a left rail) |
| `AuthSplitCard` | Shared brand pane + form; optional pinned `header` (login tabs) |
| `Login.tsx` | **Unified sign-in** — Workspace · Portals · Account tabs; Account scopes Personal · Company · Licensing |

Unauthenticated `/access`, `/company-account`, and `/platform-admin` **redirect** into the matching `/login` tab/scope. Self-hosted `/signup` (firm bootstrap) stays separate.

### Portals (`frontend/src/components/portal/`)

| Element | Role |
| --- | --- |
| `PortalNeuFrame` | Shared no-rail frame — soft top · 1200px stage · **floating** `FirmPortalFooter` · `AormsAnalogueClock` (tokens via `portalChromeCssVars`) |
| `FirmPortalShell` / `FirmPortalFooter` | Identity top · floating taskbar (calc · sections · power) |
| `ExternalPortalShell` | Client / consultant / contractor / site — section chrome + hub panels |
| `PortalShell` | Account / company / licensing hub — horizontal nav in top bar |
| Client ActionDock | `App.tsx` CLIENT wrap — Change request · Feedback · Schedule meeting (`Portal.tsx`) |
| Collaborator ActionDock | `App.tsx` CONSULTANT wrap — Submit deliverable · Raise RFI · Add note (`CollaboratorPortal.tsx`) |
| Contractor ActionDock | `App.tsx` CONTRACTOR wrap — joint measurement · ticket · site visit · drawing · meeting · RA (`ContractorPortal.tsx`) |
| Site ActionDock | `App.tsx` SITE wrap — Joint measurement · Inspection (`SitePortal.tsx`) |

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

- One spatial model: ribbon · stage · dock · footer · clock  
- Soft neu chrome; flat content; Radiant Orange only for true accent  
- Marketing / portal content width 1200px; wellbeing in-flow on Rhythm  
- Footer / clock / hit / ActionDock clearance from `PORTAL_CHROME` on **firm portals and staff shell**  
- Keep 16px air between ActionDock and floating taskbar (`dockGapPx` → `--esti-dock-bottom`)  

**Don’t**

- Reintroduce a left glass / SoftRail on staff, marketing, or portals  
- Put glass on every card or invent accent glows  
- Put staff ActionDock on marketing (use `MarketingLandingDock`)  
- Hard-code footer / dock / clock px outside `portal-chrome.ts` (staff: also keep `glass.scss` vars synced)  
- Rely on kit ActionDock fallback `bottom: 72px` under a 76px footer stack  
- Apply building entourage inside authenticated apps or portals  
- Mount a floating staff watermark beside the AnalogueClock  
- Leave dead SoftRail / `.lp2-rail` / conversion-dock code in product paths  
