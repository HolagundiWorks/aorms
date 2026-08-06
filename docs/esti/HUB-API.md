# AORMS hub API — desktop node contract

**API version:** `2026-08`  
**Status:** Canonical · **Updated:** 2026-08-06  
**Audience:** Desktop / firm **node** clients (`ESTI_ROLE=node`) talking to the cloud **hub**.

Sync plane schemas live in [`packages/contracts/src/sync.ts`](../../packages/contracts/src/sync.ts).  
Licence grant DTOs: [`packages/contracts/src/license.ts`](../../packages/contracts/src/license.ts) · panel DTOs: [`licensing-platform.ts`](../../packages/contracts/src/licensing-platform.ts).

Related: [LOCAL-FIRST.md](LOCAL-FIRST.md) · [DESKTOP-REPOS.md](DESKTOP-REPOS.md) · [HCW-LICENSE-MANAGER.md](HCW-LICENSE-MANAGER.md) · [ROADMAP.md](ROADMAP.md).

---

## Roles

| Role | `ESTI_ROLE` | What it mounts |
| --- | --- | --- |
| **Hub** | `hub` | Licence authority REST, sync ingest/meta/WS, portals, SPA |
| **Node** | `node` (default) | Local DB + SPA; activates licence; drains outbox to hub |

Hub-only REST is a no-op when `ESTI_ROLE !== "hub"` (`registerLicenseRoutes` / `registerSyncRoutes`).

---

## Auth / session (workspace)

High level — firm staff SPA and desktop WebView use the **same** workspace session:

| Piece | Detail |
| --- | --- |
| Cookie | `esti_session` (opaque; SHA-256 hash stored server-side) |
| TTL | 8 hours (`backend/src/auth/session.ts`) |
| Login | tRPC `auth.login` (and related) sets the cookie; credentials include cookies on `/trpc` |
| Gate | `protectedProcedure` / `ownerProcedure` require a live cookie user |
| Licence recovery | Even when licence-blocked, `license.activate` / `license.refresh` / `auth.logout` stay allowed |

Machine routes (`/api/license/*`, `/api/sync/*`, `/platform/v1/*`) are **not** cookie-auth; they use bearer tokens / product API keys (see below). Distinct from platform admin cookie `hlp_session` under `/platform`.

---

## Licence

