# AORMS Implementation Roadmap

**Status:** ACTIVE Â· **Updated:** 2026-08-06  
**Platform build:** COMPLETE (P0â€“P10 Â· P9.V Â· P9.M)  
**Market-fit waves:** COMPLETE (W1â€“W3) Â· **W4 integrations deferred** â€” see [MARKET-FIT.md](MARKET-FIT.md)  
**AProc waves:** COMPLETE (W0â€“W5) â€” see [APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md)  
**Local-first waves:** LF0â€“LF3 âœ… Â· LF4 ðŸš§ Â· LF5 âœ… Â· LF6 âœ… â€” see [LOCAL-FIRST.md](LOCAL-FIRST.md)

**Solo delivery (2026-08-06):** cloud crew (Vishwakarma Â· Gagan Â· Aakash Â· Bhoomi)
parked â€” model expired. **Bhoomi2** (this Windows Cursor session) is the only
active agent and owns the remaining LF4 physical gate end-to-end. See
[AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md).

Phases 0â€“28 are **engineering-complete** for **AStudio**. **AConsulting**
is **live**. **AProc** (PMC) Waves **0â€“5 are shipped** (preview product â€”
owner-side BBS/steel recon + P6 XER milestone import; not a contractor CPM ERP).
Stripe auto-billing remains **deferred by choice**. Market-fit Waves 1â€“3 are
**shipped**; Wave 4 (integrations) stays phase-2 by design.

