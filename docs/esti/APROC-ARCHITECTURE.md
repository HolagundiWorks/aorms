# AProc — architecture & delivery guidelines

**Status:** Canonical plan · **App:** AProc (*Accelerated Project Management*) · **Updated:** 2026-07-25  
**Owner:** Human Centric Works · **Executable names:** `AORMS_PMC` / `APROC` in `product-nomenclature.ts`

This document is the **architecture law** for the third AORMS app. Where older docs say
“PMC module removed” or “consultancy-only — no programme”, treat that as the **retired
contractor-ERP spine**. AProc is a **greenfield PMC consultancy workspace** that **reuses**
Studio / Consulting primitives and adds **owner-side governance** modules.

Companion docs:

- [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md) — naming
- [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md) — `proc.aorms.in` · `/pmc`
- [NAVIGATION.md](NAVIGATION.md) — chrome IA (AProc ribbon)
- [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) — system state (Studio)

---

## 1. Product thesis

**Who:** Indian **project management consultancies** (PMC firms) acting as the
**extended arm of the developer / owner** — schedule oversight, quality, cost
certification, and stakeholder coordination until handover.

**What AProc is:**

| Is | Is not |
| --- | --- |
| Owner-side / PMC-side governance | Contractor ERP or site labour payroll |
| Certify RA bills, steel, packages | Bid as the firm on tenders (contractor portal does bidding) |
| Master programme & client MIS | Full Primavera/MSP replacement (import/sync later) |
| Multi-project portfolio for a PMC firm | Solution-delivery / EPC operations suite |
| Same AORMS spine (tenant, licence, portals, ESTI) | Separate stack or fork of the monorepo |

**Positioning vs AStudio / AConsulting:**

| App | Firm role | Core metaphor |
| --- | --- | --- |
| **AStudio** | Architecture practice | Design + fee recovery + studio intelligence |
| **AConsulting** | Engineering consultancy | Engagements, deliverables, sign-off chains |
| **AProc** | Project management consultancy | Programme · packages · certify · report |

---

## 2. Indian market research (fit)

### 2.1 What Indian PMC firms actually do

Synthesised from Indian PMC practice (GEM Engserv, Assure, InfraLens template corpus,
FIDIC / CPWD / IS 1200 conventions):

1. **Mobilise** — charter, RACI, stakeholder register, site office checklist  
2. **Design control** — drawing register, RFI, NCR, site instructions, transmittals  
3. **Programme** — review contractor baseline (MSP/P6), track milestones, recovery schedules  
4. **Quality & HSE** — inspections, snags, HIRA, BOCW-aligned safety paperwork  
5. **Cost certification** — measurement book (IS 1200), **RA bill certification**, advances,
   retention, variations  
6. **MIS** — DPR / WPR / MPR, physical %, open snags, cashflow narrative for the client  
7. **Handover** — snag closure, as-builts, warranties  

### 2.2 Tools in the market today

| Layer | Typical tools in India | AProc stance |
| --- | --- | --- |
| Scheduling | **Primavera P6**, **MS Project** | Do **not** rebuild CPM. Import milestones / S-curve later; own a **governance programme** |
| Field / PMC SaaS | Site Setu, SuperWise, FalconBrick, ePMC | Compete on **consultancy OS** (fees + cert + portals + ESTI), not labour apps |
| Global CM | Procore, Autodesk Build | Too contractor-heavy / USD pricing for mid-size Indian PMCs |
| Spreadsheets | Excel DPR, MB, RA | Primary displacement target for mid-size PMCs (5–80 people) |
| Accounts | Tally / Busy / ERP | Keep GST invoices for **PMC professional fees**; contractor ledgers via certification |

### 2.3 Differentiator for AORMS

Mid-size Indian PMCs lose time stitching **WhatsApp → Excel → PDF packs** for clients.
AProc wins if it:

1. Puts **certification + MIS + stakeholders** on one living project record  
2. Reuses **AStudio site supervision** (visits, instructions, inspections, drawings)  
3. Reuses **AConsulting governance patterns** (phase gates, R&O, engagement discipline)  
4. Leaves **P6/MSP** as the planner’s tool of record until a deliberate import wave  
5. Ships **GST fee billing** for the PMC’s own services (already on the spine)

**ICP (first):** Indian PMC / project management consultancies, ~5–40 staff, 3–25
active client sites, residential/commercial/institutional — not mega-infra EPCs that
live in P6 EPPM.

---

## 3. Architecture principles

### P1 — Reuse before invent

Prefer existing namespaces and UI. New tables only when the domain is truly PMC-side
governance (packages, certification decisions, master programme milestones).

### P2 — Certify, don’t execute as contractor

Payment certification, package oversight, and site checks are **PMC decisions**.
Contractor bid submission stays on the **contractor portal**. Do not restore the
2026-06 contractor-ERP spine (`0117` / `0106` teardown) as-is.

### P3 — Workspace profile, not a fork

