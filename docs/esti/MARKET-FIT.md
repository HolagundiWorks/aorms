# AORMS — Market fit brief

**Status:** Canonical GTM + product priority · **Updated:** 2026-08-05  
**Owner:** Human Centric Works (HCW)

Companion to [ROADMAP.md](ROADMAP.md), [WEB-PORTAL.md](WEB-PORTAL.md),
[AORMS-ECOSYSTEM-ARCHITECTURE.md](AORMS-ECOSYSTEM-ARCHITECTURE.md).

**Delivery status:** Market-fit Waves **W1–W3 shipped**; **W4 integrations deferred**.
**M8** (portal + local-first GTM) **in progress**.

---

## 1. ICP & category

| | |
|---|---|
| **Buyer** | Indian AEC firms — architecture studios, engineering consultancies, and construction QA / drafting teams (roughly **5–50 people**) |
| **Not for** | Generic contractor labour ERP, full P6 CPM replacement, horizontal AI chat wrappers |
| **Category** | Unified AEC platform — portal + desktop apps + ShilpiDB |
| **JTBD** | One portal for account/licence/download; desktop apps for Studio, Consultancy, AQC, AADT on shared engineering data |

**Wedge line:** *One portal. Four apps. One engineering truth (ShilpiDB).*

---

## 2. Gaps already closed

| Market gap | AORMS answer |
|---|---|
| Generic PM ignores COA fees, GST/TDS, FY April | India-first money (paise), proposals, invoices, reconcile |
| Global A/E PSA ignores Indian site supervision | Drawings, transmittals, snags, instructions, progress |
| “AI for architects” = chat wrappers | **ESTI** + **EOMS** + **ShilpiDB** geometry intelligence |
| Architecture tools ignore engineering | Same spine: **AStudio** + **AConsulting** |
| Fragmented external access | Client / consultant / contractor / site portals |
| No single place for licence + installers | **AORMS Web Portal** (`aorms.in`) — accounts, licensing, `/downloads` |
| Construction QA / AI CAD orphaned | **AQC** + **AADT** sibling repos linked from portal |

---

## 3. Competitive snapshot

| Type | Examples | They win | We win |
|---|---|---|---|
| Indian AEC ERP | ArchiO | Breadth, SMB familiarity | Advisory + QA + drafting ecosystem, dual AI, ShilpiDB |
| Finance-only | UpLabs | Clean money UX | Full delivery + portals + R&O + revisions |
| AI toolkits | Studio Matrx ArchitectAI | Bylaw AI, free tools | System of record + firm memory + desktop apps |
| Global PSA | Monograph, Ajera | Time → profitability | India GST/COA, portal licensing, EOMS/ESTI |
| Inertia | Excel / WhatsApp / Notion | Zero switching cost | Traceability, invoices, portals, audit |

Biggest competitor: **inertia**, not any single SaaS.

---

## 4. Viability

**Viable as** a focused AEC platform (portal + apps) for Indian practices.  
**Not viable as** a horizontal AI/PM platform.

Path: land **Studio** → expand **Consultancy** → **AQC** / **AADT** downloads →
upsell storage / hosted AI + multi-company licensing.

---

## 5. Market-fit backlog (priority)

Implementation status: [ROADMAP.md](ROADMAP.md).

### M1–M7 — prior waves

M1–M6 largely shipped (see ROADMAP W1–W3). M7 integrations **deferred**.

### M8 — Portal + local-first GTM (active)

1. Portal-first public story (accounts · licensing · `/downloads`) ✅ WP0–WP4  
2. Scrub contradictory **web-only** / “no desktop” claims ✅  
3. Desktop preferred + web parity copy ([LOCAL-FIRST.md](LOCAL-FIRST.md)) ✅ blogs  
4. Point Studio/Consultancy download URLs at signed installers when LF4 publishes 🔲 *(SPA/bind ready — [MORNING-TEST-LF4.md](MORNING-TEST-LF4.md))*  
5. Do **not** promise separate Studio/Consultancy GitHub apps until [DESKTOP-REPOS.md](DESKTOP-REPOS.md) gate  

### Explicitly defer

- Stripe auto-billing  
- W4 integrations (Tally / Drive / WhatsApp)  
- Linux/macOS installers  
- Extracting Studio/Consultancy **code** from esti before LF4  

**In scope:** firm-issued **Tenders**, project **BBS** / steel recon (AQC web spine),
portal downloads for AQC (live) and other apps as packaging ships.

---

## 6. Waves

| Wave | Items | Status |
|---|---|---|
| **W1–W3** | GTM scrub · portal polish · fee recovery · consultancy chrome | ✅ |
| **W4** | Tally / Drive / WhatsApp | **Deferred** |
| **M8** | Portal + local-first GTM | **Active** |

See [ROADMAP.md](ROADMAP.md) · [WEB-PORTAL.md](WEB-PORTAL.md).
