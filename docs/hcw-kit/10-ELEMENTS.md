# HCW Elements

**Superseded as the primary inventory** by [14-HCW-CATALOG.md](14-HCW-CATALOG.md)
(§ Elements · Components · Patterns · Pictograms · Icons).

This file keeps a compact **element cheat-sheet** — themed controls and kit
primitives with attributes only. No external-system framing.

**Product spatial chrome** (staff + firm portals): [PAGE-STRUCTURE.md](../esti/PAGE-STRUCTURE.md)
· tokens in `frontend/src/lib/portal-chrome.ts`.

## Kit primitives (import from `@hcw/ui-kit`)

| Element | Key attributes |
| --- | --- |
| KitRoot | `scheme` · `density` · `theme?` · `children` |
| Surface | `layer`: flat · soft · glass · clearGlass · headingGlass |
| GlassRail | `rail` · `children` · `glass`: frost · clear — **not product chrome** (left rail retired) |
| ActionDock | zones via `DockAction.zone` left · center · right; `bottom: var(--esti-dock-bottom, 72px)` |
| SectionDock | `links[]` · `pathname` · `hash?` |
| TaskbarFooter | `left` · `center` · `right` · `showClock?` — kit height `LAYOUT.taskbarHeight` **56**; product uses `AppFooterBar` / `FirmPortalFooter` instead |
| TaskbarButton | `icon` · `label` · `active?` · `onClick?` |
| BrandMark | `label` · `size` sm\|md\|lg · `accent` · `accentShape` auto\|a\|square |
| StatusDot | `label` · `color` · `size` sm\|md |
| HealthGlassOrb | `state` · `variant` flat\|glass · `size?` · `title?` |
| AnalogueClock | ambient dial — product size **100** via `PORTAL_CHROME.clockSizePx` |
| Avatar | `name` · `photoUrl?` · `color?` · `size` xs…xl |
| PageBreadcrumb | `items` · `linkComponent?` · `linkPropName` href\|to |
| DataState | `loading` · `isEmpty` · `empty` · `children` |
| ConfirmModal | `open` · `heading` · `body` · `confirmText` · `danger` · `pending` |
| ToastHost / pushToast | `kind` · `title` · `subtitle?` |

## Product chrome elements (AORMS shells)

| Element | Role / geometry |
| --- | --- |
| `AppRibbon` | Staff top — brand · search · health/dues · greeting · AlertsBell |
| `AppFooterBar` | Staff floating taskbar — **60×** · **35** hits · wellness/calc · module nav · sync · sign out |
| `FirmPortalFooter` / `PortalNeuFrame` | Portal floating taskbar — same `PORTAL_CHROME` stack |
| `MarketingLandingDock` | Marketing bottom dock (not staff ActionDock) |
| `MarketingClockPomodoro` | Clock + Pomodoro — staff + marketing; clears `footerStack + dockGap` |

| CSS var | Value (product) | Consumer |
| --- | --- | --- |
| `--esti-footer-height` | **76** (`footerStackPx`) | Stage pad · clock · dock clearance |
| `--esti-dock-bottom` | **stack + 16** (`dockGapPx`) | Kit `ActionDock` fixed `bottom` |
| `--esti-dock-stack` | **0** / **68** when dock visible | Staff content `padding-bottom` |

## Themed elements (via KitRoot theme)

| Element | Attributes / rules |
| --- | --- |
| Action | glass-hover CTA; danger tone; page CTAs → ActionDock |
| Glyph action | `chromeIconSx` (≥44) in generic chrome; staff/portal floating bars use **35** (`footerHitPx`) |
| Toggle | selected = accent wash |
| Field | neumorphic well; search → `searchFieldSx` |
| Choice | accent when active; focus ring |
| Chip | square; **status → StatusDot** |
| Tooltip | ink slab |
| Alert | standard glass (error/warning) · filled solid (toasts) |
| Dialog | neu pop; destroy → ConfirmModal; `aria-labelledby` |
| Tabs | inset top accent rule |
| Link | slate, never accent |
| Table / grid | density row heights; accent selection |
| List | selected layer02; `layoutSx.listToolbar` |
| Pagination / Stepper / Calendar | accent active |
| Chart | `chartPalette` · markers · `chartRootSx` |

## Pictograms & icons

See catalog §5–6. Registry: `PICTOGRAM` · `ICON` · `CHART_MARKERS` · `HEALTH_PICTOGRAM`.
