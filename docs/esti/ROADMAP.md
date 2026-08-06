# AORMS Implementation Roadmap

**Status:** ACTIVE · **Updated:** 2026-08-06  
**Platform build:** COMPLETE (P0–P10 · P9.V · P9.M)  
**Market-fit waves:** COMPLETE (W1–W3) · **W4 integrations deferred** — see [MARKET-FIT.md](MARKET-FIT.md)  
**AQC web spine:** COMPLETE (W0–W5) — see [APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md) (brand **AQC**)  
**Web Portal waves:** WP0–WP4 ✅ — see [WEB-PORTAL.md](WEB-PORTAL.md)  
**Local-first waves:** LF0–LF2 ✅ · LF3 ✅ · LF4 code-ready (signed exe morning) · LF5–LF6 partial — see [LOCAL-FIRST.md](LOCAL-FIRST.md)  
**Hub API contract:** [HUB-API.md](HUB-API.md) (`2026-08`) — DESKTOP-REPOS gate item ✅  
**Repo extraction:** Gated after LF4 + WP1 — see [DESKTOP-REPOS.md](DESKTOP-REPOS.md)

Phases 0–28 are **engineering-complete** for **AStudio** browser. **AConsulting**
is **live**. **AQC** web preview Waves **0–5 are shipped**; desktop AQC lives in
[HolagundiWorks/AQC](https://github.com/HolagundiWorks/AQC). Stripe auto-billing
remains **deferred by choice**.

**Active delivery (2026-08-06):** LF4 SPA bind + panel→`syncToken` + unsigned
Setup.exe · [MORNING-TEST-LF4.md](MORNING-TEST-LF4.md). **Vishwakarma** (CTO)
merges crew PRs to `main` — briefs in [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md).

**Named crew (4 agents):** Canonical briefs **[AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md)**.

| Name | Role | Owns |
| --- | --- | --- |
| **Vishwakarma** | CTO / orchestrator | PR merge to `main` · roadmap truth · handoffs |
| **Bhoomi** | Local desktop | LF4 sign · MSVC rebuild · physical install / licence bind |
| **Gagan** | Cloud hub / sync | `syncToken` · `@esti/contracts` for nodes · HUB-API |
| **Aakash** | Cloud portal / GTM | Downloads manifests · M8 honesty · LF6 Figma · empty scaffolds |

Legacy Community / Manager installers and a separate Estimate desktop app stay
**retired**. The 2026-07 **web-only** product law is **superseded**.

This is the **single** delivery roadmap; agent briefs are execution slices only.

## Authoritative for what exists today

| Doc | Purpose |
| --- | --- |
| [AORMS-ECOSYSTEM-ARCHITECTURE.md](AORMS-ECOSYSTEM-ARCHITECTURE.md) | Platform vision — portal · apps · ShilpiDB |
| [WEB-PORTAL.md](WEB-PORTAL.md) | Portal product law + WP waves |
| [DESKTOP-REPOS.md](DESKTOP-REPOS.md) | Studio/Consultancy extraction gate |
| [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) | **System state** — modules live vs removed |
| [NAVIGATION.md](NAVIGATION.md) | Canonical sidebar IA |
| [LOCAL-FIRST.md](LOCAL-FIRST.md) | **Local-first + hub sync** — planes, APIs, LF waves |
| [HUB-API.md](HUB-API.md) | Versioned hub contract for desktop nodes (`2026-08`) |
| [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md) | **Named crew** — Vishwakarma · Bhoomi · Gagan · Aakash |
| [DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md) | Desktop ↔ web UX consistency |
| [MARKET-FIT.md](MARKET-FIT.md) | **GTM + market-fit backlog** |
| [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) | Standard licence law (desktop + web) |
| [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md) | Naming |
| [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md) | Host / path map |
| [APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md) | **AQC** web spine (filename kept) |
| [HCW-LICENSE-MANAGER.md](HCW-LICENSE-MANAGER.md) | In-tree licensing authority |

## Platform apps & sibling repos

| App / repo | Status |
| --- | --- |
| **AStudio** | Browser **live** (`studio.aorms.in`) · desktop via `esti/desktop` (LF4) · extract to `HolagundiWorks/AStudio` after gate |
| **AConsulting** | Browser **live** (`consultancy.aorms.in`) · desktop flavor in esti · extract after gate |
| **AQC** | Desktop repo [AQC](https://github.com/HolagundiWorks/AQC) · web preview `proc.aorms.in` |
| **AADT** | [AADT](https://github.com/HolagundiWorks/AADT) · portal link until installer |
| **ShilpiDB** | [shilpidb](https://github.com/HolagundiWorks/shilpidb) |
| **esti** | Portal · hub · License Manager · sync · shared SPA |

**Do not** extract Studio/Consultancy application code from esti until
[DESKTOP-REPOS.md](DESKTOP-REPOS.md) gate is green.

## Web Portal delivery waves

Canonical: **[WEB-PORTAL.md](WEB-PORTAL.md)**.

| Wave | Focus | Status |
| --- | --- | --- |
| **WP0** | Docs honesty + `/downloads` page shell | ✅ 2026-08 |
| **WP1** | AQC Releases wired; Studio/Consultancy/AADT placeholders | ✅ 2026-08 |
| **WP2** | Account → Licences & Downloads deep links | ✅ 2026-08 |
| **WP3** | Public `/docs` hub (curated); `/wiki` → `/docs` | ✅ 2026-08 |
| **WP4** | Release notes + checksum UI + update-manifest stubs | ✅ 2026-08 |

## Local-first delivery waves

Canonical: **[LOCAL-FIRST.md](LOCAL-FIRST.md)** · UX: **[DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md)**.

| Wave | Focus | Status |
| --- | --- | --- |
| **LF0** | Contracts: sync planes, meta schemas, capability presets | ✅ 2026-08 |
| **LF1** | Hub meta event log + catch-up + WS; node meta outbox/cursor | ✅ 2026-08 |
| **LF2** | Artifact content-hash; publish DTOs; portal-from-hub reads; desktop stub | ✅ 2026-08 |
| **LF3** | Domain metadata enqueue/apply (tasks, estimate totals, phase progress) | ✅ 2026-08 |
| **LF4** | Signed Tauri installer + first-run licence / hub bind (Studio flavor first) | 🚧 unsigned Studio Setup.exe in `desktop/artifacts/` · sign + bind morning ([MORNING-TEST-LF4.md](MORNING-TEST-LF4.md)) · [HUB-API.md](HUB-API.md) ✅ |
| **LF5** | Web parity polish (keymap + command palette) | ✅ 2026-08 |
| **LF6** | UX parity + Figma ↔ kit tokens | ✅ partial — Figma sync open |

**Namespaces:** `sync` · `esti_meta_*` · `esti_sync_*` · `packages/contracts` sync · `desktop/`.

**Migration:** `0226_local_first_sync`.

## AQC web spine waves (formerly AProc)

Canonical: **[APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md)** · product brand **AQC**.

| Wave | Focus | Status |
| --- | --- | --- |
| W0–W5 | Chrome · Delivery · tenders · RA/steel · BBS · XER · digest | ✅ |

**Still deferred:** contractor labour / plant ERP · full P6 CPM engine.

## Repo extraction

| Step | Status |
| --- | --- |
| Gate documented ([DESKTOP-REPOS.md](DESKTOP-REPOS.md)) | ✅ |
| README scaffolds under `docs/esti/repo-scaffolds/` | ✅ |
| Create GitHub `AStudio` / `AConsulting` with app code | 🔲 after LF4 + WP1 gate |
| Placeholder READMEs (no app code) | ✅ `docs/esti/repo-scaffolds/` |

## Market fit queue

Canonical: **[MARKET-FIT.md](MARKET-FIT.md)**.

Waves **W1–W3 ✅** · **W4 deferred**. Track **M8** (local-first / portal GTM) active.

## Completed tracks (2026-07 → 2026-08)

| Track | Outcome |
| --- | --- |
| Product pivot P0–P10 | One Standard licence · storage + AI · BYO key |
| **P7 billing** · **P9 Consultancy** · **HCW License Manager** | Shipped |
| **UI shell U0–U6** · **@hcw/ui-kit 1.4.0** | Shipped |
| **AQC web W0–W5** | Shipped (`0220`–`0224`) |
| **Local-first LF0–LF2** | Sync planes · desktop stub (`0226`) |
| **Web Portal WP0–WP4** | Downloads · docs · account deep links · manifests |
| **Ecosystem rename** | AORMS expansion · AQC · AADT · ShilpiDB · portal-first marketing |

## Deferred (by choice — not blocking)

1. **Stripe auto-billing / auto-suspend**  
2. **Direct cloud DB clients / third-party desktop ERP shells**  
3. **Contractor labour / plant ERP · full P6 CPM engine**  
4. **Market-fit W4 integrations**  
5. **Legacy Manager installers · separate Estimate desktop**  
6. **Studio/Consultancy repo extraction** until DESKTOP-REPOS gate  

## Change rule

Material feature changes update **PRD**, **NAVIGATION** (if IA moves),
[MARKET-FIT.md](MARKET-FIT.md), [WEB-PORTAL.md](WEB-PORTAL.md),
[LOCAL-FIRST.md](LOCAL-FIRST.md), [DESKTOP-REPOS.md](DESKTOP-REPOS.md),
[AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md) (if agent ownership moves),
and **this file** in the same pull request. Do not keep superseded specs in the tree.
