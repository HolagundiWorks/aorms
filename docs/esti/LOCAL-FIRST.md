# AORMS local-first suite + cloud hub

> **Canonical runtime law** · **Updated:** 2026-08-07 (suite architecture)  
> Suite: [AORMS-SUITE.md](AORMS-SUITE.md) · Wire: [HUB-API.md](HUB-API.md) ·  
> Bridge: [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md) · Repos: [DESKTOP-REPOS.md](DESKTOP-REPOS.md)

**AORMS is a product suite.** Practice managers (**AStudio** / **AConsulting**) and
technical apps (**AQC Estimation** · **AQC BBS** · **AQC Project Management**) ship
as native Windows apps. **AADT** drafts locally; **ShilpiDB** holds geometry;
**MongoDB** holds all non-drawing cloud ops/comms. Technical work and AI stay on
the machine. Firm-branded **portals** + ops DB manager live online.
`aorms.in` is **marketing + demos only** — no firm ERP logins on the apex.

The esti monorepo staff SPA is a **reference archive** — not the shipping staff UI.

**Licensing:** open source for now; SaaS commercial licensing deferred.

## Decisions (locked)

| # | Choice |
| --- | --- |
| Suite shape | Managers + three AQC installers + AADT + ShilpiDB ([AORMS-SUITE.md](AORMS-SUITE.md)) |
| Staff runtime | **Native desktop** — no browser staff ERP |
| Engine SoT | **C++** `bbs_engine` — shared by Estimation / BBS / PM |
| Ops cloud | **MongoDB** (firm-scoped) — not CAD entities |
| Drawings | **ShilpiDB** — not Mongo |
| Firm sync | Hub APIs + `syncToken`; portals read published data only |
| Design system (web) | **`@hcw/ui-kit`** on marketing + portals |
| Open source | Keep OSS for now |

## Planes

| Plane | Lives where | Examples |
| --- | --- | --- |
| **Work / localOnly** | Desktop SQLite | Drafts, BOQ lines, AI chats |
| **Calculations** | C++ engine on desktop | BBS, quantities — never recomputed in cloud |
| **Geometry** | ShilpiDB local / hosted | Entities, spatial queries, `.vdb` |
| **Ops metadata** | MongoDB via hub | Tasks, status, progress %, portal threads |
| **Artifacts** | Object store + Mongo pointers | Issued PDFs, READY drawing packages |

```mermaid
flowchart LR
  subgraph desktop [Desktop_suite]
    Work[localOnly_work]
    Engine[cpp_bbs_engine]
    Shilpi[ShilpiDB]
    MetaQ[ops_outbox]
  end
  subgraph hub [Cloud_hub]
    Mongo[(MongoDB_ops)]
    ArtStore[object_store]
    Portals[firm_portals]
  end
  Engine --> Work
  Shilpi --> Work
  MetaQ -->|hub_APIs| Mongo
  MetaQ --> ArtStore
  Mongo --> Portals
  ArtStore --> Portals
```

## Runtimes

| Runtime | Role |
| --- | --- |
| **AStudio / AConsulting** | Practice managers — Tasks · Office · HR · Payroll · comms |
| **AQC Estimation / BBS / PM** | Technical apps — shared `bbs_engine` |
| **AADT** | 2D drafting |
| **ShilpiDB** | Geometry spine (+ desktop manager) |
| **Cloud hub** | Licence · Mongo ops · artifacts · portals · ops DB manager |
| **`aorms.in`** | Marketing · demos · downloads |
| **esti staff SPA** | Reference only |

## Licence / sync scope

| Mode | Local AI / calc | Ops sync | Artifact push |
| --- | --- | --- | --- |
| Unbound desktop | Yes | No | No |
| Licensed + `syncToken` | Yes | Yes → Mongo | Yes |
| Firm portal | N/A | Read Mongo | Read published |

## Sibling repos

| Repo | Product |
| --- | --- |
| [AQC](https://github.com/HolagundiWorks/AQC) | Engine + three technical app packaging |
| [AStudio](https://github.com/HolagundiWorks/AStudio) | Architecture practice manager |
| [AConsulting](https://github.com/HolagundiWorks/AConsulting) | Engineering practice manager |
| [AADT](https://github.com/HolagundiWorks/AADT) | 2D drafting |
| [shilpidb](https://github.com/HolagundiWorks/shilpidb) | Geometry store |
| esti / aorms | Hub · portals · marketing · contracts |

## Related

- [AORMS-SUITE.md](AORMS-SUITE.md) · [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md) · [HUB-API.md](HUB-API.md)  
- [DESKTOP-REPOS.md](DESKTOP-REPOS.md) · [ROADMAP.md](ROADMAP.md) · [MONGO-OPS.md](MONGO-OPS.md)  
