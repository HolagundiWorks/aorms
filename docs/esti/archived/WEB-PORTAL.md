> **⚠️ HISTORICAL.** Archived 2026-09-04 — desktop installers were removed in
> the web-only office hub pivot. `frontend/src/lib/desktop-installers.ts`,
> the `VITE_ASTUDIO_INSTALLER_URL` / `VITE_ACONSULTING_INSTALLER_URL` env vars,
> and the update-manifest wiring described below no longer exist. `/downloads`
> now redirects straight to `/login`. Kept for historical reference only.

# AORMS web portal — desktop downloads (archived)

**Status:** Canonical · **Updated:** 2026-08-06 · **Owner:** Aakash (Portal / GTM / UX)  
**Runtime law:** [LOCAL-FIRST.md](LOCAL-FIRST.md) · **UX:** [DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md)  
**Crew (Vishwakarma owns status):** [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md) § Aakash  
*(link target lands with orch merge — this PR does not rewrite that file)*

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

**Never** point live CTAs at unsigned overnight binaries under `desktop/artifacts/`
(or any morning smoke `Setup.exe`). Wait on **Bhoomi** for a **code-signed** URL +
sha256 before flipping. Morning bind checklist is Bhoomi/Vish-owned
([MORNING-TEST-LF4.md](MORNING-TEST-LF4.md) — do not fork status tables here).

## Portal → installer wiring

```text
Bhoomi (Local)                         Aakash (Portal)
──────────────                         ───────────────
signed Setup.exe ──url + sha256──►     VITE_*_INSTALLER_URL
                                       or update-manifests/*.json
                                       + VITE_PORTAL_USE_RELEASE_INSTALLERS=true
                                                │
                                                ▼
                                       aorms.in/downloads  (web_fallback until then)
```

Sibling-repo / contracts gate stays with Vish/Gagan ([DESKTOP-REPOS.md](DESKTOP-REPOS.md)
after their PRs). This file owns **portal fill fields only**.

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
| `url` | yes | `https://…` HTTPS (prefer CDN). Do **not** use `desktop/artifacts/` paths |
| `sha256` | yes | 64-char hex of the **signed** binary |
| `version` | yes | Semver / packaging version |
| `status` | yes | Set to `"available"` (placeholder is `"web_fallback"`) |
| `signature` | optional | Authenticode / package sig metadata |
| `publishedAt` | optional | ISO-8601 |

2. Set `VITE_PORTAL_USE_RELEASE_INSTALLERS=true` and rebuild.

Without the flag, filled manifests stay inert (safe default).

Optional sha256 env mirrors (if used in deploy): document alongside URL fills —
manifest `sha256` remains the checksum source of truth for the portal UI.

## Placeholders in tree

```
frontend/public/update-manifests/astudio.json      # status=web_fallback
frontend/public/update-manifests/aconsulting.json  # status=web_fallback
```

Binary staging dir `frontend/public/downloads/` remains **gitignored** — host
signed artefacts via CDN or deploy copy, not the repo.

## What Bhoomi must provide (handoff)

| Deliverable | Fill |
| --- | --- |
| Code-signed AStudio `Setup.exe` HTTPS URL | `VITE_ASTUDIO_INSTALLER_URL` **or** `astudio.json` → `url` |
| Code-signed AConsulting `Setup.exe` HTTPS URL | `VITE_ACONSULTING_INSTALLER_URL` **or** `aconsulting.json` → `url` |
| SHA-256 (64 hex) per binary | matching manifest `sha256` |
| Version string | matching manifest `version` |
| “Signed for release” confirmation (not morning smoke) | then set manifest `status: available` + `VITE_PORTAL_USE_RELEASE_INSTALLERS=true` **or** set env URLs and rebuild |

## Out of scope here

- Building / signing installers → **Bhoomi** (`DesktopLicenceBind`, Tauri)  
- Hub `syncToken` mint / sync APIs / `HUB-API.md` → **Gagan**  
- ROADMAP / AGENT-WORKSTREAMS status tables → **Vishwakarma**  
- Extracting SPA into sibling repos → future; scaffolds only in
  [repo-scaffolds/](repo-scaffolds/)

## Related

- [MARKET-FIT.md](MARKET-FIT.md) § M8 (item 4 stays 🔲 until signed URL)  
- [FIGMA-TOKEN-SYNC.md](FIGMA-TOKEN-SYNC.md) · [DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md)  
- [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md)  
- [LOCAL-FIRST.md](LOCAL-FIRST.md) · [ROADMAP.md](ROADMAP.md) (status owned by Vish)  
