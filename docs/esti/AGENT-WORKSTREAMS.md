# AORMS active delivery — named agent crew

**Status:** ACTIVE (D-waves) · **Date:** 2026-08-07  
**Parent:** [ROADMAP.md](ROADMAP.md) · docs: [DOCUMENTATION-ROADMAP.md](DOCUMENTATION-ROADMAP.md)

## Solo mode — desktop-native pivot

Prior esti SPA delivery is **closed** as product. **Open queue:** D5 sibling apps
consume `aorms-bridge-d2` → D6 ops. **Open source for now;** SaaS licensing deferred.

| Name | Role | Runtime | Owns now |
| --- | --- | --- | --- |
| **Bhoomi2** | Solo delivery | This Windows Cursor chat | ROADMAP Now · D5 consume pin · doc truth |
| **Vishwakarma** | CTO / orchestrator | Parked | Resume → merge queue |
| **Gagan** | Cloud hub / sync | Parked | Resume → hub contracts bumps |
| **Aakash** | Portal / GTM | Parked | Resume → other portal roles · downloads |
| **Bhoomi** | Cloud desktop | Parked | Optional AQC parallel |

### Now (from ROADMAP)

1. ✅ Merge [AQC#4](https://github.com/HolagundiWorks/AQC/pull/4) bridge docs  
2. ✅ Scaffold `Aorms.Bridge` + SQLite in AQC (D2 code)  
3. ✅ Smoke activate → Flush against hub (`aorms-bridge-d2`)  
4. 🚧 Pin/consume engine in AStudio / AConsulting (D5) — ENGINE-PIN + submodule next  

## Hard boundaries

| Rule | Why |
| --- | --- |
| **Do not** reimplement BBS/estimate in TypeScript | C++ `bbs_engine` is SoT |
| **Do not** invent SaaS commercial SKUs | Deferred — stay OSS |
| **Do not** invent sha256 / flip unsigned installers | Honesty |
| **Do not** edit `Projects.tsx` / `Clients.tsx` | Parallel WIP |
| Staff ERP stays out of `aorms.in` marketing apex | Product law |

## Sibling repos

| Repo | Role |
| --- | --- |
| [AQC](https://github.com/HolagundiWorks/AQC) | Engine + bridge · tag `aorms-bridge-d2` |
| [AStudio](https://github.com/HolagundiWorks/AStudio) | Architecture desktop OS |
| [AConsulting](https://github.com/HolagundiWorks/AConsulting) | Engineering desktop OS |
| esti / aorms | Hub · portals · marketing · contracts |

## Related

- [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md) · [AQC-BRIDGE-SPIKE.md](AQC-BRIDGE-SPIKE.md)  
- [DESKTOP-REPOS.md](DESKTOP-REPOS.md) · [LOCAL-FIRST.md](LOCAL-FIRST.md)  
