# Desktop sibling repos + suite packaging

**Status:** Canonical · **Updated:** 2026-08-08 (suite branding + per-app repos)  
**Product law:** [AORMS-SUITE.md](AORMS-SUITE.md) · [LOCAL-FIRST.md](LOCAL-FIRST.md)

## Decision (locked)

| Choice | Detail |
| --- | --- |
| **Practice managers** | [AStudio](https://github.com/HolagundiWorks/AStudio) · [AConsulting](https://github.com/HolagundiWorks/AConsulting) |
| **Technical apps** | [AQC-Estimation](https://github.com/HolagundiWorks/AQC-Estimation) · [AQC-BBS](https://github.com/HolagundiWorks/AQC-BBS) · [AQC-PM](https://github.com/HolagundiWorks/AQC-PM) — three installers; engine SoT in [AQC](https://github.com/HolagundiWorks/AQC) (`bbs_engine`) |
| **Drafting / geometry** | [AADT](https://github.com/HolagundiWorks/AADT) · [shilpidb](https://github.com/HolagundiWorks/shilpidb) |
| **Ops cloud** | MongoDB via esti hub |
| **Stack (WinUI)** | C# WinUI 3 + C++ `bbs_engine` where calc applies |
| **Open source** | Keep OSS for now |

## Repos

| Repo | Role |
| --- | --- |
| `HolagundiWorks/AQC` | Engine SoT (`bbs_engine`, `Aorms.Bridge`) + reference `BBSApp` |
| `HolagundiWorks/AQC-Estimation` | Estimation installer shell (publishes to portals) |
| `HolagundiWorks/AQC-BBS` | BBS installer shell |
| `HolagundiWorks/AQC-PM` | Project Management / AProc installer shell |
| `HolagundiWorks/AStudio` | Architecture practice manager |
| `HolagundiWorks/AConsulting` | Engineering practice manager |
| `HolagundiWorks/AADT` | 2D drafting |
| `HolagundiWorks/shilpidb` | Geometry store + `shilpi-http` |
| `HolagundiWorks/aorms` (esti) | Hub · portals · marketing · Mongo ops · contracts |

## Packaging policy

1. Pin `bbs_engine` + `Aorms.Bridge` from **AQC** (submodule / tag).  
2. Three AQC MSIX identities — do not fork divergent engines.  
3. Managers do **not** absorb Estimation/BBS UI.  
4. Drawings flow through ShilpiDB; ops through Mongo.  
5. Public download CTAs stay Coming soon / `web_fallback` until signed URL + sha256 (`frontend/public/update-manifests/`). Soft launch: [ROADMAP.md](ROADMAP.md) S6–S7 · D6.

## S9 exit (AQC product repos)

| Check | Done when | Status |
| --- | --- | --- |
| Distinct package identity | Estimation · BBS · PM each have `ApplicationId` | ✅ `in.aorms.aqc.{estimation,bbs,pm}` |
| Engine pin | Submodule → `HolagundiWorks/AQC` (Bridge; no fork) | ✅ |
| Unpackaged WinUI shell | Activate / Flush hub host per repo | ✅ |
| MSIX Package.appxmanifest | Per-app identity · `build-msix.cmd` | ✅ unsigned |
| Code-signed publish | Store / sideload URL + sha256 | 🔲 D6 |
| Manifest stubs | Matching `update-manifests/aqc-*.json` in aorms hub | ✅ prep |
| Honesty | No public Download CTA until D6 signed URL + sha256 | ✅ |

## Related

- [AORMS-SUITE.md](AORMS-SUITE.md) · [SHILPI-WIRE.md](SHILPI-WIRE.md) · [MONGO-OPS.md](MONGO-OPS.md)  
- [ROADMAP.md](ROADMAP.md) · [WEB-PORTAL.md](WEB-PORTAL.md)  
