# Firm portal section map (Doc-6)

**Status:** ACTIVE · **Updated:** 2026-08-08  
**Chrome:** [`FirmPortalShell`](../../frontend/src/components/portal/FirmPortalShell.tsx) ·  
[`FirmPortalFooter`](../../frontend/src/components/portal/FirmPortalFooter.tsx) ·  
[`PortalNeuFrame`](../../frontend/src/components/portal/PortalNeuFrame.tsx) ·  
[`FirmPortalStage`](../../frontend/src/components/portal/FirmPortalSection.tsx) ·  
[`FirmPortalHubPanels`](../../frontend/src/components/portal/FirmPortalHubPanels.tsx)

**Tokens (all firm-portal screens):** [`frontend/src/lib/portal-chrome.ts`](../../frontend/src/lib/portal-chrome.ts) — `PORTAL_CHROME` · `portalChromeCssVars`.  
Canon layout: [PAGE-STRUCTURE.md](PAGE-STRUCTURE.md) · [COMPOSITION-PRINCIPLES.md](COMPOSITION-PRINCIPLES.md).

## Spatial chrome

```
┌─ top bar (sticky, 16px inset, 1200px) ─────────────────────┐
│  suite eyebrow · portal label · company name                 │
└──────────────────────────────────────────────────────────────┘
│  stage 1200px                                                │
│                     ╭─ ActionDock (CLIENT) ─╮                │
┌─ floating footer 60px (16px inset, 1200px) ──────────────────┐
│  calc │ Updates · Project · Progress · Drawings · Documents │ power │
└──────────────────────────────────────────────────────────────┘
                                              ◎ clock 100px
```

| Measure | Token | Value |
| --- | --- | --- |
| Content column | `contentMaxPx` | 1200 |
| Chrome inset | `chromeInsetPx` | 16 |
| Top bar min-height | `topBarMinHeightPx` | 56 |
| Floating footer height | `footerHeightPx` | 60 |
| Footer + inset (clearance) | `footerStackPx` → `--esti-footer-height` | 76 |
| ActionDock bottom | `--esti-dock-bottom` | stack + 16 |
| Footer hit targets | `footerHitPx` | 35 |
| Ambient clock | `clockSizePx` / `AMBIENT_ANALOGUE_CLOCK_SIZE_PX` | 100 |

Change sizes in **`portal-chrome.ts` only** — `PortalNeuFrame`, `FirmPortalFooter`, `glass.scss` (`.esti-portal-footer`), CLIENT root, and ambient clocks read the tokens / CSS vars.

| Tab | Hub source | UI (now) |
| --- | --- | --- |
| **Updates** | Meta activity + recent artifacts | Full portal children (always shown) |
| **Project** | `projectStatus` meta / projectDetail | Client · collaborator · contractor · site |
| **Progress** | `phaseProgress` · `progressReport` | Client · collaborator · site |
| **Drawings** | `drawing` READY · `transmittal` | Client · collaborator · contractor · site |
| **Documents** | `invoice` · `approval` · certified RA | Client |

**Honesty (S8 prep):** chrome tabs are **hidden** when `panels` omits a section —
no hub-placeholder Alert stubs.

Thin writes (approve / bid / visit / collab tx ack) stay on the **Updates** tab body,
not new chrome. Client portal create intents (**Change request** · **Feedback** ·
**Schedule meeting**) publish to the firm-portal **ActionDock** while a project is open
(`App.tsx` wraps CLIENT routes in `ActionDockProvider` + `ActionDock`).

| Portal | Wired panels |
| --- | --- |
| Client | Project · Progress · Drawings · Documents (invoices · approvals · certified RA) |
| Collaborator | Project · Progress · Drawings · Updates ack on issued transmittals |
| Contractor | Project · Drawings (invitation → tender → project) |
| Site | Project · Progress · Drawings (`sitePortal`) |

**Demo portals** (`pnpm seed:demo`): `client@` · `contractor@` · `collab@demo.aorms.in` at
`/login?tab=portals` — see [DEMO-AND-HR-MODE.md](DEMO-AND-HR-MODE.md) · Kapoor showcase in [DEMO-SEED-ITEMS.md](DEMO-SEED-ITEMS.md).
