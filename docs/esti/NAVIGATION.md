# AORMS — Navigation Architecture (Office Hub)

**Status:** Canonical navigation IA · **Owner:** Human Centric Works (HCW) ·
**Adopted:** 2026-06-29 · **Unified nav:** 2026-09-04 (single office hub, allied
apps removed)

> This document is the **single source of truth for navigation** — where modules
> live in the shipped chrome, and naming. Where any other doc disagrees, **this
> wins**. For *what code exists today* the authority remains `frontend/src/App.tsx`
> (`nav` / `adminGroups` trees).
>
> **AORMS is one unified web app** — no per-surface hosts (`studio.aorms.in`,
> `consultancy.aorms.in`, `proc.aorms.in` are legacy and redirect to the office
> hub login). All users share the same navigation, gated only by role/capability.
>
> **Spatial model:** Carbon UI Shell (`Header`, `HeaderGlobalBar`) — nested
> sidebar/menu is a recursive `NavNode` tree (`link` | `menu`) in `App.tsx`.
> Search is a **header** action (with Alerts bell, ID card, clock, Pomodoro).

## Status legend
| Tag | Meaning |
|---|---|
| ✅ | **Built** — code exists, reachable |
| 🚧 | **Partial / rebuilding** |
| 🔲 | **Planned** |

## Shipped chrome (source of truth: `frontend/src/App.tsx` — `nav` array)

Single nav tree for every user, pruned by role/capability (`can(role, capability)`,
`ROLE_RANK`, `hrEnabled`). No host- or surface-specific branches.

| Item | Kind | Destinations | Gate |
|---|---|---|---|
| **Projects** | link | `/projects` | — |
| **Clients** | link | `/clients` | `write` |
| **Practice** | menu | Enquiries · Engagements | — |
| **Delivery** | menu | Contractors · Consultants | `write` (Consultants: rank ≥ 60) |
| **People** | menu | Teams · Performance · HR | `hrEnabled` — pruned when empty |
| **Office** | menu | **Capture:** Leads · Tenders · Proposals · **Papers:** Documents · Contracts · Letters | see below |
| **Finance** | menu | Invoices · Reconcile · Cashbook · Office Expenses · Payroll · Financial Reports | see below |

### Capability gates

| Item | Gate |
|---|---|
| **Clients** | `write` |
| **Delivery** › Contractors | `write` |
| **Delivery** › Consultants | `write` + rank ≥ 60 |
| **People** menu | `hrEnabled` — pruned when empty |
| People › Performance | `hrEnabled` + rank ≥ 60 |
| People › HR | `hrEnabled` + `hr:manage` |
| Office › Leads, Tenders | `write` |
| Office › Proposals | `fees:manage` |
| Office › Documents, Contracts, Letters | `write` |
| Finance › Invoices, Reconcile, Cashbook, Office Expenses | `invoice:manage` |
| Finance › Payroll | `hrEnabled` + `hr:manage` |
| Finance › Financial Reports | `reports:view` |

### Admin menu (footer) — `adminGroups`

| Group | Destinations | Gate |
|---|---|---|
| **Third Parties** | Consultants · Contractors (rank ≥ 60) · Vendors (rank ≥ 60) | rank ≥ 60 |
| **Library · Design** | Specification · Standard items · Rate Books (`fees:manage`) | — |
| **Library · Codes** | Compliance · Master Plans · Standards | — |
| **Library · Knowledge** | Knowledge Bank portal | — |
| **Admin** | Archived projects (`project:delete`) · Connection manager (`/ops-db`) · System (system admin only) | see items |

### Taskbar / header utilities
Studio Intelligence (`/`) · Tasks (`/tasks`) · **Search** (`/search`, Ctrl/Cmd+K) ·
Ask ESTI · Wellness · Pomodoro. Tray: clock · sync · **Help** (`/help`, Ctrl+/) ·
alerts · ID card · sign out.

### Not in taskbar (by design)
| Destination | How to reach |
|---|---|
| Studio Intelligence | `/` |
| Tasks | `/tasks` |
| Search | Top-bar search or Ctrl/Cmd+K |
| LXOS | `/lxos` |
| Ask ESTI / AI Studio | Gated (plan + rank); top-level sidebar entry when enabled |

---

## 1. Studio Intelligence ✅
Route `/` · `StudioAbstract.tsx` · `dashboard.*`.

**Groups** via `ProjectSectionNav`:

