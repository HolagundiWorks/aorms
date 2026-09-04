# Morning manual test — LF4 / WinUI 3 shell (2026-08-06)

Operator checklist for the **canonical** desktop shell: **C# WinUI 3** Fluent 2
chrome + WebView2 SPA (`desktop/AStudio.Shell`). PR: **#49**
`orch/winui3-fluent2-shell` (rebased onto latest `main` with **#55** CI lint +
**#56** worker ruff; **#53** hub bind ✅ on `main`).

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

**Verify on hub (prod / staging):**

```bash
docker exec esti-db sh -lc "psql -U esti -d esti -c \"\\d hlp_organization\"" | grep sync_firm_id
# expect a uuid column; sample non-null:
docker exec esti-db sh -lc "psql -U esti -d esti -c \"select count(*) as orgs, count(sync_firm_id) as with_firm from hlp_organization\""
```

Wire contract: [HUB-API.md](HUB-API.md) (`2026-08`).

## Operator bind sequence (activate → flush)

Copy this for the morning run (SPA or desktop). Full wire detail in HUB-API.

| Step | Action | Pass when |
| --- | --- | --- |
| 0 | Hub has **0227** (`sync_firm_id` present — see verify above) | SQL shows column + counts |
| 1 | Node env: `ESTI_ROLE=node`, `ESTI_HUB_URL`, `ESTI_LICENSE_API_URL`, `ESTI_PRODUCT_API_KEY`, `INSTALL_ID` (+ `ESTI_DESKTOP=true` / `VITE_RUNTIME_HOST=desktop` for SPA) | Process starts |
| 2 | Firm admin runs **`license.activate`** with a live panel key | No tRPC error; returns licence view |
| 3 | Query **`sync.hubConfigured`** | `hasSyncToken === true`, `syncReady === true`, `role === "node"` |
| 4 | Query **`sync.capabilities`** | `metaSync` + `artifactSync` true (needs licence VALID/GRACE + hub + syncToken) |
| 5 | Call **`sync.flush`** then **`sync.pullMeta`** | No `skipped` / `skippedReason`; hub accepts bearer via `firmFromSyncToken` |

Fail cues: `missing_sync_token` → re-activate / refresh catch-up; `hub_unconfigured` → set `ESTI_HUB_URL`; `hub_unreachable` / 401 on flush → hub missing **0227**, wrong hub URL, or bearer not hashed on `hlp_device`.

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

1. Confirm hub has **`0227`** applied (see deploy gate above).
2. Run `desktop/artifacts/AORMS-Studio_0.1.0_x64-setup.exe` (SmartScreen may warn — unsigned).
3. Sign in as firm admin → activate with panel key → confirm `sync.hubConfigured`
   (`hasSyncToken` + `syncReady`, `role=node`).
4. Confirm `sync.capabilities.metaSync` / `artifactSync` true; `sync.flush` /
   `sync.pullMeta` succeed (no `skipped` / `skippedReason`).
5. Manual landing/wellbeing QA as planned earlier.

### 0. Tooling check

```powershell
$env:ESTI_ROLE = "node"
$env:ESTI_DESKTOP = "true"
$env:VITE_RUNTIME_HOST = "desktop"
$env:INSTALL_ID = "dev-desktop-1"
$env:ESTI_HUB_URL = "https://aorms.in"                    # sync origin (no /platform)
$env:ESTI_LICENSE_API_URL = "https://aorms.in/platform"   # panel /v1/*
$env:ESTI_PRODUCT_API_KEY = "<product api key>"           # required for activateViaPanel
docker compose up -d --build
# then: sign in as firm admin → license.activate → Operator bind sequence steps 3–5
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
