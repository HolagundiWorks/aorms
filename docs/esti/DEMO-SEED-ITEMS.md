# Demo seed — item inventory

Canonical seed command:

```bash
podman exec esti-backend sh -c "cd /app/esti/backend && pnpm seed:demo"
```

Force wipe + rebuild: `SEED_DEMO_FORCE=1 pnpm seed:demo`

Implementation: `backend/src/scripts/seedDemo.ts` + `backend/src/scripts/demoStudioSeed.ts` + `backend/src/scripts/demoConsultancySeed.ts` + `backend/src/scripts/demoClientPortalSeed.ts` + `backend/src/scripts/demoContractorPortalSeed.ts`

---

## Logins

| Persona | Email | Password | Role |
|---------|-------|----------|------|
| Principal (owner) | `principal@demo.aorms.in` | `demo1234` | OWNER — full studio |
| Design lead | `lead@demo.aorms.in` | same | STAFF |
| Site architect | `site@demo.aorms.in` | same | STAFF |
| Junior architect | `junior@demo.aorms.in` | same | STAFF |
| Studio manager | `accounts@demo.aorms.in` | same | ADMIN |

Override password: `SEED_DEMO_PASSWORD` env var.

Firm profile: **Studio Sharma & Associates** (Indiranagar, Bengaluru) — shown in Studio Intelligence rail greeting.

---

## Studio Intelligence (`/`) — what the seed fills

| Rail / stage surface | Data source |
|---------------------|-------------|
| Greeting + firm name | `esti_firm` · `auth.me` |
| Today — Tasks | Open `esti_task` count |
| Today — Meetings | `esti_mom` dated today + `esti_site_visit` today |
| Today — Visits | Site visits planned today |
| Office health | Derived from zone states (client · finance · projects · team) |
| Due dates (TDS · GSTR) | Client-side calendar (not seeded) |
| Zone health row | Client approvals lag · overdue invoices · at-risk projects · team overload |
| KPIs — Pipeline / Outstanding / Collected / Ready to bill | `dashboard.financialHealth` + phase-linked invoices |
| Priorities tab | Overdue invoices · stale approvals · at-risk projects · billing-ready phases |
| Top risks | RED/YELLOW project health + HIGH client intelligence |
| Projects tab | Per-project health scores (overdue tasks, stale approvals, unbilled phases) |
| Work tab | `tasks.todayQueue` — distributed across team |
| Team tab | `dashboard.teamIntelligence` — capacity per assignee |
| Office log (Overview sidebar) | `esti_activity` stream |

---

## Clients (14)

| Client | Kind | City |
|--------|------|------|
| Sharma Residences LLP | Company | Bengaluru |
| Anita Rao | Individual | Mysuru |
| Verde Developers Pvt Ltd | Company | Bengaluru |
| Kapoor Family | Individual | Bengaluru |
| Patel Enterprises Pvt Ltd | Company | Pune |
| Diocese of Bengaluru Education Society | Company | Bengaluru |
| Priya Reddy | Individual | Panaji |
| Nexus Cowork Pvt Ltd | Company | Bengaluru |
| Sunrise Hospitality Pvt Ltd | Company | Bengaluru |
| Dr. Arvind Nair | Individual | Mangaluru |
| GreenField Industries Ltd | Company | Hosur |
| Lakeview Realty LLP | Company | Hyderabad |
| Meghana Foundation Trust | Company | Bengaluru |
| Tanvi Desai | Individual | Belagavi |

---

## Projects (14)

