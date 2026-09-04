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

## Closing philosophy
AORMS is a **unified office management system**: work and knowledge coexist in
one hub, knowledge becomes infrastructure (LXOS), growth becomes measurable.
Navigation chrome stays **header · sidebar/menu · stage** — improve within that
model.
