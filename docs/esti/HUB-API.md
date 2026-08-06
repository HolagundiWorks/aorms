# Hub API (sync + licence bind) — **2026-08**

> **Canonical wire contract** for desktop `ESTI_ROLE=node` ↔ cloud hub.  
> Implementation: `backend/src/modules/sync/*`, `backend/src/licensing-platform/routes/v1.ts`,  
> `backend/src/modules/license/consumer.ts`. Product law: [LOCAL-FIRST.md](LOCAL-FIRST.md).

**Version tag:** `2026-08` (matches `@esti/contracts` `0.1.0`).

Breaking changes to paths, auth, or required response fields **must** bump this
version tag, `@esti/contracts`, and the agent checklist in
[AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md) § Gagan in the same PR.

## Auth planes

| Plane | Header / query | Issues / stores |
| --- | --- | --- |
| **Product License API** | `Authorization: Bearer <ESTI_PRODUCT_API_KEY>` | `/platform/v1/*` on the hub |
| **Sync bearer** | `Authorization: Bearer <syncToken>` (WS may use `?token=`) | Issued at activate; hub stores `sha256` only |

| Env (node) | Role |
| --- | --- |
| `ESTI_LICENSE_API_URL` | Panel base, e.g. `https://aorms.in/platform` |
| `ESTI_PRODUCT_API_KEY` | Product API key for `/v1/*` |
| `ESTI_HUB_URL` | Sync origin, e.g. `https://aorms.in` (no `/platform` suffix) |
| `INSTALL_ID` | Stable device id (persisted as `org_settings.install_id`) |

`sync.hubConfigured` exposes `hubUrl`, `licenseApiUrl`, `hasSyncToken`, `syncReady`.

## Licence activate / refresh → sync bearer

### `POST /platform/v1/activate`

Body (`ActivateInput`): `{ licenseKey, deviceId, fingerprint?, deviceName? }`

Response (`ActivateResult`):

```json
{
  "licenseToken": "<signed entitlement>",
  "entitlement": { "...": "..." },
  "syncToken": "<opaque bearer — ALWAYS present on activate>"
}
```

Hub side:

1. Bind/refresh `hlp_device` for `(licenseId, deviceId)`.
2. Mint `syncToken`, store `sha256(syncToken)` on `hlp_device.sync_token_hash`.
3. Firm sync scope = `hlp_organization.sync_firm_id` (UUID) — requires migration
   **`0227_hlp_org_sync_firm.sql`** on the hub DB before bind.

Node side (`license.activate` → `activateViaPanel`):

- Persist `licenseToken` **and** `syncToken` on `esti_org_settings`.
- Without `syncToken`, meta/artifact flush cannot authenticate.
- Node rejects an activate response that omits `syncToken` (hub API 2026-08).

### `POST /platform/v1/refresh`

Body (`RefreshInput`): `{ token, deviceId }`

Response: `{ licenseToken, entitlement, syncToken? }`

- Does **not** rotate an existing sync bearer (node keeps its copy).
- If the device has no `sync_token_hash` (pre-2026-08 activation), mints once and
  returns `syncToken` so the node can catch up without re-entering the key.
- Node persists `syncToken` when present (`refreshNow`).

### Legacy hub path (still supported)

`POST {ESTI_HUB_URL}/api/license/activate` → `LicenseGrant` `{ licenseToken, syncToken, installId }`  
Hash on `esti_license_install.sync_token_hash` → firm id `esti_license.firm_id`.

## `firmFromSyncToken`

Hub sync routes resolve the bearer to a UUID firm id:

1. **Legacy:** `esti_license_install.sync_token_hash` → `esti_license.firm_id`
2. **Panel:** `hlp_device.sync_token_hash` + `status=ACTIVE` → `hlp_organization.sync_firm_id`

Used by `/api/sync/ingest`, `/api/sync/meta`, `/api/sync/meta/catch-up`, WS.

**Deploy:** panel path (2) needs `hlp_organization.sync_firm_id` from migration `0227`.
Without it, activate may still mint a bearer but hub ingest/meta resolve fails.

## Sync REST / WS (hub only, `ESTI_ROLE=hub`)

| Method | Path | Body / query |
| --- | --- | --- |
| `POST` | `/api/sync/ingest` | `SyncIngestBody` |
| `POST` | `/api/sync/meta` | `MetaEventBody` |
| `GET` | `/api/sync/meta/catch-up` | `stream`, `afterSeq`, `limit` |
| `GET` | `/api/sync/meta/ws` | `?token=` + subscribe frames |

## Node tRPC `sync.*` (`ESTI_ROLE=node`)

| Procedure | Behaviour |
| --- | --- |
| `status` | Artifact + meta outbox counts |
| `capabilities` | Desktop free vs licensed matrix; hub role returns web-parity+. Desktop `metaSync`/`artifactSync` require licence VALID/GRACE **and** hub URL **and** persisted `syncToken`. Non-desktop keeps `WEB_PARITY` `localAi`/`localWorker`=false ([`runtimeCapabilities.ts`](../../backend/src/lib/sync/runtimeCapabilities.ts)). |
| `flush` | Drains artifact + meta outboxes; returns `{ skipped }` when `not_node` / `hub_unconfigured` / `missing_sync_token` / `sync_disabled` |
| `enqueueMeta` | Queues one meta event (no-op if `metaSync` false) |
| `pullMeta` | Catch-up → **LF3 domain apply** (task / estimateTotals / phaseProgress) → advance cursor; empty with `skippedReason` when preconditions fail; `error: hub_unreachable` on hub down |
| `hubConfigured` | `{ hubUrl, licenseApiUrl, wsUrl, hasSyncToken, role, syncReady }` — `syncReady` = hub URL + syncToken + `ESTI_ROLE=node` |

Drain helpers (`drainOutbox` / `drainMetaOutbox` / `pullMetaCatchUp`) also no-op without
`ESTI_ROLE=node`, `ESTI_HUB_URL`, and `syncToken` — caps and flush skip reasons stay aligned.

## Morning bind checklist (Bhoomi)

0. **Hub deploy:** apply `backend/drizzle/0227_hlp_org_sync_firm.sql` (idempotent) before testing panel activate → sync
1. Node: `ESTI_HUB_URL` + `ESTI_LICENSE_API_URL` + `ESTI_PRODUCT_API_KEY` + `INSTALL_ID`
2. Owner runs `license.activate` with a live key
3. `sync.hubConfigured.syncReady === true` (`hasSyncToken` true, `role=node`)
4. `sync.capabilities.metaSync` / `artifactSync` === true
5. `sync.flush` / `sync.pullMeta` succeed against hub (no `skipped` / `skippedReason`)

**Owner:** Gagan lands the hub wire; Bhoomi runs the bind test after Vishwakarma merges.

## Related

- [LOCAL-FIRST.md](LOCAL-FIRST.md) · [DESKTOP-REPOS.md](DESKTOP-REPOS.md) · [HCW-LICENSE-MANAGER.md](HCW-LICENSE-MANAGER.md)  
- [MORNING-TEST-LF4.md](MORNING-TEST-LF4.md) — operator checklist including `0227`  
- Contracts: `packages/contracts` · consumer notes: `packages/contracts/README.md`  
- Crew: [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md)
