# AORMS web portal — desktop downloads

**Status:** Canonical · **Updated:** 2026-08-08 · **Owner:** Aakash (Portal / GTM / UX)  
**Runtime law:** [LOCAL-FIRST.md](LOCAL-FIRST.md) · **Suite:** [AORMS-SUITE.md](AORMS-SUITE.md) ·  
**Repos:** [DESKTOP-REPOS.md](DESKTOP-REPOS.md)

Public surface for **signed** Windows installers across the AORMS suite.
`aorms.in` is **marketing + demos**; staff ERP is desktop. Legacy Lite / Pro /
Community Manager SKUs stay **retired**.

## Surface

| Path | Behaviour |
| --- | --- |
| `/downloads` | Live portal — suite offers (managers + AQC + AADT) |
| `/download` | Legacy Manager path → **redirects to `/downloads`** |
| `/` | Suite landing |
| `/login` | Demo / portals / account (preview) |

Host: platform apex (`aorms.in`). Code: `frontend/src/routes/Downloads.tsx` ·
resolver `frontend/src/lib/desktop-installers.ts`.

### Offers (all default `web_fallback`)

| App | Manifest |
| --- | --- |
| AStudio | `astudio.json` |
| AConsulting | `aconsulting.json` |
| AQC Estimation | `aqc-estimation.json` |
| AQC BBS | `aqc-bbs.json` |
| AQC Project Management | `aqc-pm.json` |
| AADT | `aadt.json` |

## Honesty rule (do not break)

| State | CTA |
| --- | --- |
| No signed URL wired | **web_fallback** — open product page / GitHub only |
| Signed URL + sha256 live | **Download … for Windows** |

**Never** point live CTAs at unsigned overnight binaries under `desktop/artifacts/`
(or any morning smoke `Setup.exe`). Wait on **Bhoomi** for a **code-signed** URL +
sha256 before flipping.

## Portal → installer wiring

```text
Bhoomi (Local)                         Aakash (Portal)
──────────────                         ───────────────
signed Setup.exe ──url + sha256──►     VITE_*_INSTALLER_URL (managers)
                                       or update-manifests/*.json
                                       + VITE_PORTAL_USE_RELEASE_INSTALLERS=true
                                                │
                                                ▼
                                       aorms.in/downloads  (web_fallback until then)
```

Product repos: [DESKTOP-REPOS.md](DESKTOP-REPOS.md). This file owns **portal fill fields**.

## One-line fill (after Bhoomi signs)

Copy `sha256` / `version` from the trusted handoff; set `url` only after HTTPS upload.
Flip `status` to `available` only when the chain is SmartScreen-ready.

**HTTPS host (interim):** GitHub Releases on `HolagundiWorks/aorms` (or per-app
repos). Do **not** reuse legacy Estimate / Community / Manager release assets.

### Option A — env (managers)

```bash
VITE_ASTUDIO_INSTALLER_URL=https://cdn.example.com/AStudio-Setup-1.0.0.exe
VITE_ACONSULTING_INSTALLER_URL=https://cdn.example.com/AConsulting-Setup-1.0.0.exe
# rebuild frontend (deploy/update.sh)
```

### Option B — update manifests + gate flag

1. Edit the matching file under `frontend/public/update-manifests/`:

| Field | Required | Notes |
| --- | --- | --- |
| `url` | yes | `https://…` HTTPS (prefer CDN) |
| `sha256` | yes | 64-char hex of the **signed** binary |
| `version` | yes | Semver / packaging version |
| `status` | yes | Set to `"available"` (placeholder is `"web_fallback"`) |

2. Set `VITE_PORTAL_USE_RELEASE_INSTALLERS=true` and rebuild.

Without the flag, filled manifests stay inert (safe default).

## Placeholders in tree

```
frontend/public/update-manifests/astudio.json
frontend/public/update-manifests/aconsulting.json
frontend/public/update-manifests/aqc-estimation.json
frontend/public/update-manifests/aqc-bbs.json
frontend/public/update-manifests/aqc-pm.json
frontend/public/update-manifests/aadt.json
```

Binary staging dir `frontend/public/downloads/` remains **gitignored**.

## Out of scope here

- Building / signing installers → **Bhoomi**
- Firm portal tab wiring beyond published reads
- SaaS SKUs / storage metering (deferred; OSS for now)

## Related

- [MARKET-FIT.md](MARKET-FIT.md) · [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md)
- [LOCAL-FIRST.md](LOCAL-FIRST.md) · [ROADMAP.md](ROADMAP.md) · [DESKTOP-REPOS.md](DESKTOP-REPOS.md)
