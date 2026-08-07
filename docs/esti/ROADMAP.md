# AORMS Implementation Roadmap

**Status:** COMPLETE (engineering) · **Updated:** 2026-08-07  
**Platform build:** COMPLETE (P0–P10 · P9.V · P9.M)  
**Market-fit waves:** COMPLETE (W1–W3) · **W4 integrations deferred by choice** — [MARKET-FIT.md](MARKET-FIT.md)  
**AProc waves:** COMPLETE (W0–W5) — [APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md)  
**Local-first waves:** LF0–LF3 · LF5 · LF6 ✅ · **LF4** code + local bind ✅ · **prod SmartScreen / public installer URL** 🔒 ops  
**UI chrome:** Waves 1–7 ✅ — [UI-SITE-MAP.md](UI-SITE-MAP.md) · [PAGE-STRUCTURE.md](PAGE-STRUCTURE.md)

This is the **single** delivery roadmap. Product and engineering delivery for
**AStudio**, **AConsulting**, and **AProc** (preview) is **complete**. Remaining
open items are **operator / ops gates** or **explicit phase-2 deferrals** — not
missing product scope.

Phases 0–28 are **engineering-complete** for **AStudio**. **AConsulting** is
**live**. **AProc** Waves **0–5 are shipped** (owner-side BBS/steel recon + P6 XER
milestone import; not a contractor CPM ERP). Stripe auto-billing remains
**deferred by choice**. Market-fit Waves 1–3 are **shipped**; Wave 4
(integrations) stays phase-2 by design.

**Desktop-first (2026-08):** desktop node is the preferred runtime; AI is
**local-only** (Ollama + deterministic mock); WinUI 3 is the sole desktop shell
(Tauri removed). Web SPA parity is preserved.

---

## Completion summary

| Track | Status |
| --- | --- |
| Product pivot P0–P10 | ✅ |
| P7 billing (manual India path) | ✅ · Stripe auto deferred |
| P9 Consultancy · P9.V / P9.M | ✅ |
| Pre-con R&O | ✅ |
| UI shell U0–U6 · pure neu 1.5.0 | ✅ |
| UI Wave 7 — unified `/login` + account hub | ✅ 2026-08-07 |
| Market fit W1–W3 | ✅ · W4 deferred |
| AProc W0–W5 | ✅ |
| Local-first LF0–LF3 · LF5 · LF6 | ✅ |
| Local-first LF4 (WinUI + bind) | ✅ code · ✅ local bind · 🔒 SmartScreen + public URL |
| Blog / SEO · HCW License Manager | ✅ |

---

## Open gates (ops only — not product backlog)

| # | Work | Status |
| --- | --- | --- |
| 1 | SmartScreen-trusted Authenticode cert (production) | 🔒 operator cert |
| 2 | Public HTTPS installer URL + `/downloads` live manifests (sha256) | 🔒 gated on (1) — keep `web_fallback` until then |
| 3 | Cloud hub prod migration `0227` (ops) | 🔒 parked |
| 4 | Multi-agent PR choreography / crew return | 🔒 parked |

Canonical LF4 runbook: [MORNING-TEST-LF4.md](MORNING-TEST-LF4.md).  
**Do not** invent sha256 or flip portal installer URLs unsigned.

**Parked until crew / ops:** Stripe/W4 integrations, AStudio/AConsulting code
extraction, cloud hub prod `0227`.

---

## Authoritative for what exists today

| Doc | Purpose |
| --- | --- |
| [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) | **System state** — modules live vs removed |
| [NAVIGATION.md](NAVIGATION.md) | Canonical sidebar IA |
| [LOCAL-FIRST.md](LOCAL-FIRST.md) | **Local-first + hub sync** — planes, APIs, LF waves |
| [HUB-API.md](HUB-API.md) | Hub wire contract — activate→`syncToken`, sync REST/WS |
| [DESKTOP-REPOS.md](DESKTOP-REPOS.md) | Desktop contracts · installer ownership |
| [UI-SITE-MAP.md](UI-SITE-MAP.md) | Chrome by surface · **unified `/login` tabs** |
| [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md) | Host / path map |
| [ADMIN-GUIDE.md](ADMIN-GUIDE.md) | Deploy + login flows (§3 unified tabs) |
| [MARKET-FIT.md](MARKET-FIT.md) | GTM + market-fit backlog |
| [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) | Standard licence law |
| [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md) | Naming |
| [APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md) | AProc product law + waves |
| [DESIGN-DEBT-REGISTER.md](../hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md) | Living design debt |
| [PRD.md](PRD.md) | Requirements |

## Platform apps

