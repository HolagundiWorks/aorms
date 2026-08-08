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
│          ╭─ ActionDock (CLIENT · CONTRACTOR when focused) ─╮ │
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
| **Documents** | `invoice` · `approval` · certified RA / running bills | Client · contractor (RA only) |

**Honesty (S8 prep):** chrome tabs are **hidden** when `panels` omits a section —
no hub-placeholder Alert stubs.

Thin writes (approve / bid / visit / collab tx ack) stay on the **Updates** tab body,
not new chrome.

**ActionDock create intents** (`App.tsx` wraps CLIENT + CONTRACTOR in `ActionDockProvider`):

| Portal | Dock CTAs (while a project / invitation is focused) |
| --- | --- |
| Client | Change request · Feedback · Schedule meeting |
| Contractor | Raise ticket · Site visit · Drawing · Meeting · Running bills (+ Clarification / Joint measurement from Updates) |

### Contractor portal API + kinds

| Piece | Path |
| --- | --- |
| UI | [`ContractorPortal.tsx`](../../frontend/src/routes/ContractorPortal.tsx) |
| Contracts | [`contractor-portal.ts`](../../packages/contracts/src/contractor-portal.ts) — `ContractorPortalSubmissionKind` · `ContractorPortalSubmitInput` |
| Router | [`backend/src/modules/contractor/portal.ts`](../../backend/src/modules/contractor/portal.ts) |
| Demo seed | [`demoContractorPortalSeed.ts`](../../backend/src/scripts/demoContractorPortalSeed.ts) |

| Procedure | Role |
| --- | --- |
| `myTenders` · `getInvitation` · `submitBid` · `decline` | Tender bidding |
| `projectDetail` | Stages · READY drawings · issued transmittals |
| `myRunningBills` | Certified / sent / closed RA (Documents + Running bills dock) |
| `mySubmissions` · `submitRequest` | Coordination tickets |

Kinds → `esti_contractor_submission.kind`:

| Kind | Dock / UI |
| --- | --- |
| `TICKET` | Raise ticket |
| `SITE_VISIT_REQUEST` | Site visit (+ optional PLANNED `esti_site_visit`) |
| `DRAWING_REQUEST` | Drawing |
| `MEETING_REQUEST` | Meeting |
| `RFI` | Clarification (Updates) |
| `JOINT_MEASUREMENT` | Joint measurement (Updates · Running bills dialog) |

Select a tender invitation first — dock publishes only while focused (clears during bid/request dialogs).

| Portal | Wired panels |
| --- | --- |
| Client | Project · Progress · Drawings · Documents (invoices · approvals · certified RA) |
| Collaborator | Project · Progress · Drawings · Updates ack on issued transmittals |
| Contractor | Project · Drawings · Documents (certified running bills) — invitation-scoped |
| Site | Project · Progress · Drawings (`sitePortal`) |

**Demo portals** (`pnpm seed:demo`): `client@` · `contractor@` · `collab@demo.aorms.in` at
`/login?tab=portals` — Kapoor (client) + Sharma/Vinayaka (contractor) in [DEMO-SEED-ITEMS.md](DEMO-SEED-ITEMS.md).