`hlp_organization.workspace_type = PMC` routes chrome (`pmcNav`, `/pmc`, `proc.aorms.in`).
Same Fastify + tRPC + Drizzle + React SPA.

### P4 — Depth encodes importance (HCW-UI-Kit)

AProc uses the same Rail · Stage · Taskbar · ActionDock model. No parallel design system.

### P5 — India-native artefacts

Prefer IS 1200 / CPWD / FIDIC-aligned labels in UI copy (RA bill, MB, snag, site
instruction, DPR/MPR). Avoid US-only jargon (e.g. “pay app”) as primary labels.

### P6 — Import schedule later

Wave 1 does **not** include XER/XML P6 parsers. Milestone register + % complete is enough.

---

## 4. Reuse map (what already exists)

### 4.1 Reuse as-is (wire into AProc chrome)

| Capability | Backend | Frontend today | AProc use |
| --- | --- | --- | --- |
| Projects / phases | `projectOffice`, `phases` | `Projects`, `ProjectDetail` | Portfolio + project shell |
| Site visits | `siteVisits` | Delivery › Site Progress | Field oversight |
| Site instructions | `siteInstructions` | Communications log | SI register |
| Inspections | `inspections` | Documents | Quality packs |
| Snags | `snags` | **API only → wire UI** | Snag register |
| Progress reports | `progressReports` | **API only → wire UI** | MPR / period MIS |
| Phase live stages | `phaseProgress` | **API only → wire UI** | CA / handover stages |
| Drawings / tx / approvals | `drawings`, `transmittals`, `approvals` | Drawings tab | Design control |
| MoM | `moms` | Delivery › Minutes | Progress meetings |
| Contractors / consultants | `contractors`, `consultants` | Third parties | Stakeholders |
| Client / site / collab portals | `portal`, site, collab | Portal routes | External access |
| PMC fee billing | `proposals`, `invoices` | Office / Finance | Bill the developer for PMC fees |
| Precon R&O / gates | `projectPrecon` | Project precon panel | Pre-construction governance |
| Measurement / rate books | `measurement`, `estimates`, `rateBooks` | Project tabs | Advisory BOQ (not RA cert yet) |

### 4.2 Patterns to mirror (AConsulting)

| Pattern | Source | AProc analogue |
| --- | --- | --- |
| Enquiry → engagement | Consultancy enquiries / engagements | **Opportunity → appointment** (PMC mandate) |
| Phase gates / check categories | `consultancy` + precon | Package / certification gates |
| Living record workspace | `ConsultancyEngagements` | Project certification workspace |

### 4.3 Explicitly do **not** revive as ERP

Dropped by `0106` / `0117` / `0211` — if rebuilt, redesign for **certification**:

- Contractor CPM schedule tables  
- Firm-as-bidder tender desk  
- Work-package execution + contractor running-bill spine as owned cost ERP  
- GRN / procurement forecast as contractor materials ERP  

---

## 5. Target domain model (AProc)

```text
PMC firm (workspace_type = PMC)
  └── Client (developer / owner)          [reuse clients]
        └── Project                       [reuse projects]
              ├── MasterProgramme         [NEW — milestones, baseline ref, %]
              ├── Package[]               [NEW — tender/package oversight]
              │     └── BidRound / Award  [NEW — owner-side; contractor portal bids]
              ├── Certification           [NEW envelope]
              │     ├── RaBillCert[]      [NEW — certify contractor interim bills]
              │     └── SteelCert[]       [NEW — optional; after BBS lands on spine]
              ├── Site supervision        [REUSE snags, SI, visits, inspections]
              ├── ProgressReport[]        [REUSE — wire UI]
              ├── Drawings / RFI trail    [REUSE drawings + communications]
              └── Stakeholders            [REUSE contractors, consultants, portals]
```

Money for **PMC professional fees** stays on `proposals` / `invoices` (paise).  
Contractor payable amounts on RA certs are **certified figures** (paise), not the PMC’s
own revenue unless the firm also invoices the client for reimbursables (out of scope W1).

---

## 6. Information architecture (chrome)

### Ribbon (`pmcNav` — `App.tsx`)

| Item | Path | Status |
| --- | --- | --- |
| **Home** | `/pmc` | ✅ preview → 🚧 live KPIs |
| **Projects** | `/projects` | ✅ reuse |
| **Clients** | `/clients` | ✅ reuse |
| **Delivery** | menu | Contractors · Consultants · *(later: Packages)* |
| **Certification** | menu | *(W2)* RA cert · Steel cert |
| **Office** | menu | Invoices · Financial Reports · Proposals |

### Project Detail — Delivery tab (shared; PMC-weighted)

| Sub-tab | Module | Wave |
| --- | --- | --- |
| Site Progress | `siteVisits` | ✅ |
| Communications | SI + logs | ✅ |
| Minutes | MoM | ✅ |
| **Snags** | `snags` | **W1** |
| **Progress reports** | `progressReports` | **W1** |
| Programme | master milestones | **W2** ✅ |
| Packages | package register | **W2** ✅ |
| RA certification | cert workflow | **W3** ✅ |

