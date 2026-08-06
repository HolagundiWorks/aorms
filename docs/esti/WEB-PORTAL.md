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

## Resolver contract (exact — matches `desktop-installers.ts`)

| Input | Gate for Download CTA | Notes |
| --- | --- | --- |
| `VITE_ASTUDIO_INSTALLER_URL` / `VITE_ACONSULTING_INSTALLER_URL` | URL non-empty and `https://…` **or** site-relative `/…` | **Option A** — env wins over manifest; CTA flips without the release flag |
| Manifest `url` + `sha256` + `status=available` | **and** `VITE_PORTAL_USE_RELEASE_INSTALLERS=true` | **Option B** — all four required; `sha256` must be 64 hex |
| Manifest `version` / `sha256` | Display only when env path used | Always fill for UI honesty even on Option A |
| Placeholder / empty | stays `web_fallback` | Current tree state — **do not flip until Bhoomi signs** |

Code: `frontend/src/lib/desktop-installers.ts` · `resolveInstallerOffer`.  
Env keys also declared in `frontend/src/vite-env.d.ts` · `.env.example` · `deploy/.env.production.example`.

## One-line fill (after Bhoomi signs WinUI)

### Option A — env (preferred for prod rebuild)

```bash
# deploy/.env.production (or CI secrets) — then rebuild frontend
VITE_ASTUDIO_INSTALLER_URL=https://cdn.example.com/AStudio-WinUI-1.0.0.exe
VITE_ACONSULTING_INSTALLER_URL=https://cdn.example.com/AConsulting-WinUI-1.0.0.exe
# Also fill sha256 + version in update-manifests/*.json for checksum display
# (status may stay web_fallback when using env-only flip)
# rebuild: deploy/update.sh
```

### Option B — update manifests + gate flag

1. Edit `frontend/public/update-manifests/astudio.json` (and `aconsulting.json`):

| Field | Required for Option B | Notes |
| --- | --- | --- |
| `url` | yes | `https://…` HTTPS CDN of the **signed WinUI** package — never Tauri NSIS / `desktop/artifacts/` |
| `sha256` | yes | 64-char hex (`^[0-9a-f]{64}$`) of that signed binary |
| `version` | recommended | Semver / packaging version from Bhoomi (shown on `/downloads`) |
| `status` | yes | Set to `"available"` (placeholder is `"web_fallback"`) |
| `signature` | optional | Authenticode / package sig metadata |
| `publishedAt` | optional | ISO-8601 |
| `sizeBytes` | optional | number |

2. Set `VITE_PORTAL_USE_RELEASE_INSTALLERS=true` and rebuild.

Without the flag, filled manifests stay inert (safe default).

### Paste template — Bhoomi → Aakash handoff

Fill after signing; leave blanks until then. Aakash copies into env and/or JSON.

```text
app: astudio | aconsulting
url: https://…
sha256: <64 hex>
version: <e.g. 0.1.0>
signed: yes (WinUI · not Tauri · not morning smoke)
```

Worked **Option B** JSON shape (values empty until handoff — keep `web_fallback`):

```json
{
  "app": "astudio",
  "product": "AStudio",
  "version": "",
  "url": "",
  "sha256": "",
  "status": "web_fallback"
}
```

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

## CI note (visual / TypeScript)

esti-ci **Visual regression** on `main` currently fails in the frontend **build**
step on `packages/contracts` duplicate `ActivateResult.syncToken` (TS1117) —
cleared by **#55** / **#51**. That is **main pre-existing**, not a landing-hero
snapshot drift from `/downloads` or LF6 right-slot work. Do **not** mass-update
`e2e` baselines until TypeScript is green and a real intentional hero change
lands.
