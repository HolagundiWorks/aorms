# Desktop ↔ web UX parity

> **Law:** one design language, two hosts — only **platform behaviour** diverges.  
> **Design system:** [`@hcw/ui-kit`](HCW-UI-KIT.md) (Urbanist · Radiant Orange · opaque soft neu · Top ribbon · Stage · Taskbar · ActionDock · AnalogueClock).  
> **Chrome SoT:** [PAGE-STRUCTURE.md](PAGE-STRUCTURE.md) · [UI-SITE-MAP.md](UI-SITE-MAP.md).  
> **WinUI contract (all apps):** [DESKTOP-WINUI-UX.md](DESKTOP-WINUI-UX.md) — density **1×**, floating chrome, wellness in-window, clock **0.8×**.  
> **Runtime:** [LOCAL-FIRST.md](LOCAL-FIRST.md). Do **not** introduce a second typeface, palette, or ERP chrome for desktop.

## Shell mapping (same IA both hosts)

```text
┌─ Optional thin OS menu (desktop only: Project · Edit · View · AI · Help) ─┐
├─ Soft neu floating ribbon 56 (brand/status — not module nav) ─────────────┤
├─ Stage (Fog) ── optional Inspector / Ask ESTI right slot ─────────────────┤
├─ ActionDock (destroy · create · commit) · bottom clears taskbar ──────────┤
├─ TaskbarFooter 60 (wellness · calc | modules | sync — no clock) ──────────┤
└─ AnalogueClock BR — web 100px · desktop WinUI shown at 0.8× (face 80) ────┘
```

| Role | Primitive | Rule |
| --- | --- | --- |
| Modules | `GlassRail` — expanded ~280px / collapsed ~72px | Never move module nav to a web-only top bar |
| Workspace | Stage | Same routes + [05-TEMPLATES](../hcw-kit/05-TEMPLATES.md) |
| Inspector / AI | One right slot (properties ↔ Ask ESTI) | AI never menu-only |
| Native chrome | Thin **WinUI 3** Fluent 2 menu → SPA commands | AI never menu-only |
| Status | Taskbar + `SyncQueueChip` | Same tray order |

Desktop may add a **thin native menu** that invokes the **same command IDs** as the web Command Palette — it does not replace the SPA / WinUI module chrome.

## Shared (must not fork)

- Tokens, typography (Urbanist), icons (one MUI/kit set), 8pt spacing, layers, dialogs, forms (visible labels), tables (one DataGrid adapter), toasts, loading skeletons
- Keyboard map (Ctrl+K / Alt+A / Alt+C / Alt+T / Ctrl+/) — one
  [`frontend/src/lib/keymap.ts`](../../frontend/src/lib/keymap.ts) for both hosts;
  Help at `/help`
- Module screens assembled from kit + templates — no per-module button skins or brand colours
- WinUI: copy `Themes/HcwTheme.xaml` from AStudio — do not invent a second token file

## Platform-only deltas

| Concern | Desktop (WinUI) | Web |
| --- | --- | --- |
| Windows | Multi-window (AI / inspector / drawing) | Tabs + docked panels |
| Files | Native dialogs + FS | Browser picker + drag-drop |
| Print | Native / system PDF | Browser print |
| AI compute | Local Ollama — badge **Local AI** | Hub / BYO — **same panel**, badge **Hosted AI** (`CapabilityBadge`) |
| Sync | Offline queue in tray | Same chip; usually idle when fully online · tray “Web” hint |

## PR checklist

- [ ] Screenshot same route on desktop WinUI and web (or thin-shell exception documented)  
- [ ] No new hex / font / icon pack — WinUI uses `HcwTheme.xaml`  
- [ ] No `UiDensity` / window scale host  
- [ ] Template cited from `05-TEMPLATES.md` (managers)  
- [ ] Shortcuts unchanged in Help  
- [ ] Kit-first if shared chrome changed · [DESKTOP-WINUI-UX.md](DESKTOP-WINUI-UX.md) followed  

## Figma ↔ kit tokens (LF6)

Code → Figma Variables bridge: [FIGMA-TOKEN-SYNC.md](FIGMA-TOKEN-SYNC.md) ·
kit export [02-TOKEN-EXPORT.md](../hcw-kit/02-TOKEN-EXPORT.md).  
Automation stub: `node scripts/figma-token-sync-check.mjs`.

Inspector / Ask ESTI share **one right slot on desktop managers** (properties ↔ AI) —
do not add a menu-only AI path. The esti SPA `RightSlot` / `AskEstiPanel` pattern
is a **reference archive**; shipping Ask ESTI is on desktop apps, not the hub.

**Reference (LF6, Aakash 2026-08):** `frontend/src/components/shell/RightSlot.tsx` —
Properties ↔ Ask ESTI tabs — pattern to port into desktop shells, not a cloud AI
surface.

**Shipped (LF6, Aakash 2026-08):** `frontend/src/components/shell/RightSlot.tsx` —
Properties ↔ Ask ESTI tabs; Ask ESTI opens via taskbar / `esti:ask` / Alt+A into
this slot (`AskEstiPanel`); screens may `publishInspector()` / dispatch
`esti:inspect`. No floating second AI chrome.

## Figma ↔ kit tokens (LF6)

Code → Figma Variables bridge: [FIGMA-TOKEN-SYNC.md](FIGMA-TOKEN-SYNC.md) ·
kit export [02-TOKEN-EXPORT.md](../hcw-kit/02-TOKEN-EXPORT.md).  
Automation stub: `node scripts/figma-token-sync-check.mjs`.

Inspector / Ask ESTI share **one right slot** on both hosts (properties ↔ AI) —
do not add a menu-only AI path on desktop.

## Related

- [DESKTOP-WINUI-UX.md](DESKTOP-WINUI-UX.md) · [DESKTOP-REPOS.md](DESKTOP-REPOS.md)  
- [HCW-UI-KIT.md](HCW-UI-KIT.md) · [HCW-UI-UX-PRINCIPLES.md](HCW-UI-UX-PRINCIPLES.md)  
- [LOCAL-FIRST.md](LOCAL-FIRST.md) · [ROADMAP.md](ROADMAP.md) § Local-first  
- [FIGMA-TOKEN-SYNC.md](FIGMA-TOKEN-SYNC.md) · [WEB-PORTAL.md](WEB-PORTAL.md)  
