# Firm portal section map (Doc-6)

**Status:** ACTIVE Â· **Updated:** 2026-08-07  
**Chrome:** [`FirmPortalShell`](../../frontend/src/components/portal/FirmPortalShell.tsx) Â·  
[`FirmPortalStage`](../../frontend/src/components/portal/FirmPortalSection.tsx) Â·  
[`FirmPortalHubPanels`](../../frontend/src/components/portal/FirmPortalHubPanels.tsx)

| Tab | Hub source | UI (now) |
| --- | --- | --- |
| **Updates** | Meta activity + recent artifacts | Full portal children (existing screens) |
| **Project** | `projectStatus` meta / projectDetail | Client portal: summary + stages panel |
| **Progress** | `phaseProgress` Â· `progressReport` | Client portal: stages + issued reports |
| **Drawings** | `drawing` READY Â· `transmittal` | Client portal: drawings + transmittals |
| **Documents** | `invoice` Â· `approval` (+ RA later) | Client portal: invoices + approvals |

Thin writes (approve / bid / visit) stay on the **Updates** tab body, not new chrome.

`Portal.tsx` passes `panels` into `ExternalPortalShell`. Collaborator portal also wires Project · Progress · Drawings panels. Contractor / site next.

