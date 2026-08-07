# Desktop sibling repos + suite packaging

**Status:** Canonical · **Updated:** 2026-08-07 (suite architecture)  
**Product law:** [AORMS-SUITE.md](AORMS-SUITE.md) · [LOCAL-FIRST.md](LOCAL-FIRST.md)

## Decision (locked)

| Choice | Detail |
| --- | --- |
| **Practice managers** | [AStudio](https://github.com/HolagundiWorks/AStudio) · [AConsulting](https://github.com/HolagundiWorks/AConsulting) |
| **Technical apps** | AQC **Estimation** · **BBS** · **PM** — three installers, shared `bbs_engine` |
| **Drafting / geometry** | [AADT](https://github.com/HolagundiWorks/AADT) · [shilpidb](https://github.com/HolagundiWorks/shilpidb) |
| **Ops cloud** | MongoDB via esti hub |
| **Stack (WinUI)** | C# WinUI 3 + C++ `bbs_engine` where calc applies |
| **Open source** | Keep OSS for now |

## Repos

| Repo | Role |
| --- | --- |
| `HolagundiWorks/AQC` | Engine SoT + three technical app projects |
| `HolagundiWorks/AStudio` | Architecture practice manager |
| `HolagundiWorks/AConsulting` | Engineering practice manager |
| `HolagundiWorks/AADT` | 2D drafting |
| `HolagundiWorks/shilpidb` | Geometry store + `shilpi-http` |
| `HolagundiWorks/esti` (aorms) | Hub · portals · marketing · Mongo ops · contracts |

## Packaging policy

1. Pin `bbs_engine` + `Aorms.Bridge` (submodule / tag `aorms-bridge-d2`).  
2. Three AQC MSIX identities — do not fork divergent engines.  
3. Managers do **not** absorb Estimation/BBS UI.  
4. Drawings flow through ShilpiDB; ops through Mongo.

## Related

- [AORMS-SUITE.md](AORMS-SUITE.md) · [SHILPI-WIRE.md](SHILPI-WIRE.md) · [MONGO-OPS.md](MONGO-OPS.md)  
- [ROADMAP.md](ROADMAP.md)  
