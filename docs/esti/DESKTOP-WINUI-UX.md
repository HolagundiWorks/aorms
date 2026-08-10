# Desktop WinUI UX contract (all AORMS apps)

**Status:** Canonical · **Updated:** 2026-08-10 · **Reference shell:** [AStudio](https://github.com/HolagundiWorks/AStudio)  
**Parents:** [HCW-UI-UX-PRINCIPLES.md](HCW-UI-UX-PRINCIPLES.md) · [DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md) · [PAGE-STRUCTURE.md](PAGE-STRUCTURE.md) · [DESKTOP-REPOS.md](DESKTOP-REPOS.md)

> **One design language across web + every WinUI app.** Desktop mirrors `@hcw/ui-kit` /
> staff `PORTAL_CHROME` in XAML — not Fluent cards as brand chrome, not a second ERP skin.

## Apps in scope

| Tier | Apps | Shell depth |
| --- | --- | --- |
| **Managers** | AStudio · AConsulting | Full geography (ribbon · stage · ActionDock · taskbar · clock · wellness) |
| **Suite core** | AORMS Connect | Thin HCW chrome (ribbon · Fog stage · floating tray) |
| **Technical** | AQC Estimation · BBS · PM | Thin HCW chrome (same); domain UI grows inside stage |
| **Technical core** | **AQC-Core** (`AQC/BBSDesktop/BBSApp`) | Full takeoff UI · HCW soft neu shell + Fluent→HCW bridge |
| **Reference** | esti SPA | Archive for IA/tokens — not the shipping staff host |

Per-repo mirror: `docs/WINUI-SHELL.md` + `Themes/HcwTheme.xaml` (copy of AStudio SoT until a shared package exists).

---

## Spatial model (same as web staff)

```text
┌─ Floating ribbon 56 — brand · search/status · Local AI ──────────────┐
├─ Stage (Fog) · gutters 24 · full width (managers) ───────────────────┤
│              ╭─ floating ActionDock (hug · ≤5) ─╮                    │
├─ floating Taskbar 60 — tools | module nav | sync ────────────────────┤
└─ AnalogueClock BR — design 100, shown 0.8× (face 80 / Viewbox 102) ──┘
```

| Region | Height / size | Hits | Rule |
| --- | --- | --- | --- |
| Ribbon | **56** face · inset **16** | **35** | Brand + status only — **module nav is not in the ribbon** |
| Stage | Fog `#F2F4F7` · pad **24** · bottom pad clears dock/taskbar | — | Full width on managers (not portal 1200 column) |
| ActionDock | Hug-content soft tray · bottom **92** (76 stack + 16 gap) | **44** | LEFT destroy · CENTER create/save · RIGHT reload/publish · grooves |
| Taskbar | **60** · inset **16** | **35** | L tools · C modules · R sync/activate |
| Clock | Design dial **100/127** · **Viewbox 0.8×** → face **80** | — | Ambient + Pomodoro; clears footer stack |
| Wellness | In-window soft panel **320×340** · pad **20** | chips **36** · play **48** | **Not** a system `Flyout` (scale/DPI diverge) |

---

## Density & scale (hard rules)

| Rule | Do | Don't |
| --- | --- | --- |
| Window density | **1×** — chrome matches web `PORTAL_CHROME` px | `UiDensity` / `ScaleHost` / whole-window `ScaleTransform` |
| Clock | Local Viewbox **0.8×** on dial only | Shrink entire shell to make clock fit |
| Wellness / calc | In-window soft panels (same visual tree as shell) | Rely on system Flyout for primary chrome peers |
| Tokens | `Themes/HcwTheme.xaml` mirror of kit | Hand hex ladders · ThemeShadow glass · second radius |

---

## Visual contract (`HcwTheme.xaml`)

| Token | Value |
| --- | --- |
| Fog / Soft / White | `#F2F4F7` / `#ECEEF2` / `#FFFFFF` |
| Ink / Accent / Danger | `#141517` / `#FF4F18` / `#C8442E` |
| Radius | **8px** soft-square everywhere |
| Elevation | Dual-offset neu (dark SE + light NW) — **no** blur/glass |
| Type | Segoe UI Variable (Urbanist peer until OFL pack) |
| Active nav | Transparent + **2px accent underline** — orange fill only on scarce CTAs |
| Icons | Segoe Fluent Icons |

Copy the theme from AStudio; do not invent a parallel token file per app.

---

## Manager vs thin shell

### Managers (AStudio · AConsulting)

- Full geography above.
- Taskbar CENTER = practice module nav (AStudio `studioNav` · AConsulting Practice…Tasks).
- Wellness · Calc · Ask ESTI · Sync · Activate as on web `AppFooterBar` peers.
- Home ≤4 KPIs; ActionDock ≤5.

### Thin (Connect · AQC-*)

Must still ship:

1. `HcwTheme.xaml` merged in `App.xaml`
2. Fog canvas + floating soft ribbon **56** (brand + product name + Local AI / hub chip)
3. Stage content in Fog with **24** gutters (existing Activate/Flush cards stay Layer-1 flat cards)
4. Optional floating taskbar **60** for Sync · Activate · downloads — hits **35**
5. Short `docs/WINUI-SHELL.md` pointing here + listing exceptions

May defer until domain UI needs them: full ActionDock, wellness panel, Pomodoro clock.

---

## Anti-patterns (desktop)

| Anti-pattern | Why |
| --- | --- |
| Module nav in top ribbon | Web law — nav lives in taskbar |
| System Flyout as primary wellness/calc chrome | Different scale vs shell |
| Window-level UI density scale | Breaks parity with web px |
| Fluent `CardBackgroundFill` as brand surface | Use Fog/Soft/White neu |
| Orange fill on every active nav chip | Underline peers; orange scarce |
| Portal **1200** max on manager stage | Staff stage is full-bleed + 24 gutters |
| Clock at 100px on dense desktop | Desktop shows **0.8×** (80) |

---

## Agent / PR checklist

- [ ] `Themes/HcwTheme.xaml` present and merged
- [ ] No `UiDensity` / window scale host
- [ ] Ribbon 56 floating · taskbar 60 floating (or documented thin exception)
- [ ] Dock hits 44 · taskbar hits 35 · radius 8
- [ ] Wellness (if present) = in-window 320 panel
- [ ] Clock (if present) = Viewbox 0.8×
- [ ] `docs/WINUI-SHELL.md` updated for that repo
- [ ] No new hex outside `HcwTheme.xaml`

## Related

- AStudio reference: `AStudio/docs/WINUI-SHELL.md` · `AStudio/src/AStudio.App/Themes/HcwTheme.xaml`
- Web SoT: [PAGE-STRUCTURE.md](PAGE-STRUCTURE.md) · `frontend/src/lib/portal-chrome.ts`
- Kit: [HCW-UI-KIT.md](HCW-UI-KIT.md) · [12-AI-AGENT-RULEBOOK.md](../hcw-kit/12-AI-AGENT-RULEBOOK.md)
