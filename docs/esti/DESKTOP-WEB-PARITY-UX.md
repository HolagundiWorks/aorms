# Desktop ↔ web UX parity

> **Law:** one design language, two hosts — only **platform behaviour** diverges.  
> **Design system:** [`@hcw/ui-kit`](HCW-UI-KIT.md) (Urbanist · Radiant Orange · flat/soft/glass · Rail · Stage · Taskbar · ActionDock).  
> **Runtime:** [LOCAL-FIRST.md](LOCAL-FIRST.md). Do **not** introduce a second typeface, palette, or ERP chrome for desktop.

## Shell mapping (same IA both hosts)

```text
┌─ Optional thin OS menu (desktop only: Project · Edit · View · AI · Help) ─┐
├─ GlassRail (modules) ── Stage (workspace) ── Inspector / Ask ESTI ────────┤
├─ ActionDock (destroy · create · commit) ──────────────────────────────────┤
└─ TaskbarFooter (calc · launchers · tray: clock · sync · alerts · ID) ─────┘
```

| Role | Primitive | Rule |
| --- | --- | --- |
| Modules | `GlassRail` — expanded ~280px / collapsed ~72px | Never move module nav to a web-only top bar |
| Workspace | Stage | Same routes + [05-TEMPLATES](../hcw-kit/05-TEMPLATES.md) |
| Inspector / AI | One right slot (properties ↔ Ask ESTI) | AI never menu-only |
| Status | Taskbar + `SyncQueueChip` | Same tray order |

Desktop may add a **thin native menu** that invokes the **same command IDs** as the web Command Palette — it does not replace GlassRail.

## Shared (must not fork)

- Tokens, typography (Urbanist), icons (one MUI/kit set), 8pt spacing, layers, dialogs, forms (visible labels), tables (one DataGrid adapter), toasts, loading skeletons
- Keyboard map (Ctrl+K / Alt+A / Alt+C / Alt+T / Ctrl+/) — one
  [`frontend/src/lib/keymap.ts`](../../frontend/src/lib/keymap.ts) for both hosts;
  Help at `/help`
- Module screens assembled from kit + templates — no per-module button skins or brand colours

## Platform-only deltas

| Concern | Desktop | Web |
| --- | --- | --- |
| Windows | Multi-window (AI / inspector / drawing) | Tabs + docked panels |
| Files | Native dialogs + FS | Browser picker + drag-drop |
| Print | Native / system PDF | Browser print |
| AI compute | Local Ollama — badge **Local AI** | Hub / BYO — **same panel**, badge **Hosted AI** (`CapabilityBadge`) |
| Sync | Offline queue in tray | Same chip; usually idle when fully online · tray “Web” hint |

## PR checklist

- [ ] Screenshot same route on loopback desktop flags and web  
- [ ] No new hex / font / icon pack  
- [ ] Template cited from `05-TEMPLATES.md`  
- [ ] Shortcuts unchanged in Help  
- [ ] Kit-first if shared chrome changed  

## Figma ↔ kit tokens (LF6)

Code → Figma Variables bridge: [FIGMA-TOKEN-SYNC.md](FIGMA-TOKEN-SYNC.md) ·
kit export [02-TOKEN-EXPORT.md](../hcw-kit/02-TOKEN-EXPORT.md).  
Automation stub: `node scripts/figma-token-sync-check.mjs`.

Inspector / Ask ESTI share **one right slot** on both hosts (properties ↔ AI) —
do not add a menu-only AI path on desktop.

**Shipped (LF6, Aakash 2026-08):** `frontend/src/components/shell/RightSlot.tsx` —
Properties ↔ Ask ESTI tabs; Ask ESTI opens via taskbar / `esti:ask` / Alt+A into
this slot (`AskEstiPanel`); screens may `publishInspector()` / dispatch
`esti:inspect`. No floating second AI chrome.

## Related

- [HCW-UI-KIT.md](HCW-UI-KIT.md) · [HCW-UI-UX-PRINCIPLES.md](HCW-UI-UX-PRINCIPLES.md)  
- [LOCAL-FIRST.md](LOCAL-FIRST.md) · [ROADMAP.md](ROADMAP.md) § Local-first  
- [FIGMA-TOKEN-SYNC.md](FIGMA-TOKEN-SYNC.md) · [WEB-PORTAL.md](WEB-PORTAL.md)  
