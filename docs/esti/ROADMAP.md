# AORMS Implementation Roadmap

**Status:** ACTIVE · **Updated:** 2026-08-06  
**Platform build:** COMPLETE (P0–P10 · P9.V · P9.M)  
**Market-fit waves:** COMPLETE (W1–W3) · **W4 integrations deferred** — see [MARKET-FIT.md](MARKET-FIT.md)  
**AProc waves:** COMPLETE (W0–W5) — see [APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md)  
**Local-first waves:** LF0–LF3 ✅ · LF4 🚧 (unsigned Setup.exe + bind UI) · LF5–LF6 open — see [LOCAL-FIRST.md](LOCAL-FIRST.md)  
**Crew:** [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md) (Vishwakarma · Bhoomi · Gagan · Aakash)

Phases 0–28 are **engineering-complete** for **AStudio**. **AConsulting**
is **live**. **AProc** (PMC) Waves **0–5 are shipped** (preview product —
owner-side BBS/steel recon + P6 XER milestone import; not a contractor CPM ERP).
Stripe auto-billing remains **deferred by choice**. Market-fit Waves 1–3 are
**shipped**; Wave 4 (integrations) stays phase-2 by design.

**Active delivery (2026-08-06):** hub `0227` + panel `syncToken` ✅ (Gagan #45) ·
portal `/downloads` placeholders ✅ (Aakash #46) · LF5 web parity polish 🚧
(#51) · LF4 **WinUI 3** shell 🚧 (#49 · Bhoomi on env **`bhoomi`**) · LF6
right-slot 🔲 (Aakash). Crew restarted — see [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md)
live roster. Live installer URLs stay gated. The 2026-07-19 **web-only** product
law is **superseded** for runtime shape ([PLANS-AND-TIERS.md](PLANS-AND-TIERS.md),
[LOCAL-FIRST.md](LOCAL-FIRST.md)). Legacy Community / Manager installers and a
separate Estimate desktop app stay **retired**.

This is the **single** delivery roadmap. Superseded autopilot / audit / fix-plan
docs were removed 2026-07-24 (Git history retains them).

## Authoritative for what exists today

| Doc | Purpose |
| --- | --- |
| [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) | **System state** — modules live vs removed |
| [NAVIGATION.md](NAVIGATION.md) | Canonical sidebar IA |
| [LOCAL-FIRST.md](LOCAL-FIRST.md) | **Local-first + hub sync** — planes, APIs, LF waves |
| [HUB-API.md](HUB-API.md) | Hub wire contract (`2026-08`) — activate→`syncToken`, sync REST/WS, node `sync.*` |
| [DESKTOP-REPOS.md](DESKTOP-REPOS.md) | Desktop contracts gate · installer ownership |
| [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md) | Crew split — Vishwakarma · Bhoomi · Gagan · Aakash |
| [DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md) | Desktop ↔ web UX consistency |
| [MARKET-FIT.md](MARKET-FIT.md) | **GTM + market-fit backlog** (ICP, competitors, waves) |
| [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) | Standard licence law (desktop + web) |
| [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md) | Naming (platform · apps · EOMS · ESTI) |
| [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md) | Host / path map |
| [APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md) | **AProc** product law + delivery waves |
| [P9V-CONSULTANCY-WALKTHROUGH.md](P9V-CONSULTANCY-WALKTHROUGH.md) | P9.V acceptance checklist (signed) |
| [AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md](AORMS-PRECONSTRUCTION-RO-FRAMEWORK.md) | Pre-con R&O law |
| [AORMS-CONSULTANCY-SOP-CASE-STUDY.md](AORMS-CONSULTANCY-SOP-CASE-STUDY.md) | Consultancy SOP ↔ product |
| [HCW-LICENSE-MANAGER.md](HCW-LICENSE-MANAGER.md) | In-tree licensing authority |
| [DESIGN-DEBT-REGISTER.md](../hcw-kit/11-audits/DESIGN-DEBT-REGISTER.md) | Living design debt |
| [PRD.md](PRD.md) | Requirements |

## Platform apps

| App | Status |
| --- | --- |
| **AStudio** (*Accelerated Studio*, architecture) | **Live** — `studio.aorms.in` · desktop node in progress |
| **AConsulting** (*Accelerated Consulting*, engineering) | **Live** — `consultancy.aorms.in` (P9.V ✅ · P9.M ✅) |
| **AProc** (*Accelerated Project Management*, PMC) | **Preview · Waves 0–5 ✅** — `proc.aorms.in` · `/pmc` · [APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md) |

## Local-first delivery waves

Canonical plan: **[LOCAL-FIRST.md](LOCAL-FIRST.md)** · UX: **[DESKTOP-WEB-PARITY-UX.md](DESKTOP-WEB-PARITY-UX.md)**.

| Wave | Focus | Status |
| --- | --- | --- |
| **LF0** | Contracts: sync planes, meta schemas, capability presets | ✅ 2026-08 |
| **LF1** | Hub meta event log + catch-up + WS; node meta outbox/cursor | ✅ 2026-08 |
| **LF2** | Artifact content-hash; publish DTOs; portal-from-hub reads; desktop stub; product-law docs | ✅ 2026-08 |
| **LF3** | Domain metadata enqueue/apply (tasks, estimate totals, phase progress) + panel `syncToken` | ✅ Gagan 2026-08 |
| **LF4** | Signed Tauri installer + first-run licence / hub bind | 🚧 Bhoomi — unsigned Studio Setup.exe + `DesktopLicenceBind` · sign/bind morning ([MORNING-TEST-LF4.md](MORNING-TEST-LF4.md)) |
| **LF5** | Web parity polish (capability badges, degraded AI, shared keymap) | 🔲 Aakash |
| **LF6** | UX parity checklist + inspector/AI right-slot; Figma ↔ kit tokens | ◐ Aakash — token stub ✅ · right-slot 🔲 |

**Namespaces / seams:** `sync` (tRPC + REST) · `esti_meta_*` · `esti_sync_*` ·
`packages/contracts` sync · `desktop/` · `trpc.sync.capabilities` ·
`/platform/v1/activate` → `syncToken` ([HUB-API.md](HUB-API.md)).

**Migrations:** `0226_local_first_sync` · `0227_hlp_org_sync_firm`.

## AProc delivery waves

Canonical plan: **[APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md)**.

| Wave | Focus | Status |
| --- | --- | --- |
| W0 | Platform chrome, nomenclature, `WorkspaceType.PMC` | ✅ |
| W1 | Snags + progress reports + phase live stages + home KPIs + nav | ✅ |
| W2 | Master programme · packages · tender invites ↔ contractor portal | ✅ |
| W3 | RA + steel certification · client portal summaries | ✅ |
| W4 | CSV + **P6 XER** import · RA PDF · portfolio digest · ESTI context | ✅ |
| W5 | **BBS** (IS 456) + **steel reconciliation** ERP | ✅ |

**Namespaces:** `pmcMilestones` · `pmcPackages` · `pmcPackageTenders` · `pmcRaBills` ·
`pmcSteelCerts` · `pmcDigest` · `contractorPortal` · `bbs` · `steelReconciliation` ·
`snags` · `progressReports` · `phaseProgress` (Delivery tab).

**Still deferred (by design):** contractor labour / plant ERP · full P6 CPM engine
(refuse list in APROC-ARCHITECTURE). XER imports **milestones**, not a schedule network.

**Migrations:** `0220`–`0222` AProc core · `0223` BBS · `0224` steel reconciliation.

## Market fit queue

Canonical brief: **[MARKET-FIT.md](MARKET-FIT.md)**.

### Wave 1 — ✅ shipped (2026-07-24)

| # | Item | Track | Status |
|---|---|---|---|
| W1.1 | Align Vendors nav gate with route (`atLeast(60)`) | Hygiene | ✅ |
| W1.2 | Scrub SEO landings claiming PMC / running bills as product | M5 GTM | ✅ |
| W1.3 | Scrub Ask ESTI wiki-knowledge (Estimation OS / Item library / plan-gated AI) | M5 GTM | ✅ |
| W1.4 | Landing `#pricing` + FAQ from Standard licence law | M5 GTM | ✅ |
| W1.5 | Client portal empty states + pending-approval strip | M3 Portal | ✅ |
| W1.6 | Studio Financial KPIs: fee recovery % | M1 Money | ✅ |

### Wave 2 — ✅ shipped (2026-07-24)

| # | Item | Track | Status |
|---|---|---|---|
| W2.1 | First-invoice onboarding (Studio empty-firm checklist + proposal/invoice CTAs) | M1 Money | ✅ |
| W2.2 | Studio Intelligence capacity strip (overload · busy · attendance) | M2 Capacity | ✅ |
| W2.3 | Notification digests in Alerts bell (top digest lines) | M3 Portal | ✅ |

### Wave 3 — ✅ shipped (2026-07-24)

| # | Item | Track | Status |
|---|---|---|---|
| W3.1 | Consultancy workspace chrome (Enquiries · Engagements ribbon + footer home) | M6 Consultancy | ✅ |
| W3.2 | Engagement→invoice demo seed (`EQ-DEMO-001` → `C-DEMO-001` BILLABLE stage) | M6 Consultancy | ✅ |
| W3.3 | Reference-firm packaging (Holagundi DEMO-SCRIPT + ICP-ONE-PAGER) | M5 / M6 | ✅ |

### Wave 4 — deferred (phase 2)

| Wave | Focus | Status |
|---|---|---|
| **W4** | Integrations (Tally / Drive / WhatsApp capture) | **Deferred** — not day-one |

### Tracks (from MARKET-FIT)

| ID | Track | Goal |
|---|---|---|
| M1 | Trust & money | Fee recovery visibility · invoice reliability · first-invoice onboarding |
| M2 | Time & capacity | Time → WIP → fee; overload signals |
| M3 | Client-facing proof | Portal polish · decision digests |
| M4 | India differentiation | COA/GST excellence · R&O · revision intelligence |
| M5 | GTM packaging | Consistent story · pricing · Ask ESTI truth |
| M6 | Consultancy GTM | Chrome · demos · references |
| M7 | Integrations | Phase 2 |
| M8 | Local-first GTM | Desktop preferred story · hub sync · web parity (align copy with LOCAL-FIRST) |

## Completed tracks (2026-07 → 2026-08)

| Track | Outcome |
| --- | --- |
| Product pivot P0–P10 | One Standard licence · storage + AI · BYO AI key · browser takeoff · hygiene/rebrand/deps *(web-only law later superseded by local-first)* |
| **P7 billing** | Multi-tenant usage · CSV + mark-billed · suspend-for-non-payment (Stripe auto deferred) |
| **P9 Consultancy** | Engagements · reliance · fees · SOP · enquiry · fee-stage invoices · intelligence (`0214`–`0219`) |
| **P9.V / P9.M** | Walkthrough signed · marketing live |
| **Pre-con R&O** | Consultancy + Studio phase gates |
| **UI shell U0–U6** | Glass rail · stage · ActionDock · marketing shell |
| **@hcw/ui-kit 1.4.0** | Vendored + app shell adoption |
| **Blog / SEO** | `/blog` live; feed/sitemap refreshed |
| **HCW License Manager** | In-tree (`admin.aorms.in`) |
| **Market fit W1–W3** | GTM scrub · portal · fee recovery · onboarding · capacity · digests · consultancy chrome · demo seed · packaging |
| **AProc W0–W5** | Chrome · Delivery · tenders · RA/steel cert · BBS + steel recon · CSV/XER · digest · ESTI (`0220`–`0224`) |
| **Local-first LF0–LF3** | Sync planes · meta log/WS · artifact hash · portal hub reads · desktop stub · panel `syncToken` · domain meta (`0226`–`0227`) |

## Deferred (by choice — not blocking)

1. **Stripe auto-billing / auto-suspend** — manual India usage-billing path is the shipping path  
2. **Direct cloud DB clients / third-party desktop ERP shells** — firm data stays behind AORMS APIs; the **AORMS desktop node** is first-class ([LOCAL-FIRST.md](LOCAL-FIRST.md)), not a generic DB GUI  
3. **Contractor labour / plant ERP · full P6 CPM engine** — outside AProc (owner-side cert + milestone import only)  
4. **Market-fit W4 integrations** (Tally / Drive / WhatsApp capture) — phase 2 after first paying firms  
5. **Legacy Community / Manager installers · separate Estimate desktop app** — permanently retired; estimating stays in-product  

## Change rule

Material feature changes update **PRD**, **NAVIGATION** (if IA moves),
[MARKET-FIT.md](MARKET-FIT.md) (if GTM priority moves), [APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md)
(if AProc waves move), [LOCAL-FIRST.md](LOCAL-FIRST.md) (if sync/desktop waves move),
and **this file** in the same pull request. **Do not** keep superseded specs in
the tree — delete them; Git history is the archive. Contradictory **web-only**
claims in marketing or wiki must be scrubbed when product law moves (M8).
