# Firm portal section map (Doc-6)

**Status:** ACTIVE · **Updated:** 2026-08-07  
**Chrome:** [`FirmPortalShell`](../../frontend/src/components/portal/FirmPortalShell.tsx) ·  
[`FirmPortalStage`](../../frontend/src/components/portal/FirmPortalSection.tsx)

| Tab | Hub source | UI (now) |
| --- | --- | --- |
| **Updates** | Meta activity + recent artifacts | Full portal children (existing screens) |
| **Project** | `projectStatus` meta | Placeholder → project summary panel |
| **Progress** | `phaseProgress` · `progressReport` artifact | Placeholder → % + issued reports |
| **Drawings** | `drawing` READY · `transmittal` · `drawingRegister` | Placeholder → register list |
| **Documents** | `invoice` · `runningBill` · `estimateTotals` · `approval` | Placeholder → finals / numbers |

Thin writes (approve / bid / visit) stay on the active tab body, not new chrome.

Pass optional `panels` into `ExternalPortalShell` to replace placeholders per role.
