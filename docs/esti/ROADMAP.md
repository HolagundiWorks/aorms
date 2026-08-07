# AORMS Implementation Roadmap

**Status:** ACTIVE (suite architecture) · **Updated:** 2026-08-07  
**Canon:** [AORMS-SUITE.md](AORMS-SUITE.md) · [LOCAL-FIRST.md](LOCAL-FIRST.md)

Open source for now; SaaS licensing deferred.

---

## Now (suite waves)

| # | Work | Where | Exit |
| --- | --- | --- | --- |
| S0 | Suite canon docs | esti | ✅ [AORMS-SUITE.md](AORMS-SUITE.md) |
| S1 | Mongo ops spike + portal read | esti hub | ✅ [MONGO-OPS.md](MONGO-OPS.md) · `mongoOps` · compose `mongo` |
| S2 | Shilpi wire + portal drawing packages | esti · portals | ✅ [SHILPI-WIRE.md](SHILPI-WIRE.md) · package refs on Drawings tab |
| S3 | AQC three-app packaging | AQC | ✅ Estimation · BBS · PM shells · [SUITE-PACKAGING](https://github.com/HolagundiWorks/AQC/blob/main/docs/SUITE-PACKAGING.md) |
| S4 | Manager Tasks module | AStudio · AConsulting | ✅ local tasks + `PublishOpsTaskAsync` |
| S5 | Online ops DB manager | esti | ✅ `/ops-db` (firm:admin) |

---

## D-waves (complete baseline)

| Wave | Outcome | Status |
| --- | --- | --- |
| **D0–D5** | Bridge · siblings · WinUI shells · portal panels | ✅ |
| **D6** | Signed installers · portal tenants | 🔲 |

---

## Platform apps

| App | Role |
| --- | --- |
| **AStudio** / **AConsulting** | Practice managers |
| **AQC Estimation / BBS / PM** | Three installers · shared engine |
| **AADT** · **ShilpiDB** | Drafting · geometry |
| **Portals + `/ops-db`** | Online communications · Mongo browse |

## Deferred

SaaS SKUs · Stripe · dual Postgres/Mongo forever · MSIX signing · full WinUI domain split from BBSApp.
