# AORMS local-first desktop + cloud hub

> **Status (2026-08):** Structure shipped — contracts, hub metadata event log + WS,
> artifact outbox/content-hash, portal-from-hub reads, desktop packaging stub,
> runtime capabilities, product-law update. Packaging a signed installer and
> domain-level metadata apply hooks land in follow-up waves.

## Decisions

| # | Choice |
| --- | --- |
| Firm sync | **Cloud hub** is the realtime authority — every desktop is a peer under AORMS cloud (no LAN firm-server required) |
| Online surface | **Full web parity** long-term — same SPA on desktop (preferred/offline) and browser (degraded local AI/worker) |

## Three planes

| Plane | Moves | Transport |
| --- | --- | --- |
| **Work / localOnly** | Drafts, BOQ lines, measurements, AI chats | Stay on the node until promote |
| **Metadata** | Tasks, status, cost scalars, progress % | Hub `esti_meta_event` log + WS `/api/sync/meta/ws` |
| **Artifacts** | Issued PDFs, READY drawings, etc. | `esti_sync_outbox` → `POST /api/sync/ingest` |

Classification + field maps: [`packages/contracts/src/sync.ts`](../../packages/contracts/src/sync.ts).

## Runtimes

```
Desktop node (ESTI_ROLE=node, ESTI_DESKTOP=true, STORAGE_DRIVER=fs)
  └─ local Postgres · worker · Ollama · EOMS · SPA@loopback
Cloud hub (ESTI_ROLE=hub)
  └─ metadata log · published artifacts · portals · staff web SPA
```

Desktop packaging stub: [`desktop/`](../../desktop/). Env template: `desktop/env.desktop.example`.

## Licence scope

| Mode | Local AI / worker | Metadata sync | Artifact push |
| --- | --- | --- | --- |
| **Free desktop** (no hub bind / inactive licence) | Yes | No | No |
| **Licensed desktop** (ACTIVE + `ESTI_HUB_URL` + syncToken) | Yes | Yes | Yes |
| **Web parity** (browser → hub) | Hub / BYO | Yes | Yes (server-side) |

Resolved at runtime by `trpc.sync.capabilities` / [`frontend/src/lib/runtimeCapabilities.ts`](../../frontend/src/lib/runtimeCapabilities.ts).

## Key APIs

| Endpoint / procedure | Role |
| --- | --- |
| `POST /api/sync/ingest` | Hub — artifact upsert (+ content-hash skip) |
| `POST /api/sync/meta` | Hub — append metadata event |
| `GET /api/sync/meta/catch-up` | Hub — seq catch-up |
| `GET /api/sync/meta/ws` | Hub — live push (`?token=`) |
| `trpc.sync.status` / `flush` / `enqueueMeta` / `pullMeta` / `capabilities` | Node office controls |

## Conflict policy

- Task/status-like fields: **LWW per field** (`updatedAt` + actor)
- Derived money / progress scalars: **server seq wins** (`conflict: "serverSeq"`)

## What must not sync

- AI transcripts / model weights
- Measurement scratch / nested estimate lines (until finalize)
- Draft drawings and unissued PDFs

## Related

- [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) — desktop SKU restored
- [AORMS-IDENTITY.md](AORMS-IDENTITY.md) §10 — offline grace + desktop session cache
- Phase B outbox: `backend/src/lib/sync/outbox.ts`, `backend/src/modules/sync/`
