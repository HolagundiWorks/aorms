# Morning manual test — LF4 / WinUI 3 shell (2026-08-06)

Operator checklist for the **canonical** desktop shell: **C# WinUI 3** Fluent 2
chrome + WebView2 SPA (`desktop/AStudio.Shell`). PR: **#49**
`orch/winui3-fluent2-shell` (rebased onto latest `main` with **#55** CI lint +
**#56** worker ruff; **#53** hub bind ✅ on `main`).

## Prerequisites (human / ops)

| Gate | Owner | Status |
| --- | --- | --- |
| Merge **#55** (CI lint) · **#51** LF5 · **#54** LF6 | Vishwakarma | ✅ on `main` |
| Merge **#56** (worker ruff) | Vishwakarma | ✅ on `main` (`00abaad5`) |
| Merge **#53** (hub bind readiness) | Vishwakarma | ✅ on `main` |
| Hub migration **`0227_hlp_org_sync_firm.sql`** on production | Ops / hub | 🔲 prod · ✅ local Bhoomi2 |
| Windows host + .NET 8 + Windows App SDK + WebView2 | **Bhoomi2** | ✅ |
| Authenticode cert (SmartScreen) | Operator / **Bhoomi2** | 🔲 — **never invent sha256 or flip portal URLs** |

**Solo (2026-08-06):** cloud crew parked — **Bhoomi2** runs this checklist.

## Hub deploy gate (before bind) — **required**

```bash
docker cp backend/drizzle/0227_hlp_org_sync_firm.sql esti-db:/tmp/0227_hlp_org_sync_firm.sql
docker exec esti-db sh -lc "psql -U esti -d esti -f /tmp/0227_hlp_org_sync_firm.sql"
```

(Or backend boot `runMigrations()`.) Without `0227`, activate may mint `syncToken`
but hub ingest/meta firm resolve fails. Wire: [HUB-API.md](HUB-API.md) (`2026-08`).

---

## Operator runbook (Windows) — build → sign → bind → handoff

Run from **repo root** on a Windows machine with PowerShell 5.1+ / 7+.
Do **not** set `VITE_*_INSTALLER_URL` or manifest `status: available` until step 6
has a real HTTPS URL + measured sha256.

### 0. Tooling check

```powershell
dotnet --version          # expect 8.x
dotnet workload list      # Windows App SDK / maui-related workloads as installed
Get-Command signtool      # usually under Windows SDK 10 bin\x64
# WebView2 Evergreen runtime must be installed on the target PC
```

Missing on current Bhoomi cloud Linux host: `dotnet`, `pwsh` / Windows SDK
`signtool`, Windows App SDK, WebView2 — **cannot run WinUI publish here**
(use Windows host / Bhoomi2). LF4 engineering is already closed on ROADMAP.

### 1. Local node stack + unsigned publish

```powershell
powershell -NoProfile -File desktop/scripts/start-node.ps1

$env:VITE_RUNTIME_HOST = "desktop"
$env:ESTI_DESKTOP = "true"
powershell -NoProfile -File desktop/scripts/build-winui.ps1 -Profile STUDIO
# Output: desktop/artifacts/winui/studio/AStudio.Shell.exe  (gitignored)
```

### 2. Code-sign (operator cert — fill YOUR paths)

Preferred: use the handoff script (writes sha256 + portal fill stub; **never**
edits manifests):

```powershell
# CA / EV PFX (session env only)
$env:AORMS_CODESIGN_PFX = "C:\path\to\codesign.pfx"
$env:AORMS_CODESIGN_PFX_PASSWORD = "…"
powershell -NoProfile -File desktop/scripts/sign-winui.ps1 -Profile STUDIO -RequireTrustedChain -Version 1.0.0
# → desktop/artifacts/winui/studio/handoff-studio.json
```

Or raw `signtool`:

```powershell
$exe = (Resolve-Path "desktop/artifacts/winui/studio/AStudio.Shell.exe").Path
# PFX on operator machine only — never commit certs/passwords.
# $env:AORMS_CODESIGN_PFX = "C:\path\to\codesign.pfx"
# $env:AORMS_CODESIGN_PFX_PASSWORD = "…"   # session env; do not log
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 `
  /f $env:AORMS_CODESIGN_PFX /p $env:AORMS_CODESIGN_PFX_PASSWORD `
  $exe
signtool verify /pa $exe
```

Certificate store (thumbprint) alternative:

```powershell
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 `
  /sha1 <THUMBPRINT> $exe
```

### 3. Install / run

```powershell
$env:AORMS_SPA_URL = "http://127.0.0.1:5173"   # or file/dist URL after vite build
$env:AORMS_REPO_ROOT = (Resolve-Path .).Path
$env:VITE_RUNTIME_HOST = "desktop"
$env:ESTI_HUB_URL = "https://aorms.in"         # production hub with 0227
Start-Process $exe
```

### 4. Activate → `hasSyncToken`

1. Sign in as **firm admin**.
2. Complete `DesktopLicenceBind` (activation key) — or License panel activate.
3. In browser DevTools / tRPC playground against the node, confirm:
   - `sync.hubConfigured` → `hasSyncToken: true`, `syncReady: true`, `role: "node"`
   - `sync.capabilities` → `metaSync` + `artifactSync` true

### 5. Sync flush

```text
sync.flush     → no skippedReason; outbox drains when online
sync.pullMeta  → catch-up ok (or empty when cursor current)
```

### 6. Measure sha256 + hand to Aakash (only after HTTPS host)

```powershell
$exe = (Resolve-Path "desktop/artifacts/winui/studio/AStudio.Shell.exe").Path
Get-FileHash -Algorithm SHA256 $exe | Format-List
# Upload the SIGNED binary to your HTTPS release host, then fill:
#   version  = product version you ship
#   url      = https://… (never file:// or unsigned local path)
#   sha256   = 64 hex from Get-FileHash (lowercase or as measured — do not invent)
```

**Aakash fields (Bhoomi fills values; Aakash wires — do not flip until signed):**

| Field | Env | Manifest |
| --- | --- | --- |
| URL | `VITE_ASTUDIO_INSTALLER_URL` | `frontend/public/update-manifests/astudio.json` → `url` |
| SHA-256 | — | matching `sha256` |
| Version | — | matching `version` |
| Gate | `VITE_PORTAL_USE_RELEASE_INSTALLERS=true` | `status: available` |

**Handoff status (Bhoomi2 solo 2026-08-06 evening re-smoke):**

| Field | Value |
| --- | --- |
| Local artifact | `desktop/artifacts/winui/studio/AStudio.Shell.exe` (Consultancy: `…/consultancy/AConsulting.Shell.exe`) |
| Signed | ✅ ACO **dev** (`CN=Human Centric Works`, thumbprint `DE6594C4…`) + DigiCert timestamp — root **not** trusted by SmartScreen; **not** for portal flip |
| SHA-256 | `57774D65212B249A20CFA9DF712B317F6ECDA7BA4308E65B43A5BD1D5A4099DD` *(rebuilt + re-signed 2026-08-06; prior morning hash `E25E2667…` superseded)* |
| Public HTTPS URL | 🔲 pending SmartScreen-trusted cert + release host |
| Bind verified | ✅ re-smoke — `hasSyncToken=true`, `syncReady=true`, `role=node`, `metaSync`+`artifactSync`, `sync.flush` ok, `sync.pullMeta` empty catch-up. Colocated: `ESTI_ROLE=node` + `ESTI_COLOCATED_HUB=true`. Demo login `principal@demo.aorms.in`. |
| Local hub `0227` | ✅ applied on `esti-db` |

**LF4 engineering is COMPLETE** on [ROADMAP.md](ROADMAP.md). Remaining steps are
**post-delivery ops only** (not product backlog).

**Next operator gate (cannot invent):** purchase/install a **SmartScreen-trusted** Authenticode cert (or EV), re-sign, upload HTTPS, then fill manifests / `VITE_*_INSTALLER_URL`. Keep `status: web_fallback` until then.

---

## What landed (code on #49)

1. Panel activate → `syncToken` on `main` (Gagan #45 · `0227`).
2. `DesktopLicenceBind` when desktop host **or** WinUI `__AORMS_NATIVE_SHELL__.host=desktop`.
3. WinUI shell + `build-winui.ps1` (legacy Tauri scaffold removed — WinUI 3 is the only shell).
4. SPA bridge `desktopNativeBridge.ts`.
5. Linux smoke: `bash desktop/scripts/validate-winui-shell.sh`.

## Dev without publish / without native shell

```powershell
# Vite + compose only
$env:ESTI_DESKTOP = "true"
$env:VITE_RUNTIME_HOST = "desktop"
$env:INSTALL_ID = "dev-desktop-1"
$env:ESTI_HUB_URL = "https://aorms.in"
docker compose up -d --build
```

```powershell
# Dotnet run (Windows) against Vite
$env:AORMS_SPA_URL = "http://127.0.0.1:5173"
$env:AORMS_REPO_ROOT = (Resolve-Path .).Path
dotnet run --project desktop/AStudio.Shell -p:AormsDesktopProfile=STUDIO -p:Platform=x64
```

```bash
# Linux / cloud structure only
bash desktop/scripts/validate-winui-shell.sh
```

## Legacy / deferred

- Legacy Tauri scaffold (`desktop/src-tauri/`) + WinLibs NSIS — **removed; WinUI 3 is the only shell**.
- Bundled Postgres/Redis sidecar, repo extraction, Stripe / W4 — deferred.
- Live portal URL flips — **Aakash waits on signed HTTPS + measured sha256**.
