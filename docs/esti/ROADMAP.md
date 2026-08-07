# AORMS Implementation Roadmap

**Status:** ACTIVE (desktop-native pivot) · **Updated:** 2026-08-07  
**Prior platform build:** COMPLETE (P0–P10 · market-fit W1–W3 · AProc W0–W5 · LF0–LF6 · UI 1–8)  
**New delivery:** **D-waves** — native desktop SaaS + firm portals  

Staff ERP moves to **desktop apps forked from [AQC](https://github.com/HolagundiWorks/AQC)**.
`aorms.in` = marketing + demos. Cloud = hub sync + firm portals + License Manager.
**Open source for now; SaaS commercial licensing deferred.**

Canon runtime: [LOCAL-FIRST.md](LOCAL-FIRST.md) · Bridge: [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md).

---

## Now — D-waves (desktop-native SaaS)

| Wave | Where | Outcome | Status |
| --- | --- | --- | --- |
| **D0** | esti docs | Product law: desktop-only staff · marketing apex · AQC fork | ✅ |
| **D1** | esti | [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md) connector + allow-list | ✅ |
| **D2** | AQC repo | SQLite + `aorms_bridge` spike docs ([PR #4](https://github.com/HolagundiWorks/AQC/pull/4)) | ✅ docs · 🔲 code |
| **D3** | GitHub | `AStudio` + `AConsulting` repos + agent docs | ✅ |
| **D4** | esti frontend | Fresh firm portal shell + marketing login demotion | ✅ |
| **D5** | sibling apps | Domain specialization · local AI · publish path | 🔲 |
| **D6** | Ops | Signed installers · portal tenants · licence (OSS until SaaS terms) | 🔲 |

---

## Completion summary (prior eras)

| Track | Status |
| --- | --- |
| Product pivot P0–P10 · P9 Consultancy | ✅ |
| Market fit W1–W3 | ✅ · W4 deferred |
| AProc W0–W5 (esti preview) | ✅ → **product continues as AQC** |
| Local-first LF0–LF6 (WebView2 era) | ✅ historical |
| UI Waves 1–8 | ✅ |
| Desktop-native D0–D6 | 🚧 in progress |

---

## Platform apps

| App | Status |
| --- | --- |
| **AStudio** | **Desktop** (fork AQC) — `studio.aorms.in` marketing only |
| **AConsulting** | **Desktop** (fork AQC) — `consultancy.aorms.in` marketing only |
| **AQC (= AProc)** | **Desktop** — [HolagundiWorks/AQC](https://github.com/HolagundiWorks/AQC); `proc.aorms.in` marketing |

esti monorepo SPA = **reference** + hub/portal/marketing code.

---

## Authoritative docs

| Doc | Purpose |
| --- | --- |
| [LOCAL-FIRST.md](LOCAL-FIRST.md) | Runtime law (desktop-native) |
| [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md) | DB connector + publish allow-list |
| [HUB-API.md](HUB-API.md) | activate → syncToken · sync REST/WS |
| [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md) | Host / path map |
| [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) | Licence law (OSS now) |
| [DESKTOP-REPOS.md](DESKTOP-REPOS.md) | Sibling repos |
| [repo-scaffolds/](repo-scaffolds/) | Agent docs for AStudio / AConsulting |
| [APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md) | Historical AProc waves (esti); product = AQC |

---

## Deferred (by choice)

1. **SaaS commercial licensing / dual-licence SKUs** — stay open source for now  
2. **Stripe auto-billing** — manual India path  
3. **Market-fit W4 integrations** — phase 2  
4. **Pure C++ UI rewrite** — keep WinUI + C++ engine like AQC  

---

## Change rule

Material feature changes update **this file** plus LOCAL-FIRST / SURFACE-URLS /
PORTAL-SYNC-BRIDGE / PLANS / sibling AGENTS.md as needed in the same PR.
