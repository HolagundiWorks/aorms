# Firm portal section map (Doc-6)

**Status:** ACTIVE · **Updated:** 2026-08-07  
**Chrome:** [`FirmPortalShell`](../../frontend/src/components/portal/FirmPortalShell.tsx) ·  
[`FirmPortalStage`](../../frontend/src/components/portal/FirmPortalSection.tsx) ·  
[`FirmPortalHubPanels`](../../frontend/src/components/portal/FirmPortalHubPanels.tsx)

| Tab | Hub source | UI (now) |
| --- | --- | --- |
| **Updates** | Meta activity + recent artifacts | Full portal children (existing screens) |
| **Project** | `projectStatus` meta / projectDetail | Client portal: summary + stages panel |
| **Progress** | `phaseProgress` · `progressReport` | Client portal: stages + issued reports |
| **Drawings** | `drawing` READY · `transmittal` | Client portal: drawings + transmittals |
| **Documents** | `invoice` · `approval` (+ RA later) | Client portal: invoices + approvals |

Thin writes (approve / bid / visit) stay on the **Updates** tab body, not new chrome.

`Portal.tsx` passes `panels` into `ExternalPortalShell`. Collaborator / contractor / site can adopt the same panel components next.
