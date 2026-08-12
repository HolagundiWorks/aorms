# ShilpiDB wire across the AORMS suite

**Status:** ACTIVE · **Updated:** 2026-08-07  
**Canon:** [AORMS-SUITE.md](AORMS-SUITE.md) · Upstream: [shilpidb](https://github.com/HolagundiWorks/shilpidb) · [ADraft](https://github.com/HolagundiWorks/AADT)

## Role

**ShilpiDB** is the geometry spine. ADraft authors entities; Estimation / BBS / PM
query sheets; portals show **published packages** only (Mongo pointers + object
store), never live edit sessions.

## Env

| Var | Purpose |
| --- | --- |
| `SHILPI_HTTP_URL` | Gateway base, e.g. `http://127.0.0.1:7421` |
| `SHILPI_BACKEND` | Optional note of `shilpid` bind (default `127.0.0.1:7420`) |

## Hub helpers

- `backend/src/lib/shilpi/client.ts` — health + bbox query via `shilpi-http`
- `trpc.mongoOps.portalDrawingPackages` — Mongo `published_artifacts` with `entity=drawingPackage`
- Portal **Drawings** tab merges LIVE drawings + Mongo package refs

## Publish flow

1. ADraft / technical app finalizes a sheet → Shilpi local or project `shilpid`
2. Desktop posts `POST /api/ops/artifacts` with `entity: "drawingPackage"`, `drawingPackageId`, optional `vdbUri` / `storageKey`
3. Portal reads packages via `mongoOps.portalDrawingPackages`

## Local smoke

```bat
cargo run -p shilpid -- --bind 127.0.0.1:7420 --data ./firm.vdb
cargo run -p shilpi-http -- --bind 127.0.0.1:7421 --backend 127.0.0.1:7420
```

Set `SHILPI_HTTP_URL=http://127.0.0.1:7421` on the hub/backend for proxy health checks.