| App | Status |
| --- | --- |
| **AStudio** (*Accelerated Studio*, architecture) | **Live** — `studio.aorms.in` · desktop node preferred |
| **AConsulting** (*Accelerated Consulting*, engineering) | **Live** — `consultancy.aorms.in` (P9.V ✅ · P9.M ✅) |
| **AProc** (*Accelerated Project Management*, PMC) | **Preview · Waves 0–5 ✅** — `proc.aorms.in` · `/pmc` |

---

## Local-first delivery waves

Canonical plan: **[LOCAL-FIRST.md](LOCAL-FIRST.md)** · UX: **[DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md)**.

| Wave | Focus | Status |
| --- | --- | --- |
| **LF0** | Contracts: sync planes, meta schemas, capability presets | ✅ 2026-08 |
| **LF1** | Hub meta event log + catch-up + WS; node meta outbox/cursor | ✅ 2026-08 |
| **LF2** | Artifact content-hash; publish DTOs; portal-from-hub reads; desktop stub | ✅ 2026-08 |
| **LF3** | Domain metadata enqueue/apply + panel `syncToken` | ✅ 2026-08 |
| **LF4** | Signed **WinUI 3** installer + first-run licence / hub bind | ✅ code · ✅ local bind · 🔒 prod SmartScreen/URL |
| **LF5** | Web parity polish (capability badges, keymap, `/help`) | ✅ 2026-08 |
| **LF6** | UX parity + inspector/AI right-slot | ✅ 2026-08 |

**Namespaces / seams:** `sync` · `esti_meta_*` · `esti_sync_*` · `desktop/` ·
`trpc.sync.capabilities` · `/platform/v1/activate` → `syncToken`.

**Migrations:** `0226_local_first_sync` · `0227_hlp_org_sync_firm`.

---

## AProc delivery waves

Canonical plan: **[APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md)**.

| Wave | Focus | Status |
| --- | --- | --- |
| W0–W5 | Chrome · Delivery · tenders · RA/steel · BBS · CSV/XER · digest · ESTI | ✅ |

**Still deferred (by design):** contractor labour / plant ERP · full P6 CPM engine.

**Migrations:** `0220`–`0224`.

---

## Market fit queue

Canonical brief: **[MARKET-FIT.md](MARKET-FIT.md)**.

| Wave | Status |
| --- | --- |
| **W1–W3** | ✅ shipped 2026-07-24 |
| **W4** integrations (Tally / Drive / WhatsApp) | **Deferred** — phase 2 |

### Tracks

| ID | Track | Goal |
|---|---|---|
| M1 | Trust & money | Fee recovery · invoice reliability · first-invoice onboarding |
| M2 | Time & capacity | Time → WIP → fee; overload signals |
| M3 | Client-facing proof | Portal polish · decision digests |
| M4 | India differentiation | COA/GST · R&O · revision intelligence |
| M5 | GTM packaging | Consistent story · pricing · Ask ESTI truth |
| M6 | Consultancy GTM | Chrome · demos · references |
| M7 | Integrations | Phase 2 |
| M8 | Local-first GTM | Desktop preferred · hub sync · web parity |

---

## UI chrome (2026-08)

| Wave | Outcome |
| --- | --- |
| 1–6 | Soft AppRibbon · AnalogueClock · Fog Gray · PortalNeuFrame · composition rhythm · AormsMark |
| **7** | Unified `/login` (Workspace · Portals · Account + Personal/Company/Licensing scopes) · soft `PortalCard` account hub · denser landing entourage |

Canon: [UI-SITE-MAP.md](UI-SITE-MAP.md) · [ADMIN-GUIDE.md](ADMIN-GUIDE.md) §3 · [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md).

---

## Deferred (by choice — not blocking)

1. **Stripe auto-billing / auto-suspend** — manual India usage-billing path ships  
2. **Direct cloud DB clients / third-party desktop ERP shells** — firm data stays behind AORMS APIs  
3. **Contractor labour / plant ERP · full P6 CPM** — outside AProc  
4. **Market-fit W4 integrations** — phase 2 after first paying firms  
5. **Legacy Community / Manager installers · separate Estimate desktop** — permanently retired  

---

## Change rule

Material feature changes update **PRD**, **NAVIGATION** (if IA moves),
[MARKET-FIT.md](MARKET-FIT.md) (if GTM priority moves), [APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md)
(if AProc waves move), [LOCAL-FIRST.md](LOCAL-FIRST.md) (if sync/desktop waves move),
[UI-SITE-MAP.md](UI-SITE-MAP.md) (if chrome / auth surfaces move),
and **this file** in the same pull request. **Do not** keep superseded specs in
the tree — delete them; Git history is the archive.
