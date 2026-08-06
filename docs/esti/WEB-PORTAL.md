# AORMS web portal — desktop downloads

**Status:** Canonical · **Updated:** 2026-08-06 · **Owner:** Aakash (Portal / GTM / UX)  
**Runtime law:** [LOCAL-FIRST.md](LOCAL-FIRST.md) · **UX:** [DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md)  
**Crew (Vishwakarma owns status):** [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md) § Aakash

Public surface for **signed** local-first Windows installers. Same SPA as web;
legacy Lite / Pro / Community Manager SKUs stay **retired**.

**Stack law (LF4):** preferred desktop shell is **C# WinUI 3 Fluent 2 + WebView2**
(`desktop/AStudio.Shell`, build `desktop/scripts/build-winui.ps1`).  
**Tauri NSIS `Setup.exe` is legacy** — do **not** wire `/downloads` CTAs to Tauri
artifacts under `desktop/artifacts/` or unsigned morning smoke builds.

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
| Signed WinUI URL + sha256 live | **Download … for Windows** |

Stay on **`web_fallback`** until **Bhoomi** hands a **code-signed WinUI** package
URL + sha256 + version (handoff fields in [MORNING-TEST-LF4.md](MORNING-TEST-LF4.md) —
do not fork that checklist here). Never point CTAs at Tauri NSIS or unsigned
`desktop/artifacts/` binaries.

## Portal → installer wiring

```text
Bhoomi (Local · WinUI)                 Aakash (Portal)
──────────────────────                 ───────────────
signed WinUI package ──url+sha256──►   VITE_*_INSTALLER_URL
  (build-winui.ps1)                    or update-manifests/*.json
                                       + VITE_PORTAL_USE_RELEASE_INSTALLERS=true
                                                │
                                                ▼
                                       aorms.in/downloads  (web_fallback until then)
```

Sibling-repo / contracts gate: [DESKTOP-REPOS.md](DESKTOP-REPOS.md).  
This file owns **portal fill fields only** — not the WinUI C# project, hub
`syncToken`, or MORNING-TEST status tables.

## One-line fill (after Bhoomi signs WinUI)

### Option A — env (preferred for prod rebuild)

```bash
VITE_ASTUDIO_INSTALLER_URL=https://cdn.example.com/AStudio-WinUI-1.0.0.exe
VITE_ACONSULTING_INSTALLER_URL=https://cdn.example.com/AConsulting-WinUI-1.0.0.exe
# rebuild frontend (deploy/update.sh)
```

### Option B — update manifests + gate flag

1. Edit `frontend/public/update-manifests/astudio.json` (and `aconsulting.json`):

| Field | Required | Notes |
| --- | --- | --- |
| `url` | yes | `https://…` HTTPS CDN of the **signed WinUI** package — never Tauri NSIS / `desktop/artifacts/` |
| `sha256` | yes | 64-char hex of that signed binary |
| `version` | yes | Semver / packaging version from Bhoomi |
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

## What Bhoomi must provide (handoff)

| Deliverable | Fill |
| --- | --- |
| Code-signed **WinUI** AStudio package HTTPS URL | `VITE_ASTUDIO_INSTALLER_URL` **or** `astudio.json` → `url` |
| Code-signed **WinUI** AConsulting package HTTPS URL | `VITE_ACONSULTING_INSTALLER_URL` **or** `aconsulting.json` → `url` |
| SHA-256 (64 hex) per binary | matching manifest `sha256` |
| Version string | matching manifest `version` |
| “Signed WinUI for release” (not Tauri / not morning smoke) | then `status: available` + `VITE_PORTAL_USE_RELEASE_INSTALLERS=true` **or** env URLs + rebuild |

Canonical field list also lives in [MORNING-TEST-LF4.md](MORNING-TEST-LF4.md) (Bhoomi/Vish).

## Out of scope here

- Building / signing WinUI (`desktop/AStudio.Shell`, `build-winui.ps1`) → **Bhoomi**  
- Hub `syncToken` mint / sync APIs / `HUB-API.md` → **Gagan**  
- ROADMAP / AGENT-WORKSTREAMS / MORNING-TEST status tables → **Vishwakarma**  
- Extracting SPA into sibling repos → scaffolds only in [repo-scaffolds/](repo-scaffolds/)

## Related

- [MARKET-FIT.md](MARKET-FIT.md) § M8 (item 4 stays 🔲 until signed WinUI URL)  
- [FIGMA-TOKEN-SYNC.md](FIGMA-TOKEN-SYNC.md) · [DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md)  
- [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md)  
- [LOCAL-FIRST.md](LOCAL-FIRST.md) · [ROADMAP.md](ROADMAP.md) (status owned by Vish)  
