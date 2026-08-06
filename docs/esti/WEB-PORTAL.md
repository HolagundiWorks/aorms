# AORMS web portal — desktop downloads

**Status:** Canonical · **Updated:** 2026-08-06 · **Owner:** Aakash (Portal / GTM / UX)  
**Runtime law:** [LOCAL-FIRST.md](LOCAL-FIRST.md) · **UX:** [DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md)  
**Agent split:** [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md) § Aakash

Public surface for **signed** local-first Windows installers. Same SPA as web;
legacy Lite / Pro / Community Manager SKUs stay **retired**.

## Surface

| Path | Behaviour |
| --- | --- |
| `/downloads` | Live portal — AStudio + AConsulting offers |
| `/download` | Legacy Manager path → **redirects to `/downloads`** |

Host: platform apex (`aorms.in`). Code: `frontend/src/routes/Downloads.tsx` ·
resolver `frontend/src/lib/desktop-installers.ts`.

## Honesty rule (do not break)

| State | CTA |
| --- | --- |
| No signed URL wired | **web_fallback** — “Open … in browser” only |
| Signed URL + sha256 live | **Download … for Windows** |

**Never** point live CTAs at unsigned overnight `Setup.exe` from Bhoomi morning
builds ([MORNING-TEST-LF4.md](MORNING-TEST-LF4.md)). Wait on Bhoomi for signed
URL + sha256 before flipping.

## One-line fill (after Bhoomi signs)

### Option A — env (preferred for prod rebuild)

```bash
VITE_ASTUDIO_INSTALLER_URL=https://cdn.example.com/AStudio-Setup-1.0.0.exe
VITE_ACONSULTING_INSTALLER_URL=https://cdn.example.com/AConsulting-Setup-1.0.0.exe
# rebuild frontend (deploy/update.sh)
```

### Option B — update manifests + gate flag

1. Edit `frontend/public/update-manifests/astudio.json` (and `aconsulting.json`):

| Field | Required | Notes |
| --- | --- | --- |
| `url` | yes | `https://…` or site-relative `/downloads/…` |
| `sha256` | yes | 64-char hex of the **signed** binary |
| `version` | yes | Semver / packaging version |
| `status` | yes | Set to `"available"` (placeholder is `"web_fallback"`) |
| `signature` | optional | Authenticode / package sig metadata |
| `publishedAt` | optional | ISO-8601 |

2. Set `VITE_PORTAL_USE_RELEASE_INSTALLERS=true` and rebuild.

Without the flag, filled manifests stay inert (safe default).

## Placeholders in tree

```
frontend/public/update-manifests/astudio.json      # status=web_fallback
frontend/public/update-manifests/aconsulting.json  # status=web_fallback
```

Binary staging dir `frontend/public/downloads/` remains **gitignored** — host
signed artefacts via CDN or deploy copy, not the repo.

## What Bhoomi must provide

| Deliverable | Used by |
| --- | --- |
| Code-signed `Setup.exe` URL (AStudio / AConsulting) | `VITE_*_INSTALLER_URL` or manifest `url` |
| SHA-256 of that binary | manifest `sha256` (and optional UI display) |
| Version string | manifest `version` |
| Confirmation “signed for release” (not morning smoke) | Operator / Aakash before flipping status / env |

## Out of scope here

- Building / signing installers → **Bhoomi**  
- Hub `syncToken` mint / sync APIs → **Gagan**  
- Extracting SPA into sibling repos → future; scaffolds only in
  [repo-scaffolds/](repo-scaffolds/)

## Related

- [DESKTOP-REPOS.md](DESKTOP-REPOS.md) — Portal → installer wiring  
- [MARKET-FIT.md](MARKET-FIT.md) § M8  
- [ROADMAP.md](ROADMAP.md) § Local-first · agent split  
- [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md)  
