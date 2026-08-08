# Firm portal section map (Doc-6)

**Status:** ACTIVE · **Updated:** 2026-08-08  
**Chrome:** [`FirmPortalShell`](../../frontend/src/components/portal/FirmPortalShell.tsx) ·  
[`FirmPortalStage`](../../frontend/src/components/portal/FirmPortalSection.tsx) ·  
[`FirmPortalHubPanels`](../../frontend/src/components/portal/FirmPortalHubPanels.tsx)

| Tab | Hub source | UI (now) |
| --- | --- | --- |
| **Updates** | Meta activity + recent artifacts | Full portal children (always shown) |
| **Project** | `projectStatus` meta / projectDetail | Client · collaborator · contractor · site |
| **Progress** | `phaseProgress` · `progressReport` | Client · collaborator · site |
| **Drawings** | `drawing` READY · `transmittal` | Client · collaborator (issued transmittals) |
| **Documents** | `invoice` · `approval` · certified RA | Client |

**Honesty (S8 prep):** chrome tabs are **hidden** when `panels` omits a section —
no hub-placeholder Alert stubs.

Thin writes (approve / bid / visit) stay on the **Updates** tab body, not new chrome.

| Portal | Wired panels |
| --- | --- |
| Client | Project · Progress · Drawings · Documents (invoices · approvals · certified RA) |
| Collaborator | Project · Progress · Drawings (issued transmittals) |
| Contractor | Project (invitation-scoped) |
| Site | Project · Progress (`sitePortal`) |
