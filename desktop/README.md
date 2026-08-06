# AORMS Desktop node

Packaged **local-first** install of AORMS (`ESTI_ROLE=node`). The staff SPA talks to a
loopback backend; calculations, the Python worker, and Ollama/EOMS stay on the machine.
Licensed nodes realtime-sync **metadata** to the cloud hub and push **finalized**
artifacts via the Phase B outbox. See [`docs/esti/LOCAL-FIRST.md`](../docs/esti/LOCAL-FIRST.md).

## Canonical shell (LF4) — WinUI 3 + Fluent 2

**C# WinUI 3** (Windows App SDK) provides OS chrome (Mica title bar · native menu ·
tray hooks). The **stage** is the existing React SPA in **WebView2** — same
`@hcw/ui-kit` as web ([DESKTOP-WEB-PARITY-UX.md](../docs/esti/DESKTOP-WEB-PARITY-UX.md)).

```
desktop/
  README.md
  env.desktop.example
  AStudio.Shell/            ← WinUI 3 project (canonical)
  scripts/
    build-winui.ps1         ← canonical publish (`-Sign` optional)
    sign-winui.ps1          ← Authenticode + sha256 handoff JSON (no portal flip)
    build-installer.ps1     ← delegates to build-winui.ps1
    start-node.ps1 / .sh
  artifacts/winui/          ← publish output (gitignored)
```

### Build / run

```powershell
# Start loopback stack
powershell -File desktop/scripts/start-node.ps1

# Publish WinUI shell (STUDIO | CONSULTANCY) — Windows-only
powershell -File desktop/scripts/build-winui.ps1 -Profile STUDIO
# Sign + write handoff JSON (ACO-dev or CA PFX via env):
powershell -File desktop/scripts/sign-winui.ps1 -Profile STUDIO
# One-shot build+sign:
powershell -File desktop/scripts/build-winui.ps1 -Profile STUDIO -Sign -SkipFrontendBuild
# CA-only gate (fails on self-signed / ACO-dev):
powershell -File desktop/scripts/sign-winui.ps1 -Profile STUDIO -RequireTrustedChain
```

```powershell
# Preferred release signing (session env — never commit PFX/password)
$env:AORMS_CODESIGN_PFX = "C:\path\to\codesign.pfx"
$env:AORMS_CODESIGN_PFX_PASSWORD = "…"
powershell -File desktop/scripts/sign-winui.ps1 -Profile STUDIO -RequireTrustedChain -Version 1.0.0
# Then upload exe to HTTPS and fill WEB-PORTAL.md fields from
# desktop/artifacts/winui/handoff-studio.json
```

```powershell
# Dev: point WebView2 at Vite
$env:AORMS_SPA_URL = "http://127.0.0.1:5173"
$env:AORMS_REPO_ROOT = (Resolve-Path .).Path
# then launch desktop/artifacts/winui/AStudio.Shell.exe
```

```bash
# Linux / Cursor cloud — structure smoke only (no WinUI publish)
bash desktop/scripts/validate-winui-shell.sh
```

### Operator runbook (sign → bind → Aakash)

Full PowerShell sequence (build → `signtool` → install → activate →
`hasSyncToken` → flush → `Get-FileHash` → HTTPS handoff) lives in
[`docs/esti/MORNING-TEST-LF4.md`](../docs/esti/MORNING-TEST-LF4.md) §
**Operator runbook**. Do **not** invent sha256 or flip portal download URLs.

**Missing on cloud Linux (this agent host):** `dotnet`, `pwsh`, Windows App SDK,
WebView2, Windows SDK `signtool`, Authenticode cert.

On a Windows host with VS / Windows SDK: use `sign-winui.ps1` (writes
`handoff-*.json`). Portal manifests stay `web_fallback` until
`chainTrusted=true` **and** a real HTTPS URL is filled ([WEB-PORTAL.md](../docs/esti/WEB-PORTAL.md)).

Profiles: compile-time `AormsDesktopProfile=STUDIO|CONSULTANCY` (assembly title +
`window.__AORMS_NATIVE_SHELL__.profile`).

Native menu commands post `aorms-native-command` into the SPA
(`frontend/src/lib/desktopNativeBridge.ts`) — same command IDs as the parity doc.
`DesktopLicenceBind` treats native `host: 'desktop'` as desktop for first-run
licence / `syncToken` bind.

## Runtime contract

| Variable | Value |
| --- | --- |
| `ESTI_ROLE` | `node` |
| `ESTI_DESKTOP` | `true` |
| `STORAGE_DRIVER` | `fs` |
| `STORAGE_DIR` | platform app-data path |
| `INSTALL_ID` | stable UUID minted on first launch |
| `ESTI_HUB_URL` | `https://aorms.in` (or empty for free offline-only) |
| `DATABASE_URL` | local Postgres (bundled or Docker) |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` |
| `EOMS_API_URL` | `http://127.0.0.1:8756` (optional) |
| `AORMS_SPA_URL` | WebView2 start URL (default `http://127.0.0.1:5173`) |
| `AORMS_REPO_ROOT` | repo root so the shell can find `start-node.ps1` |

The shell does **not** fork the React app — it loads the same SPA as web
(`frontend/`) against `VITE_API_URL=http://127.0.0.1:4000`.

## Licence bind

1. First run generates `INSTALL_ID` and opens the SPA login.
2. Owner activates a licence against `ESTI_HUB_URL` / License Manager (`syncToken` stored in org settings) via in-SPA `DesktopLicenceBind`.
3. `sync.capabilities` then flips `metaSync` + `artifactSync` on for licensed desktops.
4. Free / unbound desktop keeps local AI + worker; hub sync stays off.

## Dev without a native build

```powershell
$env:ESTI_DESKTOP = "true"
$env:STORAGE_DRIVER = "fs"
$env:INSTALL_ID = "dev-desktop-1"
$env:VITE_RUNTIME_HOST = "desktop"
docker compose up -d --build
```

Or run `desktop/scripts/start-node.ps1` after Docker is available.
