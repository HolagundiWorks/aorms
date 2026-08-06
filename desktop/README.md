# AORMS Desktop node

Packaged **local-first** install of AORMS (`ESTI_ROLE=node`). The staff SPA talks to a
loopback backend; calculations, the Python worker, and Ollama/EOMS stay on the machine.
Licensed nodes realtime-sync **metadata** to the cloud hub and push **finalized**
artifacts via the Phase B outbox. See [`docs/esti/LOCAL-FIRST.md`](../docs/esti/LOCAL-FIRST.md).

## Layout

```
desktop/
  README.md                 ← this file
  env.desktop.example       ← env template for the bundled stack
  tauri.conf.json           ← Tauri shell config (window → http://127.0.0.1:5173)
  src-tauri/                 ← optional native project (scaffold; wire on first packaging wave)
  scripts/
    start-node.sh           ← Unix: start local compose profile / stack
    start-node.ps1          ← Windows
```

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

The shell does **not** fork the React app — it loads the same SPA as web
(`frontend/`) against `VITE_API_URL=http://127.0.0.1:4000`.

## Licence bind

1. First run generates `INSTALL_ID` and opens the SPA login.
2. Owner activates a licence via `license.activate` against License Manager
   (`ESTI_LICENSE_API_URL` + product API key). Panel returns `licenseToken` **and**
   `syncToken` (hub API **2026-08** — see [HUB-API.md](../docs/esti/HUB-API.md)).
3. Node persists both on org settings; hub hashes `syncToken` on `hlp_device`.
4. `sync.hubConfigured.syncReady` is true when `ESTI_HUB_URL` + `syncToken` are set;
   `sync.capabilities` flips `metaSync` + `artifactSync` on for licensed desktops.
5. Free / unbound desktop keeps local AI + worker; hub sync stays off.

**Bhoomi** owns the installer / first-run UX (LF4). **Gagan** owns the hub wire above.

## Dev without a native build

```powershell
# From repo root — same compose stack as web, with desktop capability flags:
$env:ESTI_DESKTOP = "true"
$env:STORAGE_DRIVER = "fs"
$env:INSTALL_ID = "dev-desktop-1"
docker compose up -d --build
```

Or run `desktop/scripts/start-node.ps1` after Docker is available.
