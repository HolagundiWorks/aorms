# `@esti/contracts`

Shared Zod schemas, DTOs, and constants for **AORMS** (`esti` monorepo).

Desktop node clients, the Fastify backend, and the React SPA all consume this
package — **there is no second contracts repository**. Node/Tauri shells must
depend on this workspace package (or a version published from it).

## Version

| Field | Value |
| --- | --- |
| Package | `@esti/contracts` |
| Semver | see `package.json` (`0.1.0` = hub API **2026-08** surface) |
| Hub sync + licence DTOs | `src/sync.ts` · `src/license.ts` · `src/licensing-platform.ts` |

Bump `package.json` version when shipping a breaking wire change; update
[`docs/esti/HUB-API.md`](../../docs/esti/HUB-API.md) in the same PR.

## Consume (monorepo / desktop)

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

Prefer keeping the desktop shell inside this monorepo (`desktop/`) so the
workspace link stays the source of truth ([DESKTOP-REPOS.md](../../docs/esti/DESKTOP-REPOS.md)).

## Exports of interest for node clients

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
