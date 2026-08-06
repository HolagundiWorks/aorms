# Desktop product repos — extraction law

**Status:** Canonical · **Updated:** 2026-08-06 · **Owner:** HCW  
**Do not extract Studio/Consultancy app code until the gate below is green.**

## Target end-state

| Repo | Owns |
| --- | --- |
| **[esti](https://github.com/HolagundiWorks/esti)** | Web Portal · hub API · License Manager · sync · `@esti/contracts` · shared SPA SoT |
| **AStudio** (`HolagundiWorks/AStudio`) | Studio desktop shell + Studio-native extras (calls hub) |
| **AConsulting** (`HolagundiWorks/AConsulting`) | Consultancy desktop shell (calls hub) |
| **[AQC](https://github.com/HolagundiWorks/AQC)** | Construction QA desktop (already separate) |
| **[AADT](https://github.com/HolagundiWorks/AADT)** | AI drafting (already separate) |
| **[shilpidb](https://github.com/HolagundiWorks/shilpidb)** | Geometry-native vector DB |

Until extraction, Studio and Consultancy **desktop flavors** ship from
[`desktop/`](../../desktop/) inside esti (LF4), with workspace profile
`STUDIO` | `CONSULTANCY`.

## Extraction gate (all required)

- [x] **WP1** — `/downloads` hub live with accurate product status  
- [ ] **LF4** — signed AStudio-branded Windows installer installs, signs in, binds licence, syncs meta on a test firm *(SPA bind + syncToken path ready — [MORNING-TEST-LF4.md](MORNING-TEST-LF4.md))*  
- [x] Hub APIs versioned and documented: auth, licence activate, `sync.*` — [HUB-API.md](HUB-API.md) (`2026-08`)  
- [ ] `@esti/contracts` (or OpenAPI) published for node clients  
- [ ] Portal `/download/astudio` points at a real Setup.exe (not web app fallback)

## What always stays in esti

- Backend, Drizzle migrations, Redis jobs, Python worker (hub role)  
- HCW License Manager (`backend/src/licensing-platform/`, `frontend/src/platform-admin/`)  
- Portal SPA routes (landing, downloads, account, docs, blog)  
- Sync hub (`esti_meta_*`, `esti_sync_*`)  
- Shared contracts package

## Extraction procedure (when gate is green)

1. Create `HolagundiWorks/AStudio` and `HolagundiWorks/AConsulting` with README pointing at esti hub.  
2. CI builds Tauri (or thin wrapper) consuming esti SPA artifact **or** submodule of `frontend` + local node compose.  
3. Releases publish `AStudio-Setup-*.exe` / `AConsulting-Setup-*.exe`.  
4. Update portal download URLs (like AQC today).  
5. esti keeps portal + hub; do **not** fork migrations or License Manager.

## Anti-patterns

- Splitting backend or contracts out of esti early  
- Re-splitting License Manager  
- Greenfield Electron/WinUI Studio clients before LF4 proves licence + sync bind  
- Empty “marketing-only” forks that drift from hub APIs

## Scaffold placeholders (Phase 3 — no app code)

Org placeholders live under [`docs/esti/repo-scaffolds/`](repo-scaffolds/):

| Path | GitHub target |
| --- | --- |
| [`AStudio/README.md`](repo-scaffolds/AStudio/README.md) | `HolagundiWorks/AStudio` |
| [`AConsulting/README.md`](repo-scaffolds/AConsulting/README.md) | `HolagundiWorks/AConsulting` |

Create empty public repos with those READMEs when convenient (`gh repo create … --source=…`). **Do not move app code** until the gate above is green. This workspace had no `gh` CLI at scaffold time — operators create the remotes from the folders above.

## Portal → installer wiring (pre-extraction)

After LF4 publishes Setup.exe to esti Releases:

1. Set `VITE_ASTUDIO_INSTALLER_URL` / `VITE_ACONSULTING_INSTALLER_URL` to the asset URLs, **or**  
2. Set `VITE_PORTAL_USE_RELEASE_INSTALLERS=true` to use product `installerUrl` (esti `/releases/latest`).  
3. Fill `url` + `sha256` in `frontend/public/update-manifests/{astudio,aconsulting}.json`.

Until then `/download/astudio` and `/download/aconsulting` remain **web_fallback** (browser workspace).

## Related

- [HUB-API.md](HUB-API.md) — versioned hub contract for desktop nodes  
- [WEB-PORTAL.md](WEB-PORTAL.md)  
- [LOCAL-FIRST.md](LOCAL-FIRST.md)  
- [AORMS-ECOSYSTEM-ARCHITECTURE.md](AORMS-ECOSYSTEM-ARCHITECTURE.md)  
- [ROADMAP.md](ROADMAP.md)
