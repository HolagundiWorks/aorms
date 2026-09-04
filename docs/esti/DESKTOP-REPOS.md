# Desktop repos & contracts gate

> How the **AORMS desktop node** relates to this monorepo.  
> **Bhoomi** — packaging / signing · **Gagan** — hub/sync/contracts ·  
> **Aakash** — portal download UI · **Vishwakarma** merges.  
> See [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md).

## Decision (locked)

| Choice | Detail |
| --- | --- |
| **Single contracts package** | `@esti/contracts` in this monorepo — **do not** invent a second contracts repo |
| **Desktop shell in-tree** | `desktop/AStudio.Shell` (**WinUI 3** + WebView2) — Tauri under `src-tauri/` is **legacy** |
| **Same SPA** | Desktop loads `frontend/` against loopback backend |

## Gate checklist

| # | Item | Owner | Status |
| --- | --- | --- | --- |
| D1 | `@esti/contracts` versioned + consumer README (`0.1.0` / hub **2026-08**) | Gagan | ✅ |
| D2 | Hub sync bearer from panel activate/refresh (`syncToken` + `hlp_device`) | Gagan | ✅ |
| D3 | `firmFromSyncToken` legacy + `hlp_device` → `sync_firm_id` | Gagan | ✅ |
| D4 | Node `sync.*` documented for `ESTI_ROLE=node` ([HUB-API.md](HUB-API.md)); caps ↔ `syncToken` aligned | Gagan | ✅ (#53) |
| D5 | Signed **WinUI 3** installer + first-run licence bind (LF4) | Bhoomi | 🚧 #49 · Linux validate ✅ · Windows sign/bind 🔲 |
| D6 | Portal / marketing download manifests | Aakash | ✅ prep · live URL 🔲 |
| D7 | Code signing + update channel | Bhoomi | 🔲 |

## Portal → installer wiring

```text
Bhoomi (Local)                    Aakash (Portal)
──────────────                    ───────────────
signed WinUI publish ──url+sha256──►  VITE_*_INSTALLER_URL
                                  or update-manifests/*.json
                                  + VITE_PORTAL_USE_RELEASE_INSTALLERS=true
                                           │
                                           ▼
                                  aorms.in/downloads  (web_fallback until then)
```

| Gate | Owner | Status |
| --- | --- | --- |
| Signed binary URL published | Bhoomi | 🔲 |
| Manifest / env filled on hub deploy | Aakash | 🔲 (prep ✅ #46) |
| Empty `AStudio` / `AConsulting` GitHub shells | Optional · human | 🔲 — READMEs in [repo-scaffolds/](repo-scaffolds/) |

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
