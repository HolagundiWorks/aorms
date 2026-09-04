# `@esti/contracts`

Shared Zod schemas, DTOs, and constants for **AORMS** (`esti` monorepo).

The Fastify backend and the React SPA consume this package — **there is no
second contracts repository**. (The `sync`/`license` DTOs below predate the
2026-09 web-only pivot, which removed the desktop/Tauri shell; the underlying
backend modules are still live, so these types remain in use, just with no
desktop client on the other end today.)

## Version

| Field | Value |
| --- | --- |
| Package | `@esti/contracts` |
| Semver | see `package.json` (`0.1.0` = hub API **2026-08** surface) |
| Hub sync + licence DTOs | `src/sync.ts` · `src/license.ts` · `src/licensing-platform.ts` |

Bump `package.json` version when shipping a breaking wire change; update
[`docs/esti/HUB-API.md`](../../docs/esti/HUB-API.md) in the same PR.

## Consume (monorepo)

```json
{
  "dependencies": {
    "@esti/contracts": "workspace:*"
  }
}
```

```ts
import {
  ActivateResult,
  MetaEventBody,
  SyncIngestBody,
  LICENSED_DESKTOP_CAPABILITIES,
} from "@esti/contracts";
```

For an out-of-tree consumer (rare):

```bash
pnpm --filter @esti/contracts build
# pack from packages/contracts (dist + package.json exports)
pnpm pack
```

## Exports of interest for sync/licence code

| Module area | Symbols |
| --- | --- |
| Sync planes | `SyncEntity`, `MetaEntity`, `SYNC_FIELD_MAP`, `MetaEventBody`, `SyncIngestBody` |
| Capabilities | `RuntimeCapabilities`, `FREE_DESKTOP_CAPABILITIES`, `LICENSED_DESKTOP_CAPABILITIES` |
| Licence (legacy hub) | `LicenseGrant`, `LicenseActivateInput` |
| Licence (panel `/platform/v1`) | `ActivateInput`, `ActivateResult` (**includes optional `syncToken`**), `RefreshInput` |

## Scripts

```bash
pnpm --filter @esti/contracts typecheck
pnpm --filter @esti/contracts test
pnpm --filter @esti/contracts build
```
