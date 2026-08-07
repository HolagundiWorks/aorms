# AORMS Implementation Roadmap

**Status:** ACTIVE (desktop-native pivot) · **Updated:** 2026-08-07  
**Prior platform build:** COMPLETE (P0–P10 · market-fit W1–W3 · AProc W0–W5 · LF0–LF6 · UI 1–8)  
**New delivery:** **D-waves** — native desktop + firm portals  
**Docs queue:** [DOCUMENTATION-ROADMAP.md](DOCUMENTATION-ROADMAP.md)

Staff ERP = **desktop apps forked from [AQC](https://github.com/HolagundiWorks/AQC)**.
`aorms.in` = marketing + demos. Cloud = hub sync + firm portals + License Manager.
**Open source for now; SaaS commercial licensing deferred.**

Canon: [LOCAL-FIRST.md](LOCAL-FIRST.md) · [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md).

---

## Now (execute next)

| # | Work | Where | Exit |
| --- | --- | --- | --- |
| 1 | **Merge AQC bridge docs** [PR #4](https://github.com/HolagundiWorks/AQC/pull/4) | AQC | ✅ merged |
| 2 | **D2 code — `Aorms.Bridge` scaffold** | AQC | 🚧 [PR #5](https://github.com/HolagundiWorks/AQC/pull/5) — FirmDb + Activate/Flush |
| 3 | **D2 smoke** | AQC ↔ esti hub | activate → `syncToken` → Flush meta |
| 4 | **D5 kickoff** | AStudio / AConsulting | Pin AQC engine + bridge |
| 5 | **Portal sections** | esti | Map FirmPortalShell tabs to hub content |

Crew: [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md).

---

## D-waves (desktop-native)

| Wave | Where | Outcome | Status |
| --- | --- | --- | --- |
| **D0** | esti docs | Product law: desktop-only staff · marketing apex · AQC fork | ✅ |
| **D1** | esti | [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md) connector + allow-list | ✅ |
| **D2** | AQC | Bridge docs ✅ · **code** SQLite + `aorms_bridge` | 🚧 **in progress** |
| **D3** | GitHub | [AStudio](https://github.com/HolagundiWorks/AStudio) · [AConsulting](https://github.com/HolagundiWorks/AConsulting) | ✅ |
| **D4** | esti frontend | `FirmPortalShell` + marketing CTA demotion | ✅ |
| **D5** | sibling apps | Domain specialization · local AI · publish path | 🔲 |
| **D6** | Ops | Signed installers · portal tenants (OSS until SaaS terms) | 🔲 |

---

## Completion summary (prior eras)

| Track | Status |
| --- | --- |
| Product pivot P0–P10 · P9 Consultancy | ✅ |
| Market fit W1–W3 | ✅ · W4 deferred |
| AProc W0–W5 (esti preview) | ✅ → **product continues as AQC** |
| Local-first LF0–LF6 (WebView2 era) | ✅ historical |
| UI Waves 1–8 | ✅ |
| Desktop-native D0–D6 | 🚧 D2 code next |

---

## Platform apps

| App | Status |
| --- | --- |
| **AStudio** | **Desktop** (fork AQC) — [repo](https://github.com/HolagundiWorks/AStudio) · `studio.aorms.in` marketing |
| **AConsulting** | **Desktop** (fork AQC) — [repo](https://github.com/HolagundiWorks/AConsulting) · `consultancy.aorms.in` marketing |
| **AQC (= AProc)** | **Desktop** — [AQC](https://github.com/HolagundiWorks/AQC) · `proc.aorms.in` marketing |

esti monorepo SPA = **reference** + hub/portal/marketing code.

---

## Authoritative docs

| Doc | Purpose |
| --- | --- |
| [DOCUMENTATION-ROADMAP.md](DOCUMENTATION-ROADMAP.md) | Doc delivery queue · read order |
| [LOCAL-FIRST.md](LOCAL-FIRST.md) | Runtime law |
| [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md) | DB connector + allow-list |
| [AQC-BRIDGE-SPIKE.md](AQC-BRIDGE-SPIKE.md) | D2 checklist |
| [HUB-API.md](HUB-API.md) | activate → syncToken |
| [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md) | Host / path map |
| [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) | Licence (OSS) |
| [DESKTOP-REPOS.md](DESKTOP-REPOS.md) | Sibling repos |
| [repo-scaffolds/](repo-scaffolds/) | Agent doc templates |
| [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md) | Crew · Now ownership |

---

## Deferred (by choice)

1. **SaaS commercial licensing / dual-licence SKUs** — stay open source for now  
2. **Stripe auto-billing** — manual India path  
3. **Market-fit W4 integrations** — phase 2  
4. **Pure C++ UI rewrite** — keep WinUI + C++ engine like AQC  

---

## Change rule

Material feature changes update **this file** plus LOCAL-FIRST / SURFACE-URLS /
PORTAL-SYNC-BRIDGE / DOCUMENTATION-ROADMAP / sibling AGENTS.md as needed in the
same PR.