| # | Title | Status | Phase progress | Notes |
|---|-------|--------|----------------|-------|
| 0 | Sharma Villa — Whitefield | ACTIVE | 3 (Construction docs) | **Showcase** — overdue invoice, stale approval, site visit today, MOM today |
| 1 | Rao House — Mysuru | ACTIVE | 1 | Schematic design |
| 2 | Verde Commercial Block | ACTIVE | 2 | **Showcase** — overdue invoice, REVISIONS approval |
| 3 | Kapoor Residence — Sarjapur | ACTIVE | 2 | **Client portal showcase** — see Client portal section |
| 4 | Patel Corp HQ — Pune | ACTIVE | 2 | Interstate GST · overdue invoice |
| 5 | St. Francis School Expansion | ACTIVE | 1 | Institutional |
| 6 | Reddy Beach Retreat — Goa | ON_HOLD | 1 | CRZ context |
| 7 | Nexus Co-working — Koramangala | COMPLETE | 6 | Closed |
| 8 | Sunrise Boutique Hotel — Indiranagar | ACTIVE | 2 | Hospitality |
| 9 | Nair Wellness Clinic — Mangaluru | ACTIVE | 1 | Clinic fit-out |
| 10 | GreenField Factory Shed — Hosur | ACTIVE | 3 | Industrial |
| 11 | Lakeview Apartments — Hyderabad | PROPOSAL | 0 | Pipeline |
| 12 | Meghana Community Centre | ACTIVE | 1 | Trust project |
| 13 | Desai Villa — Belagavi | ON_HOLD | 1 | Matches won lead |

Each project includes: COA phases · fee proposal · phase-linked billing · permit · consultant engagements · spec sheet · PO · transmittal · approvals · site inspection · tasks · decisions · critical note · client log entries.

### Billing signals (finance zone)

- **Paid invoices** linked to completed phases (`esti_invoice.phase_id`).
- **Ready to bill** — current phase has no invoice yet (`dashboard.financialHealth.readyToBillPaise`).
- **Overdue ISSUED** — Sharma, Verde, Patel: `date_invoice` > 30 days ago.
- **Recent ISSUED** — other active projects for outstanding KPI.

### Approval signals (client zone)

- **SENT** approvals — some stale (>14 days) on showcase projects.
- **REVISIONS** — Sharma Villa + Verde Commercial (revision intelligence).

---

## Leads (10)

| Client name | Source | Status |
|-------------|--------|--------|
| Rohit & Meera Kapoor | Referral | NEW |
| Orchid Heights Developers | Website | CONTACTED |
| Dr. Lakshmi Prasad | Walk-in | QUALIFIED |
| Coastal Living LLP | Instagram | PROPOSAL_SENT |
| TechPark Interiors | LinkedIn | NEGOTIATION |
| Heritage Trust Mysuru | Referral | QUALIFIED |
| Aarav Builders | Tender | CONTACTED |
| Sunita & Vikram Desai | Referral | WON |
| Metro Retail Group | Cold call | LOST |
| Green Campus Initiative | Website | NEW |

Route: `/office/leads` (Leads register).

---

## Team roster (5)

| Name | Role | Salary (paise/mo) |
|------|------|-------------------|
| Vihaan Sharma | Principal Architect | 2,50,000 |
| Ananya Iyer | Design Lead | 1,35,000 |
| Rahul Menon | Site Architect | 1,10,000 |
| Kavya Nair | Junior Architect | 65,000 |
| Deepa Krishnan | Studio Manager | 85,000 |

Open tasks are distributed across the roster for **Team Intelligence** capacity signals (HEALTHY · BUSY · OVERLOADED).

Today's **attendance** marked PRESENT for all members.

**Reward points** sample events for principal, design lead, and site architect.

---

## Consultants (5) · Contractors (5)

Consultants: Structural · MEP · Landscape · Geotechnical · Interior — each engaged on projects.

Contractors: Civil · Structural · MEP · Finishes · Interior — rated vendors for site delivery demos.

---

## Today glance extras

| Type | Project | Detail |
|------|---------|--------|
| MOM (today) | Sharma Villa | Weekly site coordination |
| MOM (future) | Sharma Villa | Structural coordination call |
| Site visit (today) | Sharma Villa | Slab reinforcement inspection |
| Site visit (today) | Verde Commercial | MEP walk-through |
| Site visit (planned) | Sharma Villa | Facade mock-up review |

---

## Office activity stream (5 events)

Recent `esti_activity` rows for Sharma / Verde / Patel — invoice issued, approval sent, GFC completed, site visit planned, critical decision opened.

---

## Per-project task themes (sample)

Tasks are named with project ref suffix and span:

- GFC / schematic / permit drawings
- Site visits and construction support
- Client presentations and fee proposals
- BOQ / variation orders
- Consultant coordination

Some tasks carry `interventionRequired: true` for ESTI Pulse demos.

---

## Idempotency

