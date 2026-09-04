# AORMS — Market fit brief

**Status:** Canonical GTM + product priority · **Updated:** 2026-09-04
(web-only office hub pivot; **pure architectural consultancy pivot**, EOMS
retired)  
**Owner:** Human Centric Works (HCW)

Companion to [ROADMAP-CLOUD.md](ROADMAP-CLOUD.md) (office hub soft launch · next **S8**) and
[AORMS-OFFICE-SYSTEM.md](AORMS-OFFICE-SYSTEM.md) (product definition).

**Delivery status:** Market-fit Waves **W1–W3 shipped**; **W4 integrations deferred**;
**web-only pivot** superseded the desktop/local-first GTM (M8, below) — the product
is now a single cloud office hub, no installers. **2026-09 pivot:** AORMS narrowed
to **pure architectural consultancy** — the engineering-consultancy angle (dual
architecture+engineering positioning below, the `consultancy` module) and **EOMS**
(external knowledge-bank API) are retired; §§1–4 below are updated to reflect this,
§§5–6 (backlog/waves) are kept as historical record with pivot notes inline where
an item references what's now removed.

---

## 1. ICP & category

| | |
|---|---|
| **Buyer** | Indian **architecture** consultancy firms, roughly **5–50 people** |
| **Not for** | Engineering consultancies, contractors, PMC portfolios, construction execution ERP, warehouses / RA bills / **contractor** tenders |
| **Category** | Architecture practice ops / light PSA — not CAD, not construction PM, not generic ERP |
| **JTBD** | Replace WhatsApp + email + Excel + generic PM + ad-hoc GST with one **office operating record**: fees → delivery → revisions → site supervision → invoices → portals |

**Wedge line:** *Operating system for architecture consultancies in India* — fee
recovery, revision control, site supervision, and GST on one spine.

---

## 2. Gaps already closed

| Market gap | AORMS answer |
|---|---|
| Generic PM ignores COA fees, GST/TDS, FY April | India-first money (paise), proposals, invoices, reconcile |
| Global architecture PSA ignores Indian site supervision | Drawings, transmittals, snags, instructions, progress |
| “AI for architects” = chat wrappers | **ESTI** — built-in AI agent answering only from the firm's own validated repositories |
| Scope creep into construction ERP | Explicit teardown — **advise, don’t deliver** |
| Fragmented external access | Client / consultant / contractor / site portals |
| Install / per-app login friction | Web-only, one login, no installers · one Standard licence · storage + AI usage |

---

## 3. Competitive snapshot

| Type | Examples | They win | We win |
|---|---|---|---|
| Indian architecture ERP | ArchiO | Breadth, SMB familiarity | Advisory-only focus, Studio Intelligence, ESTI |
| Finance-only | UpLabs | Clean money UX | Full delivery + portals + R&O + revisions |
| AI toolkits | Studio Matrx ArchitectAI | Bylaw AI, free tools, brand | System of record + firm memory |
| Global PSA | Monograph, Ajera, Projectworks | Time → profitability polish | India GST/COA, site supervision, ESTI |
| Inertia | Excel / WhatsApp / Notion | Zero switching cost | Traceability, invoices, portals, audit |

Biggest competitor: **inertia**, not any single SaaS.

---

## 4. Viability

**Viable as** a focused vertical SaaS for Indian architecture consultancies.  
**Not viable as** a horizontal AI/PM platform, and not as a multi-discipline
AEC platform — engineering consultancies are explicitly out of scope (2026-09
pivot).

Path: land architecture firms → deepen within architecture (more modules,
larger firms) → upsell cloud storage + multi-company licensing. (AI is
unmetered and built into the hub — a capability, not a usage upsell.)

Risks to manage: GTM consistency, time→WIP UX depth vs global PSA, reference
customers, “boring reliability” (invoice PDF / GST) before ESTI storytelling.

---

## 5. Market-fit backlog (priority)

Implementation status lives on [ROADMAP-CLOUD.md](ROADMAP-CLOUD.md) (what's
live) and [ROADMAP-LOCAL.md](ROADMAP-LOCAL.md) (engineering in progress).

### M1 — Trust & money (must-have)
1. Flawless invoice / GST / fee-stage path for first paying firms  
2. **Project fee recovery** visibility (fee vs invoiced vs outstanding) — Studio KPIs ✅  
3. Onboarding: first invoice in ~30 minutes (demo seed + guided empty states) ✅  

### M2 — Time & capacity
1. Staff time → WIP → fee stages  
2. Capacity / overload on Studio Intelligence ✅  

### M3 — Client-facing proof
1. Polished **client portal** empty states + pending-approval CTAs ✅  
2. Digests / notifications that pull decisions back into the record ✅  

### M4 — India differentiation
1. COA fee + GST as default excellence  
2. Pre-con R&O + revision intelligence as the “why not Excel” story  

### M5 — GTM packaging
1. Consistent public story (no BBS / PMC / tenders / “launch gated” leftovers) ✅  
2. Landing **#pricing** from PLANS-AND-TIERS.md ✅  
3. ICP one-pager + Holagundi SOP as proof ✅  
4. Ask ESTI / wiki-knowledge scrub for removed modules ✅  

### M6 — Consultancy go-to-market — ❌ retired (2026-09 pivot)
Historical: engineering-firm GTM (reference eng firms, engagement→invoice demo,
workspace chrome parity) was executed under the dual architecture+engineering
positioning. Retired along with the `consultancy` module — AORMS is pure
architectural consultancy now; no engineering-firm GTM track.

### M7 — Integrations (phase 2) — deferred
Tally / Zoho Books deepen · Drive for drawings · WhatsApp capture — not day-one.

### Explicitly defer
Raw cloud DB clients / third-party desktop ERP shells · **contractor** labour ERP /
full P6 CPM · “AI that designs the building.” · W4 integrations.

**In scope (shipped):** project **Tenders** — firm issues; contractors bid in portal
(`/office/tenders`, Project → Tenders).

### M8 — Web-only GTM (superseded desktop/local-first GTM)

**2026-09-04 pivot:** AORMS dropped the desktop-preferred / local-first product
law entirely. There is no installer, no signed download, no desktop node. The
prior M8 checklist (desktop manifests, signed installer URLs, `/downloads`
installer CTAs) is retired — `/downloads` now redirects straight to `/login`.
Public story is simply: **one web app, sign in, start working.**

---

## 6. Waves (shipped)

| Wave | Items | Status |
|---|---|---|
| **W1** | Vendors gate · SEO scrub · wiki-knowledge · landing pricing · portal empty · fee recovery % | ✅ |
| **W2** | First-invoice checklist · capacity strip · Alerts digests | ✅ |
| **W3** | Consultancy chrome · demo seed · DEMO-SCRIPT + ICP-ONE-PAGER | ✅ |
| **W4** | Tally / Drive / WhatsApp | **Deferred** |

See [ROADMAP.md](ROADMAP.md) for per-item checklists.
