# AORMS documentation roadmap

**Status:** ACTIVE · **Updated:** 2026-08-07  
**Parent delivery:** [ROADMAP.md](ROADMAP.md) (D-waves)  
**Licensing:** Open source for now — SaaS commercial terms deferred.

This is the **doc delivery queue** for the desktop-native pivot: what agents and
humans read first, what is done, and what still needs writing or syncing into
sibling repos.

---

## Read order (new agent / contributor)

1. [ROADMAP.md](ROADMAP.md) — D-wave status · **Now** queue  
2. [LOCAL-FIRST.md](LOCAL-FIRST.md) — runtime law (desktop-only staff)  
3. [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md) — SQLite + `aorms_bridge`  
4. [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md) — marketing vs portal vs admin  
5. [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) — licence (OSS)  
6. [DESKTOP-REPOS.md](DESKTOP-REPOS.md) — AQC · AStudio · AConsulting  
7. Sibling [AGENTS.md](https://github.com/HolagundiWorks/AStudio/blob/main/AGENTS.md) (or AConsulting)  
8. [HUB-API.md](HUB-API.md) — activate → `syncToken` wire details  

Historical / reference only: UNIFIED-ARCHITECTURE-V4 · NAVIGATION · APROC-ARCHITECTURE · DESKTOP-WEB-PARITY-UX · esti staff SPA.

---

## Doc waves

| Wave | Outcome | Status |
| --- | --- | --- |
| **Doc-0** | Product law rewrite (LOCAL-FIRST · SURFACE · PLANS · ROADMAP · nomenclature) | ✅ |
| **Doc-1** | PORTAL-SYNC-BRIDGE + AQC-BRIDGE-SPIKE + HUB-API cross-links | ✅ |
| **Doc-2** | Sibling agent packs (AStudio · AConsulting) pushed to GitHub | ✅ |
| **Doc-3** | AQC `docs/AORMS-BRIDGE*.md` (PR) | ✅ [AQC#4](https://github.com/HolagundiWorks/AQC/pull/4) |
| **Doc-4** | This file + ROADMAP **Now** queue + AGENT-WORKSTREAMS reopen | ✅ |
| **Doc-5** | Sync sibling ROADMAP/SYNC-CONTRACT when bridge API freezes | 🔲 after D2 smoke |
| **Doc-6** | Portal UX brief (firm shell IA → section content map) | 🔲 with D4 follow-on |
| **Doc-7** | Downloads / installer honesty (WEB-PORTAL) for three apps | 🔲 with D6 |

---

## Canonical map (keep in sync)

| Concern | Canon doc | Also update |
| --- | --- | --- |
| Delivery status | [ROADMAP.md](ROADMAP.md) | This file · AGENT-WORKSTREAMS · canvas |
| Runtime / planes | [LOCAL-FIRST.md](LOCAL-FIRST.md) | PORTAL-SYNC-BRIDGE · contracts `sync.ts` |
| Hub wire | [HUB-API.md](HUB-API.md) | PORTAL-SYNC-BRIDGE · sibling SYNC-CONTRACT |
| Hosts / CTAs | [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md) | `aorms-surface-urls.ts` · Landing |
| Naming | [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md) | `product-nomenclature.ts` |
| Bridge spike | [AQC-BRIDGE-SPIKE.md](AQC-BRIDGE-SPIKE.md) | AQC `docs/AORMS-BRIDGE-SPIKE.md` |
| Crew | [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md) | ROADMAP Now |

---

## Sibling repos (agent docs)

| Repo | Docs home |
| --- | --- |
| [AStudio](https://github.com/HolagundiWorks/AStudio) | README · AGENTS · docs/* |
| [AConsulting](https://github.com/HolagundiWorks/AConsulting) | same shape |
| [AQC](https://github.com/HolagundiWorks/AQC) | `docs/AORMS-BRIDGE.md` · engine README |

esti [repo-scaffolds/](repo-scaffolds/) is the **source template**; push updates to siblings when law changes.

---

## Explicit non-docs

- SaaS commercial / dual-licence SKU prose — **deferred**  
- Re-documenting WebView2 LF4 as the shipping path — historical only  