| Group | Tabs |
|---|---|
| **Focus** | Priorities |
| **Portfolio** | Projects · Work |
| **Practice** | Team (HR) · Zoning |

Alert glyphs: ● circle (stable) · ▲ triangle (watch) · ■ square (critical).

## 2. Projects ✅
Active Projects ✅ (`/projects`) → Project Details ✅ (`/projects/:id`).

**Four horizontal groups** — `ProjectSectionNav`:

| Group | Primary tabs | Nested |
|---|---|---|
| **Setup** | Overview · Brief · Settings | Brief facets; Settings → Team when HR on |
| **Design** | Measurement · Drawings & approvals · Documents · Moodboard · Lessons | Drawings · Documents · Brief use `ProjectFacetTabs` |
| **Commercial** (gated) | Estimation · Tenders · Finance | Finance → Invoices \| Purchase Orders |
| **Site** | Site · Coordination · Technical | Site / Coordination / Technical facets |

Legacy `?tab=` aliases map onto parents; optional `?facet=`.

## 3. Tasks ✅
Work hub (`/tasks`) — `ProjectSectionNav` groups:

| Group | Tabs |
|---|---|
| **Execute** | Tasks · Board · Calendar |
| **Coordinate** | Requests (`write`) · Activity |
| **Capacity** | Workload · Attendance (`hrEnabled` + `hr:manage`) |

Legacy `?tab=client-requests` / `consultant-requests` alias to Requests.

## 4. AI Studio 🚧
Plan + rank gated; top-level sidebar entry when enabled (ESTI-powered).

## 5. Library ✅ (Admin menu)
Clustered as Design · Codes · Knowledge (see Admin menu above).

## 6. People
| Module | Status | Where |
|---|---|---|
| Teams | ✅ | `/team` |
| Performance | ✅ | `/performance` |
| HR | ✅ | `/hr` |

## 7. Office · Finance
Office = Capture + Papers. Finance is a **top-level** menu (not nested under Office).

## 8. Delivery ✅
Contractors · Consultants — replaces the old AProc portfolio home; project-level
delivery (Site · Coordination · Technical bands) lives under Project workspace.

---

## Header / footer utilities

| Utility | Status | Today |
|---|---|---|
| Global Search | ✅ | Header Search + Ctrl/Cmd+K → `/search` |
| Keyboard Help | ✅ | Tray Help + Ctrl+/ → `/help` (shared `keymap`) |
| Skip to main | ✅ | `.esti-skip-link` → `#esti-main` |
| Notifications | ✅ | `AlertsBell` → `/alerts` |
| User Profile | ✅ | Footer ID card → `/account#profile` |
| Calculator | ✅ | Footer · Alt+C |

---

## Removed / superseded

- **Per-surface hosts** (`studio.aorms.in`, `consultancy.aorms.in`, `proc.aorms.in`)
  and their separate taskbar chrome — collapsed into one unified `nav` tree
  (2026-09-04 pivot). Legacy subdomains redirect to office hub `/login`.
- **Construction** (contractor ERP) — routes redirect to `/projects`. Top-level
  **Estimation** nav removed; `/estimation*` → `/projects`.

**Moodboard** lives on the project workspace tab (`/projects/:id?tab=moodboard`) —
canvas (images, pen, sticky notes) with board/item discussion. Not a top-level
sidebar entry.

**Restored / live under Project workspace:** Programme, Packages/tenders, RA
certification, BBS, Steel reconciliation, and Moodboard are project tabs, not
standalone nav pillars.

## Addendum: `web/`'s own navigation (Next.js/Supabase migration, 2026-09-06)

Everything above documents `frontend/src/App.tsx`'s nav tree — the **current
production** SPA. `web/` (the target-stack rebuild, see CLAUDE.md § Stack
migration) is additive, pre-launch code with its own route inventory built
phase-by-phase (`docs/esti/ROADMAP-CLOUD.md`), not a port of the old IA —
route names, page groupings, and even which domains exist differ enough
(e.g. `leads`/`team-members` vs. the old `teams`/`hr`) that mapping this
doc's tab/facet structure onto it 1:1 would misrepresent what's actually
built. Its sidebar (`web/components/aorms/AppShell.tsx`) is the source of
truth for its own IA — a flat 39-link list until 2026-09-06, now grouped:

