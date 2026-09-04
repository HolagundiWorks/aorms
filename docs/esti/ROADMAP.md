# AORMS Implementation Roadmap

**Status:** ACTIVE · **Updated:** 2026-08-06  
**Platform build:** COMPLETE (P0–P10 · P9.V · P9.M)  
**Market-fit waves:** COMPLETE (W1–W3) · **W4 integrations deferred** — see [MARKET-FIT.md](MARKET-FIT.md)  
**AProc waves:** COMPLETE (W0–W5) — see [APROC-ARCHITECTURE.md](APROC-ARCHITECTURE.md)  
**Local-first waves:** LF0–LF3 ✅ · LF4 🚧 (unsigned Setup.exe + bind UI) · LF5 ✅ (Aakash #51) · LF6 ✅ right-slot (Aakash #54) — see [LOCAL-FIRST.md](LOCAL-FIRST.md)  

**Crew:** [AGENT-WORKSTREAMS.md](AGENT-WORKSTREAMS.md) (Vishwakarma · Bhoomi · Gagan · Aakash)

Open source for now; SaaS licensing deferred.

**Active delivery (2026-08-06):** hub `0227` + panel `syncToken` ✅ (Gagan #45) ·
portal `/downloads` placeholders ✅ (Aakash #46) · LF5 web parity polish ✅
(capability badges · degraded AI · shared keymap `/help`) · LF4 Tauri scaffold +
`DesktopLicenceBind` 🚧 (Bhoomi — sign + physical bind per
[MORNING-TEST-LF4.md](MORNING-TEST-LF4.md)). Live installer URLs stay gated.
LF6 right-slot ✅ (`RightSlot` Properties ↔ Ask ESTI).
The 2026-07-19 **web-only** product law is **superseded** for runtime shape
([PLANS-AND-TIERS.md](PLANS-AND-TIERS.md), [LOCAL-FIRST.md](LOCAL-FIRST.md)).
Legacy Community / Manager installers and a separate Estimate desktop app stay
**retired**.

---

## Soft launch (aorms.in — now)

| Surface | State |
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

Gate: `VITE_MARKETING_ONLY` (default on for public builds) · `frontend/src/lib/marketing-gate.ts`.  
Desktop firm login target: **AORMS Connect** (not apex).

---

## Suite waves

| # | Work | Where | Exit |
| --- | --- | --- | --- |
| S0 | Suite canon docs | esti | ✅ [AORMS-SUITE.md](AORMS-SUITE.md) |
| S1 | Mongo ops spike + portal read | esti hub | ✅ [MONGO-OPS.md](MONGO-OPS.md) |
| S2 | Shilpi wire + portal drawing packages | esti · portals | ✅ [SHILPI-WIRE.md](SHILPI-WIRE.md) |
| S3 | AQC three-app packaging | AQC | ✅ Estimation · BBS · PM shells |
| S4 | Manager Tasks module | AStudio · AConsulting | ✅ local tasks + publish ops |
| S5 | Online ops DB manager | esti | ✅ `/ops-db` |
| S6 | Soft-launch marketing | esti | ✅ Landing · blog · SEO · marketing-only gate · VPS bootstrap |
| S7 | Soft-launch ops + agent law | esti | ✅ [PRODUCTION-OPS](PRODUCTION-OPS.md) § Soft launch · CLAUDE/AGENTS |
| **C0** | AORMS Connect canon + nomenclature + downloads stub | esti | ✅ [AORMS-CONNECT.md](AORMS-CONNECT.md) |
| **C1** | Connect WinUI shell (login · launcher · catalog stub) | AORMS-Connect | ✅ shell scaffold · deepen C2 |
| **C2** | Session broker + project catalog for sibling apps | Connect · Bridge | ✅ `session.json` · `ConnectCatalog` · sibling import |
| **C3** | Licence Manager surface in Connect | Connect | ✅ local status · admin.aorms.in link |
| **S8** | Reopen apex auth / portal demos | esti | 🟡 code ready (gate-aware CTAs · `s8-reopen-demos.sh`) · VPS flip 🔲 |
| **S9** | Per-app installer packaging (MSIX) | AQC-* repos | 🟡 unsigned MSIX ✅ · code sign 🔲 D6 |
| **S10** | Firm portal depth | esti portals | ✅ collab tx+ack · Documents+RA · contractor/site Drawings · collab demo login |
| **S11** | Joint measurement → approval → rate books · PDF annotate · AQC sync contract | esti · AQC | ✅ hub + [AQC-JM-SYNC.md](AQC-JM-SYNC.md) · **AQC Pull JM** ✅ (`GET /api/ops/joint-measurements` · Bridge · BBSApp Outputs) |
| **S12** | UX audit wave (1B+2C) — landing honesty · portal docks · SPA de-Carbon · manager HCW chrome start | esti · AStudio · AConsulting | ✅ [2026-08-09-UX-AUDIT-WAVE.md](../hcw-kit/11-audits/2026-08-09-UX-AUDIT-WAVE.md) · SPA `@carbon/react` removed ✅ · AConsulting Engagements ✅ · AStudio S2c polish ✅ · AQC chrome out of S12 |

---

## D-waves (desktop baseline)

| Wave | Outcome | Status |
| --- | --- | --- |
| **LF0** | Contracts: sync planes, meta schemas, capability presets | ✅ 2026-08 |
| **LF1** | Hub meta event log + catch-up + WS; node meta outbox/cursor | ✅ 2026-08 |
| **LF2** | Artifact content-hash; publish DTOs; portal-from-hub reads; desktop stub; product-law docs | ✅ 2026-08 |
| **LF3** | Domain metadata enqueue/apply (tasks, estimate totals, phase progress) + panel `syncToken` | ✅ Gagan 2026-08 |
| **LF4** | Signed Tauri installer + first-run licence / hub bind | 🚧 Bhoomi — unsigned Studio Setup.exe + `DesktopLicenceBind` · sign/bind morning ([MORNING-TEST-LF4.md](MORNING-TEST-LF4.md)) |
| **LF5** | Web parity polish (capability badges, degraded AI, shared keymap) | ✅ Aakash 2026-08 — `CapabilityBadge` · `keymap` · `/help` · web-parity `localAi` fix |
| **LF6** | UX parity checklist + inspector/AI right-slot; Figma ↔ kit tokens | ✅ Aakash — token stub ✅ · right-slot ✅ (`RightSlot` Properties ↔ Ask ESTI) |

**Namespaces / seams:** `sync` (tRPC + REST) · `esti_meta_*` · `esti_sync_*` ·
`packages/contracts` sync · `desktop/` · `trpc.sync.capabilities` ·
`/platform/v1/activate` → `syncToken` ([HUB-API.md](HUB-API.md)).

**Migrations:** `0226_local_first_sync` · `0227_hlp_org_sync_firm`.

| App / surface | Role | Repo |
| --- | --- | --- |
| **AORMS Connect** | Suite core — SSO · launcher · catalog | [AORMS-Connect](https://github.com/HolagundiWorks/AORMS-Connect) |
| **AStudio** / **AConsulting** | Practice managers | [AStudio](https://github.com/HolagundiWorks/AStudio) · [AConsulting](https://github.com/HolagundiWorks/AConsulting) |
| **AQC Estimation / BBS / PM** | Three technical installers · shared engine | [AQC](https://github.com/HolagundiWorks/AQC) SoT · [AQC-Estimation](https://github.com/HolagundiWorks/AQC-Estimation) · [AQC-BBS](https://github.com/HolagundiWorks/AQC-BBS) · [AQC-PM](https://github.com/HolagundiWorks/AQC-PM) |
| **ADraft** · **ShilpiDB** | Drafting · geometry | [repo](https://github.com/HolagundiWorks/AADT) · [shilpidb](https://github.com/HolagundiWorks/shilpidb) |
| **aorms** (esti) | Hub · marketing · portals · Mongo ops | [aorms](https://github.com/HolagundiWorks/aorms) |

## Next up (execute in order)

### C-wave — AORMS Connect

| Slice | Status |
| --- | --- |
| Product pivot P0–P10 | One Standard licence · storage + AI · browser takeoff · hygiene/rebrand/deps *(BYO AI key + hosted token metering and the web-only law later superseded by local-first, local-only unmetered AI — #63)* |
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
| **Local-first LF5** | Capability badges · Hosted AI empty states · shared `keymap` + `/help` · web-parity capabilities fix |

### S8 — Reopen apex auth (when demos are honest)

| Slice | Status |
| --- | --- |
| Honest portal tabs · installers decoupled from auth gate | ✅ |
| Landing/dock CTAs + FAQ follow marketing gate | ✅ |
| `deploy/s8-reopen-demos.sh` (`CONFIRM=yes`) | ✅ |
| Local smoke (`compose` · `VITE_MARKETING_ONLY=false`) | ✅ `deploy/s8-local.ps1` |
| VPS env flip (`VITE_MARKETING_ONLY=false`) | 🔲 blocked — deploy key not in VPS `authorized_keys` |
| Actions runner | ✅ `gh workflow run s8-reopen-demos.yml` (needs pubkey auth) |

### Autopilot in-repo (2026-08-09)

| Wave | Work | Status |
| --- | --- | --- |
| W1 | **S11** AQC Estimation Pull joint measurements | ✅ |
| W2 | **S12** Remove remaining `@carbon/react` from esti SPA | ✅ |
| W3 | AConsulting Engagements/Projects stage on HCW dock | ✅ |
| W4 | AStudio S2c Portfolio / Focus polish | ✅ |
| W5+ | Pin Connect · AStudio · AConsulting `vendor/AQC` → `5f553cb` (JM + OutboxCounts) | ✅ |
| W6 | AConsulting **Office** enquiry go/no-go (`local_office_enquiries` · `officeEnquiry` meta) | ✅ |
| W7 | AConsulting **Clients** (`local_clients` · `clientStatus`) + AStudio S2e AQC handoff | ✅ |
| W8 | AConsulting **Practice** live (capacity counts · `local_practice` notes · Flush) | ✅ |
| W9 | AStudio **S2d** in-process `bbs_engine` P/Invoke (Focus engine smoke · `build-engine.cmd`) | ✅ |
| W10 | AStudio **S3** Focus Fees · Drawings · Delivery (`invoiceStatus` · `drawingRegister` · `phaseProgress`) | ✅ |
| W11 | AStudio **S4** Practice Ask ESTI → local Ollama (probe/chat · no transcript sync) | ✅ |
| W12 | AConsulting Ask ESTI mirror (Practice Ollama · capacity context) | ✅ |
| W13 | AStudio **S3e** drawing artifact ingest (`drawing` · sha256 · Bridge flush) | ✅ |
| W14 | AStudio **S5a** web chrome parity (taskbar studioNav · floating dock · clock · Ask ESTI slot) | ✅ |

### Ops-blocked (need human)

1. **S8 VPS flip** — add deploy pubkey to the droplet, then `gh workflow run s8-reopen-demos.yml -f mode=apply` (or `CONFIRM=yes bash deploy/s8-reopen-demos.sh` on the box).  
   Pubkey: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJzNk7P4spTM1FBfiiZiIa9k6asphlWNgW4lanTI04DT aorms-deploy-github-actions`  
2. **D6** — Trusted Authenticode → upload → `apply-installer-manifest.ps1 -ConfirmFlip` → release flag + rebuild. Prefer Connect first.  

Hub-portal SyncEntity allow-list ✅ · portal tenants after D6 · AQC Estimation/BBS/PM native chrome out of S12.

## Deferred

SaaS SKUs · Stripe · dual Postgres/Mongo forever · full WinUI domain split from BBSApp · wiki restore on apex · merging AStudio into Connect · cloud Hosted AI / VPS Ollama.
