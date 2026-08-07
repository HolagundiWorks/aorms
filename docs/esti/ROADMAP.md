# AORMS Implementation Roadmap

**Status:** ACTIVE (desktop-native pivot) · **Updated:** 2026-08-07  
**Docs queue:** [DOCUMENTATION-ROADMAP.md](DOCUMENTATION-ROADMAP.md)

Staff ERP = desktop apps forked from [AQC](https://github.com/HolagundiWorks/AQC).
`aorms.in` = marketing + demos. **Open source for now; SaaS licensing deferred.**

Canon: [LOCAL-FIRST.md](LOCAL-FIRST.md) · [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md).

---

## Now (execute next)

| # | Work | Where | Exit |
| --- | --- | --- | --- |
| 1 | AQC bridge docs | AQC | ✅ [PR #4](https://github.com/HolagundiWorks/AQC/pull/4) |
| 2 | `Aorms.Bridge` scaffold | AQC | ✅ [PR #5](https://github.com/HolagundiWorks/AQC/pull/5) merged |
| 3 | **D2 smoke** — activate → Flush with live `syncToken` | AQC ↔ esti hub | ✅ Smoke + colocated hub |
| 4 | **D5** — consume bridge in apps | AStudio · AConsulting | ✅ submodule + BridgeHost ProjectReference · 🚧 WinUI shell next |
| 5 | Portal section content | esti | ✅ client portal panels (Project · Progress · Drawings · Documents) |

---

## D-waves

| Wave | Outcome | Status |
| --- | --- | --- |
| **D0–D1** | Product law · PORTAL-SYNC-BRIDGE | ✅ |
| **D2** | AQC `Aorms.Bridge` | ✅ code + hub smoke |
| **D3** | Sibling repos | ✅ |
| **D4** | FirmPortalShell + marketing CTAs | ✅ |
| **D5** | Domain apps consume engine + bridge | 🚧 BridgeHost ✅ · WinUI shell next |
| **D6** | Signed installers · portal tenants | 🔲 |

---

## Platform apps

| App | Repo |
| --- | --- |
| **AStudio** | https://github.com/HolagundiWorks/AStudio |
| **AConsulting** | https://github.com/HolagundiWorks/AConsulting |
| **AQC** | https://github.com/HolagundiWorks/AQC · tag `aorms-bridge-d2` |

---

## Authoritative docs

| Doc | Purpose |
| --- | --- |
| [DOCUMENTATION-ROADMAP.md](DOCUMENTATION-ROADMAP.md) | Doc read order |
| [FIRM-PORTAL-SECTIONS.md](FIRM-PORTAL-SECTIONS.md) | Portal tab → hub map |
| [AQC-BRIDGE-SPIKE.md](AQC-BRIDGE-SPIKE.md) | D2 checklist |
| [LOCAL-FIRST.md](LOCAL-FIRST.md) · [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md) · [HUB-API.md](HUB-API.md) | Runtime + wire |
| [DESKTOP-REPOS.md](DESKTOP-REPOS.md) · [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md) | Repos · crew |

---

## Deferred

SaaS commercial SKUs · Stripe auto · W4 integrations · pure C++ UI rewrite.

## Change rule

Update this file + DOCUMENTATION-ROADMAP / PORTAL-SYNC-BRIDGE / sibling AGENTS when law moves.

