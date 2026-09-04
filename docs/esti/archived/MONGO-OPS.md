# MongoDB ops store (suite non-drawing cloud data)

**Status:** ACTIVE spike · **Updated:** 2026-08-07  
**Canon:** [AORMS-SUITE.md](AORMS-SUITE.md) · Runtime: [LOCAL-FIRST.md](LOCAL-FIRST.md)

## Role

**MongoDB** holds firm-scoped **ops and communications** documents. It does **not**
store CAD entities (that is ShilpiDB) or recompute money (that is `bbs_engine`).

| Collection | Purpose |
| --- | --- |
| `tasks` | Published task snapshots for portals |
| `published_artifacts` | Drawing packages / PDF pointers (`drawingPackageId`, `vdbUri`, `storageKey`) |

Postgres remains transitional for legacy tables until fully migrated.

## Env

| Var | Default | Notes |
| --- | --- | --- |
| `MONGODB_URL` | empty → **in-memory** fallback | Compose: `mongodb://mongo:27017` |
| `MONGODB_DB` | `aorms_ops` | Database name |

## Wire

| Call | Auth | Role |
| --- | --- | --- |
| `POST /api/ops/tasks` | Bearer `syncToken` | Desktop flush |
| `GET /api/ops/tasks` | Bearer `syncToken` | Desktop pull |
| `POST /api/ops/artifacts` | Bearer `syncToken` | Publish drawing/PDF pointer |
| `GET /api/ops/artifacts` | Bearer `syncToken` | List |
| `trpc.mongoOps.publishTask` | Staff session | Manager publish |
| `trpc.mongoOps.portalTasks` | Client portal | Portal read |
| `trpc.mongoOps.portalDrawingPackages` | Client portal | Drawing packages |
| `trpc.mongoOps.adminBrowse` | Staff session | Ops DB manager (tasks · artifacts) |
| `trpc.mongoOps.adminConnectorSummary` | `firm:admin` | Connector strip + recent `esti_sync_record` / `esti_meta_event` after desktop Flush |

**Desktop ↔ web:** [AORMS Connect](AORMS-CONNECT.md) Activate → outbox → Flush → hub `/api/sync/meta` + `/api/ops/*`. Browse results on **Connection manager** (`/ops-db` · alias `/connection-manager`; Admin menu). The web manager never edits `firm.db` ([LOCAL-FIRST.md](LOCAL-FIRST.md) · [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md)).

Code: `backend/src/lib/mongo/ops.ts` · `backend/src/modules/mongoOps/` · `frontend/src/routes/OpsDbManager.tsx`.

## Compose

Service `mongo` (Mongo 7) on `:27017`. Backend depends on it when using compose defaults.
