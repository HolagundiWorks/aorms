# Firm portal section map (Doc-6)

**Status:** ACTIVE · **Updated:** 2026-08-09  
**Chrome:** [`FirmPortalShell`](../../frontend/src/components/portal/FirmPortalShell.tsx) ·  
[`FirmPortalFooter`](../../frontend/src/components/portal/FirmPortalFooter.tsx) ·  
[`PortalNeuFrame`](../../frontend/src/components/portal/PortalNeuFrame.tsx) ·  
[`FirmPortalStage`](../../frontend/src/components/portal/FirmPortalSection.tsx) ·  
[`FirmPortalHubPanels`](../../frontend/src/components/portal/FirmPortalHubPanels.tsx)

**Tokens:** [`frontend/src/lib/portal-chrome.ts`](../../frontend/src/lib/portal-chrome.ts) — `PORTAL_CHROME` · `portalChromeCssVars`.  
Same stack / dock-gap / clock metrics apply to the **staff** floating taskbar
(`AppFooterBar` + `.esti-app-shell2` `--esti-dock-bottom` in `glass.scss`).  
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

Change sizes in **`portal-chrome.ts` only** — then sync staff `.esti-app-shell2`
(`--esti-footer-height` · `--esti-dock-bottom`) in `glass.scss`. Consumers:
`PortalNeuFrame`, `FirmPortalFooter`, `AppFooterBar`, ActionDock, ambient clocks.

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

**ActionDock create intents** (`App.tsx` wraps CLIENT + CONTRACTOR + SITE_SUPERVISOR in `ActionDockProvider`):

| Portal | Dock CTAs (while a project / invitation is focused) |
| --- | --- |
| Client | Change request · Feedback · Schedule meeting |
| Contractor | Raise ticket · Site visit · Drawing · Meeting · Running bills (+ Clarification / Joint measurement *request* from Updates) |
| Site | Joint measurement **recorder** (sheet + PDF annotate → submit for approval) |

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
| `projectTeam` | Assigned firm users (tag on raise) |
| `mySubmissions` · `submitRequest` | Coordination tickets (`attentionToId` optional) |

Kinds → `esti_contractor_submission.kind`:

| Kind | Dock / UI |
| --- | --- |
| `TICKET` | Raise ticket |
| `SITE_VISIT_REQUEST` | Site visit (+ optional PLANNED `esti_site_visit`) |
| `DRAWING_REQUEST` | Drawing |
| `MEETING_REQUEST` | Meeting |
| `RFI` | Clarification (Updates) |
| `JOINT_MEASUREMENT` | Request only — opens linked site DRAFT recorder ([AQC-JM-SYNC.md](AQC-JM-SYNC.md)) |

Select a tender invitation first — dock publishes only while focused (clears during bid/request dialogs).

### Joint measurement (site → office)

| Piece | Path |
| --- | --- |
| Site UI | [`SitePortal.tsx`](../../frontend/src/routes/SitePortal.tsx) · [`JointMeasurementRecorder.tsx`](../../frontend/src/components/portal/JointMeasurementRecorder.tsx) |
| Staff approve | [`JointMeasurementQueue.tsx`](../../frontend/src/components/jointMeasurement/JointMeasurementQueue.tsx) on AProc home |
| API | `jointMeasurement.*` · `rateBooks.createFromJointMeasurement` |
| Sync | `SyncEntity.jointMeasurement` · [AQC-JM-SYNC.md](AQC-JM-SYNC.md) |

| Portal | Wired panels |
| --- | --- |
| Client | Project · Progress · Drawings · Documents (invoices · approvals · certified RA) |
| Collaborator | Project · Progress · Drawings · Updates ack on issued transmittals |
| Contractor | Project · Drawings · Documents (certified running bills) — invitation-scoped |
| Site | Project · Progress · Drawings (`sitePortal`) · JM recorder |

**Demo portals** (`pnpm seed:demo`): `client@` · `contractor@` · `collab@` · `site@demo.aorms.in` at
`/login?tab=portals` — Kapoor (client) + Sharma/Vinayaka (contractor) + JM seed in [DEMO-SEED-ITEMS.md](DEMO-SEED-ITEMS.md).
