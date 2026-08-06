# LF4 morning test — what Bhoomi publishes (Aakash must not wire early)

**Status:** Coordination note · **Updated:** 2026-08-06  
**Owner:** Bhoomi (packaging) · **Consumers:** Aakash (portal), Gagan (hub bind)

Overnight / morning smoke builds prove the Tauri node boots and can bind a
licence. They are **not** release artefacts.

## Bhoomi publishes (when ready for portal)

| Artefact | Field for Aakash |
| --- | --- |
| Code-signed Windows `Setup.exe` (AStudio) | HTTPS URL → `VITE_ASTUDIO_INSTALLER_URL` or `update-manifests/astudio.json` `url` |
| Code-signed Windows `Setup.exe` (AConsulting) | `VITE_ACONSULTING_INSTALLER_URL` / `aconsulting.json` |
| SHA-256 of each binary | manifest `sha256` (64 hex) |
| Version string | manifest `version` |
| Explicit “signed for release” confirmation | Flip manifest `status` → `available` + set `VITE_PORTAL_USE_RELEASE_INSTALLERS=true` **or** set env URLs |

## Aakash must not

- Point `/downloads` at unsigned morning `Setup.exe`  
- Set `status: available` on placeholder manifests without sha256  
- Advertise “Download for Windows” while status is `web_fallback`

Until Bhoomi signs, the portal keeps **web_fallback** CTAs (open browser workspace).

## Morning bind smoke (Bhoomi + Gagan)

Checklist for Bhoomi after a smoke build (not a portal release):

1. Desktop node starts (`ESTI_ROLE=node`, `ESTI_DESKTOP=true`).  
2. First-run `INSTALL_ID` present.  
3. Licence activate/refresh against hub (`/platform/v1`) — Gagan lane.  
4. `trpc.sync.capabilities` shows expected free vs licensed flags.  
5. **Do not** hand the smoke binary URL to Aakash for production env.

## Related

- [WEB-PORTAL.md](WEB-PORTAL.md)  
- [LOCAL-FIRST.md](LOCAL-FIRST.md) § LF4  
- [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md)  
