# AORMS — Market fit brief

**Status:** Canonical GTM + product priority · **Updated:** 2026-08-08  
**Owner:** Human Centric Works (HCW)

Companion to [ROADMAP.md](ROADMAP.md) (suite soft launch · next **S8**) and
[PRODUCT-VISION.md](PRODUCT-VISION.md) (boundary). Suite law:
[AORMS-SUITE.md](AORMS-SUITE.md) · [LOCAL-FIRST.md](LOCAL-FIRST.md).

This file records **market research conclusions** and GTM priorities for paying
firms. Prefer suite wording over older “web parity / Standard licence” lines in
campaign drafts until those files are rewritten.

**Delivery status:** Historical market-fit Waves **W1–W3 shipped**; **W4 deferred**.
**Suite soft launch (S6–S7):** landing + blog live; apex login and installers
Coming soon. Public signed installers = **D6** ops, not an open market-fit wave.

---

## 1. ICP & category

| | |
|---|---|
| **Buyer** | Indian AEC **advisory** firms — architecture studios and engineering consultancies (structural / MEP / civil), roughly **5–50 people** |
| **Not for** | Contractors, PMC portfolios, construction execution ERP, warehouses / RA bills / **contractor** tenders |
| **Category** | A/E practice ops / light PSA — not CAD, not construction PM, not generic ERP |
| **JTBD** | Replace WhatsApp + email + Excel + generic PM + ad-hoc GST with one **office operating record**: fees → delivery → revisions → site supervision → invoices → portals |

**Wedge line:** *Operating system for AEC consultancies in India* — fee recovery,
revision control, site supervision, and GST on one spine.

---

## 2. Gaps already closed

| Market gap | AORMS answer |
|---|---|
| Generic PM ignores COA fees, GST/TDS, FY April | India-first money (paise), proposals, invoices, reconcile |
| Global A/E PSA ignores Indian site supervision | Drawings, transmittals, snags, instructions, progress (architect-side) |
| “AI for architects” = chat wrappers | Dual-tier: **ESTI** (validated firm data) + **EOMS** (codes / knowledge bank) |
| Architecture tools ignore engineering (and vice versa) | Suite: **AStudio** + **AConsulting** + AQC technical apps |
| Scope creep into construction ERP | Explicit teardown — **advise, don’t deliver** (PMC via AProc/AQC PM) |
| Fragmented external access | Firm-branded portals (published data only) |
| Desktop install friction | Local-first desktop suite · OSS for now · signed installers (D6) |

---

## 3. Competitive snapshot

| Type | Examples | They win | We win |
|---|---|---|---|
| Indian AEC ERP | ArchiO | Breadth, SMB familiarity | Advisory-only focus, Studio Intelligence, dual AI |
| Finance-only | UpLabs | Clean money UX | Full delivery + portals + R&O + revisions |
| AI toolkits | Studio Matrx ArchitectAI | Bylaw AI, free tools, brand | System of record + firm memory + eng app |
| Global PSA | Monograph, Ajera, Projectworks | Time → profitability polish | India GST/COA, site supervision, EOMS/ESTI |
| Inertia | Excel / WhatsApp / Notion | Zero switching cost | Traceability, invoices, portals, audit |

Biggest competitor: **inertia**, not any single SaaS.

---

## 4. Viability

**Viable as** a focused vertical SaaS for Indian AEC consultancies.  
**Not viable as** a horizontal AI/PM platform.

Path: land **Studio** (architects) → expand **Consultancy** (engineers) → upsell
cloud storage + multi-company licensing. (AI is unmetered on **desktop** —
local Ollama / Foundry Local — a capability, not a cloud usage upsell. No hub
Ollama.)

Risks to manage: GTM consistency, time→WIP UX depth vs global PSA, reference
customers, “boring reliability” (invoice PDF / GST) before ESTI storytelling.

---

## 5. Market-fit backlog (priority)

Implementation status lives on [ROADMAP.md](ROADMAP.md) § Market fit.

