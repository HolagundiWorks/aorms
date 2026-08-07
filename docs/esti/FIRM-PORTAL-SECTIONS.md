# Firm portal section map (Doc-6)

**Status:** ACTIVE · **Updated:** 2026-08-08  
**Chrome:** [`FirmPortalShell`](../../frontend/src/components/portal/FirmPortalShell.tsx) ·  
[`FirmPortalStage`](../../frontend/src/components/portal/FirmPortalSection.tsx) ·  
[`FirmPortalHubPanels`](../../frontend/src/components/portal/FirmPortalHubPanels.tsx)

| Tab | Hub source | UI (now) |
| --- | --- | --- |
| **Updates** | Meta activity + recent artifacts | Full portal children (always shown) |
| **Project** | `projectStatus` meta / projectDetail | Client + collaborator when wired |
| **Progress** | `phaseProgress` · `progressReport` | Client only (collab/contractor/site hide until API) |
| **Drawings** | `drawing` READY · `transmittal` | Client + collaborator when wired |
| **Documents** | `invoice` · `approval` (+ RA later) | Client only |

**Honesty (S8 prep):** chrome tabs are **hidden** when `panels` omits a section —
no hub-placeholder Alert stubs. Contractor / site = Updates only until S10 depth.

Thin writes (approve / bid / visit) stay on the **Updates** tab body, not new chrome.

`Portal.tsx` / `CollaboratorPortal.tsx` pass `panels` into `ExternalPortalShell`.
Contractor / site omit `panels` → Updates-only chrome.
