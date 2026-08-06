# Morning manual test — LF4 / roadmap overnight (2026-08-06)

Operator checklist after the overnight agent pass.

## Hub deploy gate (before bind) — **required**

On the **cloud hub** DB, apply migration **`0227_hlp_org_sync_firm.sql`** before
morning licence bind. It adds `hlp_organization.sync_firm_id` (UUID) used by
`firmFromSyncToken` for panel `hlp_device` bearers. Idempotent — safe to re-run:

```bash
docker cp backend/drizzle/0227_hlp_org_sync_firm.sql esti-db:/tmp/0227_hlp_org_sync_firm.sql
docker exec esti-db sh -lc "psql -U esti -d esti -f /tmp/0227_hlp_org_sync_firm.sql"
```

(Or rely on backend boot `runMigrations()` after deploy/update.) Without `0227`,
activate may mint `syncToken` but hub ingest/meta firm resolve fails.

Wire contract: [HUB-API.md](HUB-API.md) (`2026-08`).

## What landed overnight (code)

1. **Panel activate → syncToken** — `/platform/v1/activate` + refresh mint a hub
   sync bearer; node `license.activate` persists `syncToken`; hub
   `firmFromSyncToken` resolves legacy installs **and** `hlp_device` rows.
2. **Desktop first-run UI** — `DesktopLicenceBind` dialog for firm admins when
   `VITE_RUNTIME_HOST=desktop` (or caps.host=desktop) and licence/sync bind is
   missing.
3. **LicensePanel** invalidates `sync.*` after activate/refresh.
4. **Installer hygiene** — `frontendDist` + Docker `vite build` + `docker cp`
   of `frontend/dist` when host `pnpm` is missing; valid `icon.ico` for windres.
5. **HUB-API.md** — versioned hub contract (DESKTOP-REPOS gate doc item).
6. **MUI v6 slotProps** — `DesktopLicenceBind` + `LandingCalculator` fixed;
   frontend + backend `tsc --noEmit` clean.
7. **Gagan hub readiness** — `sync.*` skip reasons + desktop caps require
   `syncToken`; `ActivateResult` duplicate field fixed; `runtimeCapabilities`
   extracted under `backend/src/lib/sync/`.

## Unsigned installer built overnight ✅

Artifact (unsigned — sign before portal publish):

- `desktop/artifacts/AORMS-Studio_0.1.0_x64-setup.exe`
- `desktop/artifacts/aorms-desktop.exe` (shell smoke)

Built with **WinLibs MinGW** (`stable-x86_64-pc-windows-gnu`) because
**MSVC `VCTools` needs an interactive UAC** (Build Tools is installed without
C++ workload; elevated modify was canceled while away). Prebuilt
`cargo-tauri` 2.11.4 is in `%USERPROFILE%\.cargo\bin`.

### Rebuild (same path)

```powershell
$mingw = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.MSVCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin"
$env:PATH = "$mingw;$env:USERPROFILE\.cargo\bin;$env:PATH"
$env:RUSTUP_TOOLCHAIN = "stable-x86_64-pc-windows-gnu"
# optional preferred long-term: Install VS Build Tools → Desktop C++ → use default msvc toolchain
powershell -File desktop/scripts/build-installer.ps1 -Profile STUDIO
```

### Prefer MSVC (morning)

1. Visual Studio Installer → Build Tools 2022 → Modify → **Desktop development with C++**
2. `rustup default stable-x86_64-pc-windows-msvc`
3. Rebuild + **code-sign** Setup.exe with your cert
4. Publish → set `VITE_ASTUDIO_INSTALLER_URL` + `update-manifests/astudio.json`

## Physical install gate

1. Confirm hub has **`0227`** applied (see deploy gate above).
2. Run `desktop/artifacts/AORMS-Studio_0.1.0_x64-setup.exe` (SmartScreen may warn — unsigned).
3. Sign in as firm admin → activate with panel key → confirm `sync.hubConfigured`
   (`hasSyncToken` + `syncReady`, `role=node`).
4. Confirm `sync.capabilities.metaSync` / `artifactSync` true; `sync.flush` /
   `sync.pullMeta` succeed (no `skipped` / `skippedReason`).
5. Manual landing/wellbeing QA as planned earlier.

## Quick SPA test without Tauri

```powershell
$env:ESTI_DESKTOP = "true"
$env:VITE_RUNTIME_HOST = "desktop"
$env:INSTALL_ID = "dev-desktop-1"
$env:ESTI_HUB_URL = "https://aorms.in"
docker compose up -d --build
```

## Still out of scope tonight

- Code signing / portal installer URLs
- Bundled Postgres/Redis/backend sidecar inside Setup.exe
- Repo extraction of AStudio/AConsulting (gate needs signed + physical bind)
- Stripe / W4 integrations (deferred by choice)