### M1 — Trust & money (must-have)
1. Flawless invoice / GST / fee-stage path for first paying firms  
2. **Project fee recovery** visibility (fee vs invoiced vs outstanding) — Studio KPIs ✅  
3. Onboarding: first invoice in ~30 minutes (demo seed + guided empty states) ✅  

### M2 — Time & capacity
1. Staff time → WIP → fee stages (Consultancy already stronger; Studio light)  
2. Capacity / overload on Studio Intelligence ✅  

### M3 — Client-facing proof
1. Polished **client portal** empty states + pending-approval CTAs ✅  
2. Digests / notifications that pull decisions back into the record ✅  

### M4 — India differentiation
1. COA fee + GST as default excellence  
2. Pre-con R&O + revision intelligence as the “why not Excel” story  
3. Dense EOMS packs later — do not lead with bylaw-AI until catalog depth exists

### M5 — GTM packaging
1. Consistent public story (no BBS / PMC / tenders / “launch gated” leftovers) ✅  
2. Landing **#pricing** from [PLANS-AND-TIERS.md](PLANS-AND-TIERS.md) ✅  
3. ICP one-pager + Holagundi SOP as proof ✅  
4. Ask ESTI / wiki-knowledge scrub for removed modules ✅  

### M6 — Consultancy go-to-market
1. Reference eng firms + 15-minute engagement→invoice demo ✅  
2. Workspace chrome that does not feel like “Studio with extra URLs” ✅  

### M7 — Integrations (phase 2) — deferred
Tally / Zoho Books deepen · Drive for drawings · WhatsApp capture — not day-one.

### Explicitly defer
Raw cloud DB clients / third-party desktop ERP shells · **contractor** labour ERP /
full P6 CPM · “AI that designs the building.” · W4 integrations.

**In scope (shipped):** project **Tenders** — firm issues; contractors bid in portal
(`/office/tenders`, Project → Tenders).

**In scope (local-first):** desktop suite + online portals
([LOCAL-FIRST.md](LOCAL-FIRST.md) · [AORMS-SUITE.md](AORMS-SUITE.md)). Soft launch
keeps installers Coming soon; signed URL on `/downloads` is **D6**.

### M8 — Local-first GTM → suite soft launch

Align public story with suite product law. Checklist:

| # | Item | Status |
|---|---|---|
| 1 | Product / blog / FAQ: suite · local-first · OSS (no web-only ERP) | ✅ 2026-08-08 |
| 2 | `/downloads` honest Coming soon / `web_fallback` | ✅ soft launch |
| 3 | Update manifests + env fill ([WEB-PORTAL.md](WEB-PORTAL.md)) | ✅ prep |
| 4 | Live signed installer URL + sha256 (managers + AQC) | 🔲 D6 |
| 5 | LF6 Figma ↔ kit token sync notes / stub ([FIGMA-TOKEN-SYNC.md](FIGMA-TOKEN-SYNC.md)) | ✅ stub |
| 6 | Pure neumorphism marketing frame + blog/SEO scrub | ✅ |
| 7 | Soft-launch gate `VITE_MARKETING_ONLY` + VPS landing profile | ✅ S6–S7 |

Portal fill fields: [WEB-PORTAL.md](WEB-PORTAL.md). Next implementation waves:
[ROADMAP.md](ROADMAP.md) S8–S10 · D6.

---

## 6. Waves (shipped)

| Wave | Items | Status |
|---|---|---|
| **W1** | Vendors gate · SEO scrub · wiki-knowledge · landing pricing · portal empty · fee recovery % | ✅ |
| **W2** | First-invoice checklist · capacity strip · Alerts digests | ✅ |
| **W3** | Consultancy chrome · demo seed · DEMO-SCRIPT + ICP-ONE-PAGER | ✅ |
| **W4** | Tally / Drive / WhatsApp | **Deferred** |

See [ROADMAP.md](ROADMAP.md) for per-item checklists.