Two server paths; node picks one via env (see [Env](#env)).

### A — Hub role REST (`ESTI_ROLE=hub`)

Source: [`backend/src/modules/licensing/routes.ts`](../../backend/src/modules/licensing/routes.ts).

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| `POST` | `/api/license/activate` | `{ key, installId, fingerprint? }` | `LicenseGrant` — `licenseToken`, **`syncToken`**, `installId` |
| `POST` | `/api/license/refresh` | `{ installId, licenseToken }` | `{ licenseToken, installId }` (sync token **not** rotated) |

Auth: none (rate-limited). Errors: `400` / `429`.

Node consumer (when `ESTI_LICENSE_API_URL` is empty):  
[`backend/src/modules/license/consumer.ts`](../../backend/src/modules/license/consumer.ts) → `POST {ESTI_HUB_URL}/api/license/activate|refresh`, persists `licenseToken` **and** `syncToken` on `org_settings`.

### B — HCW License Manager (Product License API)

Mounted at `/platform` → [`backend/src/licensing-platform/routes/v1.ts`](../../backend/src/licensing-platform/routes/v1.ts).

| Method | Path | Auth | Body |
| --- | --- | --- | --- |
| `POST` | `/platform/v1/activate` | `Authorization: Bearer <ESTI_PRODUCT_API_KEY>` | `{ licenseKey, deviceId, fingerprint?, deviceName? }` |
| `POST` | `/platform/v1/refresh` | same | `{ token, deviceId }` |

Response: `{ licenseToken, syncToken?, entitlement }` (`ActivateResult`). Activate and
refresh mint a sync bearer, store `sha256(syncToken)` on `hlp_device`, and return
`syncToken` to the node (LF4 — 2026-08-06).

Node consumer when `ESTI_LICENSE_API_URL` is set: calls `{ESTI_LICENSE_API_URL}/v1/activate|refresh` and persists **`licenseToken`** and **`syncToken`** (when the panel returns one).

### C — Node tRPC (SPA / desktop UI)

Source: [`backend/src/modules/license/router.ts`](../../backend/src/modules/license/router.ts).

| Procedure | Access | Role |
| --- | --- | --- |
| `license.status` | authenticated | Effective `LicenseView` (no secrets) |
| `license.activate` | owner | `{ key }` → hub or panel per env |
| `license.refresh` | owner | Force refresh |

### `syncToken` (LF4)

- Hub activate grant includes **`syncToken`** — the install bearer for all sync REST/WS (`Authorization: Bearer …`, or WS query `?token=`).
- Outbox drain and meta pull read `org_settings.syncToken` ([`outbox.ts`](../../backend/src/lib/sync/outbox.ts) · [`metadata.ts`](../../backend/src/lib/sync/metadata.ts)).
- **Panel path:** `/platform/v1/activate|refresh` returns `syncToken`; node `license.activate` persists it. Hub `firmFromSyncToken` resolves legacy `esti_license_install` **and** `hlp_device.syncTokenHash` (firm namespace = platform `orgId`).
- First-run SPA: `DesktopLicenceBind` when `VITE_RUNTIME_HOST=desktop`.

---

## Sync

Hub REST/WS — [`backend/src/modules/sync/routes.ts`](../../backend/src/modules/sync/routes.ts).  
Auth: `Authorization: Bearer <syncToken>` (WS also accepts `?token=`).

| Method | Path | Body / query | Response |
| --- | --- | --- | --- |
| `POST` | `/api/sync/ingest` | `SyncIngestBody` | `{ remoteId }` |
| `POST` | `/api/sync/meta` | `MetaEventBody` | `{ event }` (`MetaEventRecord`) |
| `GET` | `/api/sync/meta/catch-up` | `stream`, `afterSeq`, `limit` | `MetaCatchUpResponse` |
| `GET` | `/api/sync/meta/ws` | WebSocket; client frames `subscribe` \| `ping` | `event` \| `catchup` \| `pong` \| `error` |

Contracts: `SyncIngestBody`, `MetaEventBody`, `MetaCatchUpQuery`, `MetaWsClientMessage` / `MetaWsServerMessage` in `packages/contracts`.

### Node tRPC

Source: [`backend/src/modules/sync/router.ts`](../../backend/src/modules/sync/router.ts).

| Procedure | Access | Role |
| --- | --- | --- |
| `sync.status` | auth | Outbox counts (`SyncStatusView`) |
| `sync.flush` | owner | Drain artifact + meta outbox to hub |
| `sync.enqueueMeta` | auth | Queue `MetaEventBody` (no-op if `metaSync` off) |
| `sync.pullMeta` | auth | Hub catch-up + LF3 domain apply + cursor advance |
| `sync.capabilities` | auth | `RuntimeCapabilities` (desktop free vs licensed) |
| `sync.hubConfigured` | auth | `{ hubUrl, wsUrl, hasSyncToken, role }` |

Empty `ESTI_HUB_URL` ⇒ offline-only node (no push/pull).

---

## Env

| Variable | Who | Purpose |
| --- | --- | --- |
| `ESTI_ROLE` | both | `node` \| `hub` |
| `ESTI_HUB_URL` | node | Hub base (e.g. `https://aorms.in`) — licence (legacy path) + sync |
| `ESTI_LICENSE_API_URL` | node | Panel base (e.g. `https://aorms.in/platform`); when set, activate/refresh use `/v1` |
| `INSTALL_ID` | node / desktop | Stable install id (else minted into `org_settings`) |
| `ESTI_DESKTOP` | node | Treat as packaged desktop for capability resolution |
| `ESTI_PRODUCT_API_KEY` | node | Bearer for `/platform/v1/*` (required with panel URL) |

Defined in [`backend/src/env.ts`](../../backend/src/env.ts). Desktop example: `desktop/env.desktop.example`.

---

## Client checklist (desktop node)

1. Set `ESTI_ROLE=node`, `ESTI_DESKTOP=true`, `STORAGE_DRIVER=fs`, mint/`INSTALL_ID`.
2. Point `ESTI_HUB_URL` at the hub; optionally `ESTI_LICENSE_API_URL` + product API key for License Manager.
3. Sign in (cookie session) → owner `license.activate` → confirm `sync.hubConfigured.hasSyncToken`.
4. `sync.flush` / drain tick pushes meta + artifacts; `sync.pullMeta` applies hub events.
5. Do not invent extra REST paths — extend `@esti/contracts` and bump this doc’s **API version** date when the wire format changes.
