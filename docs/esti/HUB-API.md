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
3. Firm sync scope = `hlp_organization.sync_firm_id` (UUID).

Node side (`license.activate` → `activateViaPanel`):

- Persist `licenseToken` **and** `syncToken` on `esti_org_settings`.
- Without `syncToken`, meta/artifact flush cannot authenticate.

### `POST /platform/v1/refresh`

Body (`RefreshInput`): `{ token, deviceId }`

Response: `{ licenseToken, entitlement, syncToken? }`

- Does **not** rotate an existing sync bearer (node keeps its copy).
- If the device has no `sync_token_hash` (pre-2026-08 activation), mints once and
  returns `syncToken` so the node can catch up without re-entering the key.

### Legacy hub path (still supported)

`POST {ESTI_HUB_URL}/api/license/activate` → `LicenseGrant` `{ licenseToken, syncToken, installId }`  
Hash on `esti_license_install.sync_token_hash` → firm id `esti_license.firm_id`.

## `firmFromSyncToken`

Hub sync routes resolve the bearer to a UUID firm id:

1. **Legacy:** `esti_license_install.sync_token_hash` → `esti_license.firm_id`
2. **Panel:** `hlp_device.sync_token_hash` + `status=ACTIVE` → `hlp_organization.sync_firm_id`

Used by `/api/sync/ingest`, `/api/sync/meta`, `/api/sync/meta/catch-up`, WS.

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
| `capabilities` | Desktop free vs licensed matrix; hub role returns web-parity+ |
| `flush` | Drains artifact + meta outboxes; skips when sync capabilities off |
| `enqueueMeta` | Queues one meta event (no-op if `metaSync` false) |
| `pullMeta` | Catch-up → **LF3 domain apply** (task / estimateTotals / phaseProgress) → advance cursor; empty on hub down |
| `hubConfigured` | `{ hubUrl, licenseApiUrl, wsUrl, hasSyncToken, role, syncReady }` |

## Morning bind checklist (Bhoomi)

1. Node: `ESTI_HUB_URL` + `ESTI_LICENSE_API_URL` + `ESTI_PRODUCT_API_KEY` + `INSTALL_ID`
2. Owner runs `license.activate` with a live key
3. `sync.hubConfigured.syncReady === true`
4. `sync.flush` / `sync.pullMeta` succeed against hub

**Owner:** Gagan lands the hub wire; Bhoomi runs the bind test after Vishwakarma merges.

## Related

- [LOCAL-FIRST.md](LOCAL-FIRST.md) · [DESKTOP-REPOS.md](DESKTOP-REPOS.md) · [HCW-LICENSE-MANAGER.md](HCW-LICENSE-MANAGER.md)  
- Contracts: `packages/contracts` · consumer notes: `packages/contracts/README.md`  
- Crew: [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md)