> **Correction (2026-09-30) — the table below is the 2026-09-06 grouping and is
> stale.** The office hub's navigation is now defined in one place,
> [`web/lib/shell/nav-data.ts`](../../web/lib/shell/nav-data.ts) (pure data: `NAV_TOP`,
> `NAV_GROUPS`; icons stay in `AppShell.tsx`), and follows the **drawing-set sheet
> system** (HCWorks title-sheet direction): every entry has a *positional* sheet
> number — top-level `00`–`03`, groups `04`–`12`, pages inside a group `GG.NN`.
> Numbers are computed from order, never stored, so reordering the nav renumbers
> the set. The side nav is a permanent icon rail that expands on hover (no toggle).
> Current index (generated from `nav-data.ts`):
>
> | Sheet | Section | Pages (sheet no.) |
> |---|---|---|
> | 00 | **Pulse** (hub) | /pulse |
> | 01 | **Projects** | /projects |
> | 02 | **Leads** | /leads |
> | 03 | **Tasks** | /tasks |
> | 04 | **Site** | Snags (04.01) · Site Instructions (04.02) · Progress Reports (04.03) · BBS (04.04) · Milestones (04.05) · Work Packages (04.06) · Steel Certification (04.07) · RA Bills (04.08) · Approvals (04.09) |
> | 05 | **Estimation & Tech** | Rate Books (05.01) · Estimates (05.02) · Take-off (05.03) · Spec Sheets (05.04) · Drawings (05.05) · Meeting Minutes (05.06) · Document Issues (05.07) |
> | 06 | **Third Parties** | Clients (06.01) · Contractors (06.02) · Consultants (06.03) |
> | 07 | **Tender Management** | Tenders (07.01) |
> | 08 | **Office** | Proposals (08.01) · Letters (08.02) · Contracts (08.03) · Transmittals (08.04) · Purchase Orders (08.05) · Office Templates (08.06) |
> | 09 | **Accounts** | Invoices (09.01) · Financial Reports (09.02) · Office Expenses (09.03) · Reconciliation (09.04) |
> | 10 | **HR** | Team Members (10.01) · Teams (10.02) · Payslips (10.03) · Job Applications (10.04) |
> | 11 | **Knowledge Bank** | Master Plans (11.01) · Standards (11.02) · Compliance (11.03) · Spec Catalog (11.04) · Lessons Learned (11.05) · Knowledge Portal (11.06) |
> | 12 | **Admin** | Workload (12.01) · Audit Log (12.02) · Users (12.03) · Firm Settings (12.04) · Esti Devices (12.05) |
>
> Each nav page also gets a `SheetMark` above its title (`AORMS-04.03 / SITE /
> PROGRESS REPORTS`), an optional "The result" line (`PageHeader result=…`), and
> a drawing `TitleBlock` (Office · System · Section · Drawing · Sheet · Date) at
> the foot. See ROADMAP.md's 2026-09-30 sheet-system entries.

| Top-level (no group) | Group | Sub-items |
|---|---|---|
| Dashboard · Leads · Clients · Projects · Tasks | **Office** | Proposals · Letters · Contracts · Transmittals · Tenders · Purchase Orders |
| | **Finance** | Invoices · Financial Reports |
| | **Estimation & Technical** | Rate Books · Estimates · Spec Sheets · Drawings · Meeting Minutes |
| | **Delivery** | Snags · Site Instructions · Progress Reports · Milestones · Work Packages · Steel Certification · RA Bills · Contractors · Approvals |
| | **Library** | Master Plans · Standards · Compliance · Lessons Learned · Knowledge Bank |
| | **People** | Team Members · Teams · Payslips · Job Applications |
| | **Admin** | Workload · Audit Log |

Groups use Carbon `SideNavMenu`/`SideNavMenuItem`, auto-expand when the
current route is inside them, and both top-level links and sub-items use
real Next.js client-side routing (`as={NextLink}`) rather than full-page
anchor reloads. AI Runs is a header icon action (next to sign-out), not a
sidebar entry — it's a single cross-cutting log, not a domain with
sub-items. This addendum documents the grouping as of 2026-09-06; if
`web/`'s route inventory changes meaningfully, update the table above
rather than `AppShell.tsx`'s own inline comments alone.

## Closing philosophy
AORMS is a **unified office management system**: work and knowledge coexist in
one hub, knowledge becomes infrastructure (LXOS), growth becomes measurable.
Navigation chrome stays **header · sidebar/menu · stage** — improve within that
model.
