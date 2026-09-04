# Desktop repos & contracts gate

> How the **AORMS desktop node** relates to this monorepo.  
> **Bhoomi** — packaging / signing · **Gagan** — hub/sync/contracts ·  
> **Aakash** — portal download UI · **Vishwakarma** merges.  
> See [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md).

## Decision (locked)

| Choice | Detail |
| --- | --- |
| **Single contracts package** | `@esti/contracts` in this monorepo — **do not** invent a second contracts repo |
| **Desktop shell in-tree** | `desktop/` (Tauri stub + env + start scripts) |
| **Same SPA** | Desktop loads `frontend/` against loopback backend |

## Gate checklist

| # | Item | Owner | Status |
| --- | --- | --- | --- |
| D1 | `@esti/contracts` versioned + consumer README (`0.1.0` / hub **2026-08**) | Gagan | ✅ |
| D2 | Hub sync bearer from panel activate/refresh (`syncToken` + `hlp_device`) | Gagan | ✅ |
| D3 | `firmFromSyncToken` legacy + `hlp_device` → `sync_firm_id` | Gagan | ✅ |
| D4 | Node `sync.*` documented for `ESTI_ROLE=node` ([HUB-API.md](HUB-API.md)) | Gagan | ✅ |
| D5 | Signed Tauri installer + first-run licence bind (LF4) | Bhoomi | 🔲 |
| D6 | Portal / marketing download manifests | Aakash | 🔲 |
| D7 | Code signing + update channel | Bhoomi | 🔲 |

## Consuming contracts from a node client

Prefer the workspace dependency (desktop stays in this repo):

```json
{ "dependencies": { "@esti/contracts": "workspace:*" } }
```

Out-of-tree packing (exceptional):

```bash
pnpm --filter @esti/contracts build
pnpm --filter @esti/contracts pack
```

See [`packages/contracts/README.md`](../../packages/contracts/README.md).

## Related

- [LOCAL-FIRST.md](LOCAL-FIRST.md) · [HUB-API.md](HUB-API.md) · [ROADMAP.md](ROADMAP.md) § Local-first  
- [desktop/README.md](../../desktop/README.md)