**Desktop-first trim (2026-08-06):** with the desktop node as the primary app and
AI running locally, the web stack is being slimmed: unused frontend deps removed
(#62); **AI is now local-only** â€” Ollama + deterministic mock fallback, hosted/cloud
BYO tier and hosted token metering dropped (#63); legacy **Tauri** shell removed â€”
WinUI 3 is the sole desktop shell (#64); dead marketing/SEO assets trimmed (#65).
Web parity of the staff SPA is otherwise preserved pending a product decision on
browser-staff scope.

### Now (Bhoomi2 solo queue)

| # | Work | Status |
| --- | --- | --- |
| 1 | Local Docker node stack healthy | âœ… |
| 2 | Host toolchain (.NET 8 Â· WinAppRuntime 1.6 Â· WebView2 Â· Node/pnpm Â· Docker) | âœ… |
| 3 | Apply hub migration **`0227`** on local DB Â· confirm activateâ†’`syncToken` | âœ… |
| 4 | `build-winui.ps1 -Profile STUDIO` Â· run shell vs `http://127.0.0.1:5173` | âœ… |
| 5 | Authenticode sign (operator cert) Â· measure sha256 | âœ… ACO **dev** Â· SmartScreen trust ðŸ”² |
| 6 | Physical bind: firm admin â†’ `DesktopLicenceBind` â†’ `hasSyncToken` | âœ… local API smoke (`VALID` Â· `hasSyncToken` Â· `metaSync` Â· **`pullMeta`**) |
| 6b | Colocated hub routes for local loopback (`ESTI_COLOCATED_HUB`) | âœ… â€” node can mount `/api/sync/*` for single-box smoke |
| 7 | Public HTTPS URL + fill `/downloads` manifests (was Aakash) | ðŸ”² gated on **SmartScreen-trusted** cert + release host |
| 8 | M8 live-installer honesty Â· keep `web_fallback` until 7 | âœ… manifests stay `web_fallback` (no invented sha256 / URL) |
| 9 | Pure neumorphism marketing (`MarketingNeuFrame` Â· AnalogueClock Â· blog/SEO) | âœ… `8bad1e5c` â€” Home/Blog/Downloads top ribbon; web-only scrubbed |

Canonical runbook: [MORNING-TEST-LF4.md](MORNING-TEST-LF4.md). Do **not** invent
sha256 or flip portal URLs unsigned. Marketing uses **opaque soft neu** top ribbon
+ stage + fixed AnalogueClock (left SoftRail / glass marketing chrome retired).
Staff shell: top ribbon Â· stage Â· taskbar Â· ActionDock Â· AnalogueClock.

**Parked until crew returns:** multi-agent PR choreography, cloud hub prod `0227`
(ops), Stripe/W4, AStudio/AConsulting code extraction.
The 2026-07-19 **web-only** product law is **superseded** for runtime shape
([PLANS-AND-TIERS.md](PLANS-AND-TIERS.md), [LOCAL-FIRST.md](LOCAL-FIRST.md)).
Legacy Community / Manager installers and a separate Estimate desktop app stay
**retired**.

This is the **single** delivery roadmap. Superseded autopilot / audit / fix-plan
docs were removed 2026-07-24 (Git history retains them).

## Authoritative for what exists today

| Doc | Purpose |
| --- | --- |
| [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) | **System state** â€” modules live vs removed |
| [NAVIGATION.md](NAVIGATION.md) | Canonical sidebar IA |
| [LOCAL-FIRST.md](LOCAL-FIRST.md) | **Local-first + hub sync** â€” planes, APIs, LF waves |
| [HUB-API.md](HUB-API.md) | Hub wire contract (`2026-08`) â€” activateâ†’`syncToken`, sync REST/WS, node `sync.*` |
| [DESKTOP-REPOS.md](DESKTOP-REPOS.md) | Desktop contracts gate Â· installer ownership |
| [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md) | Crew â€” **solo Bhoomi2** while others parked |
| [DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md) | Desktop â†” web UX consistency |
| [MARKET-FIT.md](MARKET-FIT.md) | **GTM + market-fit backlog** (ICP, competitors, waves) |
| [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) | Standard licence law (desktop + web) |
| [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md) | Naming (platform Â· apps Â· EOMS Â· ESTI) |
| [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md) | Host / path map |
| [APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md) | **AProc** product law + delivery waves |
| [P9V-CONSULTANCY-WALKTHROUGH.md](P9V-CONSULTANCY-WALKTHROUGH.md) | P9.V acceptance checklist (signed) |
| [AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md](AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md) | Pre-con R&O law |
| [AORMS-CONSULTANCY-SOP-CASE-STUDY.md](AORMS-CONSULTANCY-SOP-CASE-STUDY.md) | Consultancy SOP â†” product |
| [HCW-LICENSE-MANAGER.md](HCW-LICENSE-MANAGER.md) | In-tree licensing authority |
| [DESIGN-DEBT-REGISTER.md](../hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md) | Living design debt |
| [PRD.md](PRD.md) | Requirements |

## Platform apps

| App | Status |
| --- | --- |
| **AStudio** (*Accelerated Studio*, architecture) | **Live** â€” `studio.aorms.in` Â· desktop node in progress |
| **AConsulting** (*Accelerated Consulting*, engineering) | **Live** â€” `consultancy.aorms.in` (P9.V âœ… Â· P9.M âœ…) |
| **AProc** (*Accelerated Project Management*, PMC) | **Preview Â· Waves 0â€“5 âœ…** â€” `proc.aorms.in` Â· `/pmc` Â· [APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md) |

## Local-first delivery waves

Canonical plan: **[LOCAL-FIRST.md](LOCAL-FIRST.md)** Â· UX: **[DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md)**.

| Wave | Focus | Status |
| --- | --- | --- |
| **LF0** | Contracts: sync planes, meta schemas, capability presets | âœ… 2026-08 |
| **LF1** | Hub meta event log + catch-up + WS; node meta outbox/cursor | âœ… 2026-08 |
| **LF2** | Artifact content-hash; publish DTOs; portal-from-hub reads; desktop stub; product-law docs | âœ… 2026-08 |
| **LF3** | Domain metadata enqueue/apply (tasks, estimate totals, phase progress) + panel `syncToken` | âœ… Gagan 2026-08 |
| **LF4** | Signed **WinUI 3** installer + first-run licence / hub bind | ðŸš§ **Bhoomi2 solo** â€” code âœ… (#49) Â· local bind âœ… Â· SmartScreen/prod URL ðŸ”² ([MORNING-TEST-LF4.md](MORNING-TEST-LF4.md)); Tauri removed (#64) || **LF5** | Web parity polish (capability badges, degraded AI, shared keymap) | âœ… Aakash 2026-08 â€” `CapabilityBadge` Â· `keymap` Â· `/help` Â· web-parity `localAi` fix |
| **LF6** | UX parity checklist + inspector/AI right-slot; Figma â†” kit tokens | âœ… Aakash â€” token stub âœ… Â· right-slot âœ… (`RightSlot` Properties â†” Ask ESTI) |

**Namespaces / seams:** `sync` (tRPC + REST) Â· `esti_meta_*` Â· `esti_sync_*` Â·
`packages/contracts` sync Â· `desktop/` Â· `trpc.sync.capabilities` Â·
`/platform/v1/activate` â†’ `syncToken` ([HUB-API.md](HUB-API.md)).

**Migrations:** `0226_local_first_sync` Â· `0227_hlp_org_sync_firm`.

## AProc delivery waves

Canonical plan: **[APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md)**.

| Wave | Focus | Status |
| --- | --- | --- |
| W0 | Platform chrome, nomenclature, `WorkspaceType.PMC` | âœ… |
| W1 | Snags + progress reports + phase live stages + home KPIs + nav | âœ… |
| W2 | Master programme Â· packages Â· tender invites â†” contractor portal | âœ… |
| W3 | RA + steel certification Â· client portal summaries | âœ… |
| W4 | CSV + **P6 XER** import Â· RA PDF Â· portfolio digest Â· ESTI context | âœ… |
| W5 | **BBS** (IS 456) + **steel reconciliation** ERP | âœ… |

**Namespaces:** `pmcMilestones` Â· `pmcPackages` Â· `pmcPackageTenders` Â· `pmcRaBills` Â·
`pmcSteelCerts` Â· `pmcDigest` Â· `contractorPortal` Â· `bbs` Â· `steelReconciliation` Â·
`snags` Â· `progressReports` Â· `phaseProgress` (Delivery tab).

**Still deferred (by design):** contractor labour / plant ERP Â· full P6 CPM engine
(refuse list in APROC-ARCHITECTURE). XER imports **milestones**, not a schedule network.

**Migrations:** `0220`â€“`0222` AProc core Â· `0223` BBS Â· `0224` steel reconciliation.

## Market fit queue

Canonical brief: **[MARKET-FIT.md](MARKET-FIT.md)**.

### Wave 1 â€” âœ… shipped (2026-07-24)

| # | Item | Track | Status |
|---|---|---|---|
| W1.1 | Align Vendors nav gate with route (`atLeast(60)`) | Hygiene | âœ… |
| W1.2 | Scrub SEO landings claiming PMC / running bills as product | M5 GTM | âœ… |
| W1.3 | Scrub Ask ESTI wiki-knowledge (Estimation OS / Item library / plan-gated AI) | M5 GTM | âœ… |
| W1.4 | Landing `#pricing` + FAQ from Standard licence law | M5 GTM | âœ… |
| W1.5 | Client portal empty states + pending-approval strip | M3 Portal | âœ… |
| W1.6 | Studio Financial KPIs: fee recovery % | M1 Money | âœ… |

### Wave 2 â€” âœ… shipped (2026-07-24)

| # | Item | Track | Status |
|---|---|---|---|
| W2.1 | First-invoice onboarding (Studio empty-firm checklist + proposal/invoice CTAs) | M1 Money | âœ… |
| W2.2 | Studio Intelligence capacity strip (overload Â· busy Â· attendance) | M2 Capacity | âœ… |
| W2.3 | Notification digests in Alerts bell (top digest lines) | M3 Portal | âœ… |

### Wave 3 â€” âœ… shipped (2026-07-24)

| # | Item | Track | Status |
|---|---|---|---|
| W3.1 | Consultancy workspace chrome (Enquiries Â· Engagements ribbon + footer home) | M6 Consultancy | âœ… |
| W3.2 | Engagementâ†’invoice demo seed (`EQ-DEMO-001` â†’ `C-DEMO-001` BILLABLE stage) | M6 Consultancy | âœ… |
| W3.3 | Reference-firm packaging (Holagundi DEMO-SCRIPT + ICP-ONE-PAGER) | M5 / M6 | âœ… |

### Wave 4 â€” deferred (phase 2)

| Wave | Focus | Status |
|---|---|---|
| **W4** | Integrations (Tally / Drive / WhatsApp capture) | **Deferred** â€” not day-one |

### Tracks (from MARKET-FIT)

| ID | Track | Goal |
|---|---|---|
| M1 | Trust & money | Fee recovery visibility Â· invoice reliability Â· first-invoice onboarding |
| M2 | Time & capacity | Time â†’ WIP â†’ fee; overload signals |
| M3 | Client-facing proof | Portal polish Â· decision digests |
| M4 | India differentiation | COA/GST excellence Â· R&O Â· revision intelligence |
| M5 | GTM packaging | Consistent story Â· pricing Â· Ask ESTI truth |
| M6 | Consultancy GTM | Chrome Â· demos Â· references |
| M7 | Integrations | Phase 2 |
| M8 | Local-first GTM | Desktop preferred story Â· hub sync Â· web parity (align copy with LOCAL-FIRST) |

## Completed tracks (2026-07 â†’ 2026-08)

| Track | Outcome |
| --- | --- |
| Product pivot P0â€“P10 | One Standard licence Â· storage + AI Â· browser takeoff Â· hygiene/rebrand/deps *(BYO AI key + hosted token metering and the web-only law later superseded by local-first, local-only unmetered AI â€” #63)* |
| **P7 billing** | Multi-tenant usage Â· CSV + mark-billed Â· suspend-for-non-payment (Stripe auto deferred) |
| **P9 Consultancy** | Engagements Â· reliance Â· fees Â· SOP Â· enquiry Â· fee-stage invoices Â· intelligence (`0214`â€“`0219`) |
| **P9.V / P9.M** | Walkthrough signed Â· marketing live |
| **Pre-con R&O** | Consultancy + Studio phase gates |
| **UI shell U0â€“U6** | Soft neu chrome Â· stage Â· ActionDock Â· marketing shell |
| **@hcw/ui-kit 1.5.0** | Pure neumorphism Â· SoftRail Â· AnalogueClock Â· marketing `MarketingNeuFrame` |
| **Blog / SEO** | `/blog` live; neu + desktop posts; feed/sitemap/llms scrubbed web-only |
| **HCW License Manager** | In-tree (`admin.aorms.in`) |
| **Market fit W1â€“W3** | GTM scrub Â· portal Â· fee recovery Â· onboarding Â· capacity Â· digests Â· consultancy chrome Â· demo seed Â· packaging |
| **AProc W0â€“W5** | Chrome Â· Delivery Â· tenders Â· RA/steel cert Â· BBS + steel recon Â· CSV/XER Â· digest Â· ESTI (`0220`â€“`0224`) |
| **Local-first LF0â€“LF3** | Sync planes Â· meta log/WS Â· artifact hash Â· portal hub reads Â· desktop stub Â· panel `syncToken` Â· domain meta (`0226`â€“`0227`) |
| **Local-first LF5** | Capability badges Â· Hosted AI empty states Â· shared `keymap` + `/help` Â· web-parity capabilities fix |

## Deferred (by choice â€” not blocking)

1. **Stripe auto-billing / auto-suspend** â€” manual India usage-billing path is the shipping path  
2. **Direct cloud DB clients / third-party desktop ERP shells** â€” firm data stays behind AORMS APIs; the **AORMS desktop node** is first-class ([LOCAL-FIRST.md](LOCAL-FIRST.md)), not a generic DB GUI  
3. **Contractor labour / plant ERP Â· full P6 CPM engine** â€” outside AProc (owner-side cert + milestone import only)  
4. **Market-fit W4 integrations** (Tally / Drive / WhatsApp capture) â€” phase 2 after first paying firms  
5. **Legacy Community / Manager installers Â· separate Estimate desktop app** â€” permanently retired; estimating stays in-product  

## Change rule

Material feature changes update **PRD**, **NAVIGATION** (if IA moves),
[MARKET-FIT.md](MARKET-FIT.md) (if GTM priority moves), [APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md)
(if AProc waves move), [LOCAL-FIRST.md](LOCAL-FIRST.md) (if sync/desktop waves move),
and **this file** in the same pull request. **Do not** keep superseded specs in
the tree â€” delete them; Git history is the archive. Contradictory **web-only**
claims in marketing or wiki must be scrubbed when product law moves (M8).