| Scenario | Behaviour |
|----------|-----------|
| First run | Full seed (Studio + Consultancy spine) |
| Re-run (demo exists) | Backfill: team roster, firm profile, leads, MOMs, visits, attendance, activities, approval patches, task rebalance, consultancy demo |
| `SEED_DEMO_FORCE=1` | Wipe demo users/projects + consultancy demo rows + full re-seed |

Phase-linked billing is written on **fresh** seed only. To refresh billing signals on an old demo DB, use `SEED_DEMO_FORCE=1`.

---

## Client portal (`client@demo.aorms.in`)

Sign in at `/login?tab=portals`. Project: **Kapoor Residence — Sarjapur** (`demoClientPortalSeed.ts`).

| Portal tab / feature | Seeded rows (portal-visible statuses) |
|----------------------|----------------------------------------|
| Updates — activity | `esti_activity` · visibility **ALL** |
| Updates — approvals | **SENT** + **REVISIONS** (respond demo) |
| Updates — MoMs | **ISSUED** concept review minutes |
| Updates — submissions | CHANGE_REQUEST + FEEDBACK samples |
| Updates — revision stats | Drawing R2 with `rootId` + revision note |
| Project — stages | Phase progress 2 (fresh seed) |
| Project — tenders | **AWARDED** civil package |
| Project — site reference | Feasibility snapshot |
| Progress | **ISSUED** progress report · **ISSUED** inspection · **CONFIRMED** site visit |
| Drawings | 2–3 **READY** drawings (+ revision chain) · issued transmittal (base seed) |
| Documents | ISSUED/PAID invoices · CERTIFIED consultancy RA · AProc CERTIFIED RA + steel cert |

Re-run / backfill calls `seedDemoClientPortalExtras` (idempotent). Force wipe: `SEED_DEMO_FORCE=1`.

---

## Project tenders (firm issues · contractors bid)

| Record | Value |
|--------|-------|
| Sharma Villa civil package | OPEN · 2 invitations (Vinayaka Civil · Sairam Structural) |
| Contractor portal | `contractor@demo.aorms.in` / demo password → `/login?tab=portals` |
| Collaborator portal | `collab@demo.aorms.in` / demo password → `/login?tab=portals` (first consultant) |

Routes: Project → Tenders · Office → Tenders · contractor portal home.

## Contractor portal (`contractor@demo.aorms.in`)

Sign in at `/login?tab=portals`. Focus: **Sharma Villa** invitation (Vinayaka Civil).
Extras: `demoContractorPortalSeed.ts`.

| Feature | Seeded |
|---------|--------|
| Tender + sealed bid | OPEN civil package · invitation |
| READY drawings | Foundation plan + column schedule |
| PLANNED site visit | Joint check — plinth beam |
| CERTIFIED RA | RA Bill 01 (base seed) — Documents / Running bills dock |
| Tickets | TICKET · RFI · DRAWING_REQUEST · MEETING_REQUEST · SITE_VISIT_REQUEST · JOINT_MEASUREMENT |

ActionDock (select invitation first): Raise ticket · Site visit · Drawing · Meeting · Running bills.

---

## Consultancy spine (AORMS-Consultancy)

| Record | Value |
|--------|-------|
| Enquiry | `EQ-DEMO-001` — Apex PEB warehouse (WON) |
| Engagement | `C-DEMO-001` — Apex PEB warehouse — Whitefield structural |
| Client | Apex Precast Structures Pvt Ltd |
| Fee | Lump sum ₹18,00,000 · stages: INVOICED kickoff · **BILLABLE** schematic · PENDING GFC |
| Deliverable | `STR-CAL-001` Foundation & column schedule (DRAFT) |
| Rate card | PRINCIPAL · SENIOR_ENGINEER · ENGINEER grades |

Platform org: `engineering-demo` (CONSULTANCY) via `ensureDemoConsultancyPlatformOrg()`.

Walkthrough: [docs/holagundi/DEMO-SCRIPT.md](../holagundi/DEMO-SCRIPT.md) · [P9V-CONSULTANCY-WALKTHROUGH.md](P9V-CONSULTANCY-WALKTHROUGH.md)

---

## Related

- [DEMO-AND-HR-MODE.md](DEMO-AND-HR-MODE.md) — commands and container workflow
- [DEVELOPMENT.md](../../DEVELOPMENT.md) — dev seed (`pnpm seed` for owner account)