Studio and Consulting keep the same Delivery panel — snags/MPR help architects too.

---

## 7. Delivery waves

### Wave 0 — Platform chrome ✅ (PR #42)

Workspace type `PMC`, nomenclature, `proc.aorms.in`, `/pmc` home shell, landing card.

### Wave 1 — Site governance UI (this plan’s first build)

**Goal:** Make dormant PMC APIs usable; home shows live portfolio signal.

| # | Item | Reuse | Status |
|---|---|---|---|
| W1.1 | Architecture guidelines (this doc) | — | ✅ |
| W1.2 | `ProjectSnags` + Delivery sub-tab | `snags` API | ✅ |
| W1.3 | `ProjectProgressReports` + Delivery sub-tab | `progressReports` API | ✅ |
| W1.4 | AProc home — open projects + open snag counts | `projectOffice` / `snags.portfolioOpen` | ✅ |
| W1.5 | Expand `pmcNav` + `NAVIGATION.md` AProc section | chrome | ✅ |
| W1.6 | Wire `phaseProgress` into Delivery or Brief (optional stretch) | `phaseProgress` | 🔲 |

### Wave 2 — Programme & packages (greenfield)

| # | Item | Notes | Status |
|---|---|---|---|
| W2.1 | `esti_pmc_milestone` — master programme (not CPM) | Client reporting · `pmcMilestones` | ✅ |
| W2.2 | `esti_pmc_package` — package register + status | Tender oversight · `pmcPackages` | ✅ |
| W2.3 | Owner-side tender invitation → contractor portal bids | Align with Bid desk PR if merged | 🔲 |
| W2.4 | AProc home tiles (delayed milestones · open packages) | `/pmc` | ✅ |

### Wave 3 — Certification

| # | Item | Notes | Status |
|---|---|---|---|
| W3.1 | RA bill **certification** (`esti_pmc_ra_bill` / lines) | Draft → site checked → certified → sent → closed | ✅ |
| W3.2 | Deductions: advance recovery, retention, GST/TDS notes | Cert narrative; not full tax engine | ✅ |
| W3.3 | Steel / BBS certification when BBS spine is on `main` | Depends on BBS/steel PRs | 🔲 |
| W3.4 | Client portal: issued progress reports + certified RA summaries | `portal.issuedProgressReports` / `certifiedRaBills` | ✅ |

### Wave 4 — Integrations & polish

| # | Item | Status |
|---|---|---|
| W4.1 | MSP/P6 milestone import (CSV first, XER later) | ✅ CSV · XER deferred |
| W4.2 | Branded MPR / RA cert PDF packs (worker `render_pdf`) | ✅ MPR existed · RA cert added |
| W4.3 | Portfolio digests for PMC partners (email) | 🔲 |
| W4.4 | ESTI: “Ask ESTI” over snags + progress + cert notes | 🔲 (APIs live for RAG later) |

---

## 8. Guidelines for implementers

1. **Import product constants** — never hard-code “AProc” / “AORMS-PMC” in UI.  
2. **Capabilities** — reuse `write`, `invoice:manage`, `fees:manage`, `reports:view`. Add
   `pmc:certify` only when Wave 3 needs a distinct gate.  
3. **Money** — integer paise; `formatINR`.  
4. **Do not edit** `Projects.tsx` / `Clients.tsx` unless required (parallel WIP).  
5. **Host routing** — `surface === "pmc"` or path `/pmc*`; footer home → `/pmc`.  
6. **Tests** — contract schemas for new entities; router unit tests for cert state machine.  
7. **Docs sync** — update this file’s wave checkboxes + `ROADMAP.md` when a wave ships.  
8. **Refuse list** — labour attendance for gangs, plant hire ERP, contractor payroll,
   full P6 engine, multi-industry PM outside AEC/PMC.

---

## 9. Success metrics (product)

| Metric | Target signal |
| --- | --- |
| Time to issue MPR | Draft → PDF without Excel paste |
| Snag closure visibility | Open snags on home + project |
| Cert cycle | RA cert draft → certified in-app |
| Displacement | PMC firm stops parallel Excel snag + MPR trackers |

---

## 10. Open decisions

| Topic | Recommendation | Status |
| --- | --- | --- |
| Separate `pmc:` capabilities | Defer to W3 | Open |
| RA cert vs reusing Estimation BOQ lines | Separate cert entity linked to package | Decided |
| Share Delivery snags with Studio | Yes — one panel | Decided |
| P6 sync | W4 | Deferred |
| Demo firm `workspace_type=PMC` | Seed in demo platform | Planned W1.4+ |

---

## Precedence

1. This file — AProc architecture & waves  
2. [AORMS-PLATFORM-NOMENCLATURE.md](AORMS-PLATFORM-NOMENCLATURE.md) — names  
3. [NAVIGATION.md](NAVIGATION.md) — chrome  
4. [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) — shared spine state  
