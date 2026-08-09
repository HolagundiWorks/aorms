# AORMS — Navigation Architecture (Canonical V3)

**Status:** Canonical navigation IA · **Owner:** Holagundi Consulting Works ·
**Adopted:** 2026-06-29 · **Shell sync:** 2026-08-09 (suite-wide groups)

> This document is the **single source of truth for navigation** — where modules
> live in the shipped chrome, and naming. Where any other doc disagrees, **this
> wins**. For *what code exists today* the authority remains
> [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) § "System state".
>
> **AORMS apps:** AStudio · AConsulting · **AProc**.
>
> **Spatial model (HCW-UI-Kit):** soft **ribbon** (top — brand · search · status) ·
> **stage** (full width) · **ActionDock** · soft **taskbar footer** (module nav) ·
> **AnalogueClock**. **Left rail retired.** Canon: [PAGE-STRUCTURE.md](PAGE-STRUCTURE.md).

## Status legend
| Tag | Meaning |
|---|---|
| ✅ | **Built** — code exists, reachable in its V3 home |
| 🚧 | **Partial / rebuilding** |
| 🔲 | **Planned** |

## Shipped chrome (source of truth: `frontend/src/App.tsx`)

Module nav lives in the **footer taskbar** (`RibbonNavCluster`). Top bar is brand ·
search · health/dues · greeting · alerts.

### AStudio (`studio.aorms.in`)

| Item | Kind | Destinations |
|---|---|---|
| **Projects** | link | `/projects` |
| **Clients** | link | `/clients` (`write`) |
| **People** | menu | Teams · Performance · HR |
| **Office** | menu | **Capture:** Leads · Tenders · Proposals · **Papers:** Documents · Contracts · Letters |
| **Finance** | menu | Invoices · Reconcile · Cashbook · Expenses · Payroll · Financial Reports |

### AConsulting (`consultancy.aorms.in`)

**Capacity:** ≤5 primary peers. People and Library/References live under Admin (not concurrent taskbar chrome).

| Item | Kind | Destinations |
|---|---|---|
| **Practice** | menu | Enquiries · Engagements |
| **Clients** | link | `/clients` (`write`) |
| **Projects** | link | `/projects` |
| **Office** | menu | **Capture:** Leads · Tenders · Proposals · **Papers:** Documents · Contracts · Letters |
| **Finance** | menu | same Finance menu as Studio |

Footer home on consultancy opens Enquiries. Sign in with `principal@demo.aorms.in` (same demo firm; Account Hub / host selects AConsulting).

### AProc (`proc.aorms.in` / `/pmc`)

| Item | Kind | Destinations |
|---|---|---|
| **Home** | link | `/pmc` — portfolio KPIs · digest · pillars |
| **Projects** | link | `/projects` — Site · Coordination · Technical bands |
| **Clients** | link | `/clients` (`write`) |
| **Delivery** | menu | Contractors · Consultants |
| **People** | menu | Teams · Performance |
| **Finance** | menu | Invoices · Reconcile · Cashbook · Expenses · Payroll · Reports |

Footer home on PMC opens `/pmc`.

### Capability gates

| Item | Gate |
|---|---|
| **Clients** | `write` |
| **People** menu | `hrEnabled` — pruned when empty |
| People › Performance | `hrEnabled` + rank ≥ 60 |
| People › HR | `hrEnabled` + `hr:manage` |
| Office › Leads, Tenders, Documents, Contracts, Letters | `write` |
| Office › Proposals | `fees:manage` |
| Finance › Invoices, Reconcile, Cashbook, Expenses | `invoice:manage` |
| Finance › Payroll | `hrEnabled` + `hr:manage` |
| Finance › Financial Reports | `reports:view` |

### Admin menu (footer) — `adminGroups`

| Group | Destinations |
|---|---|
| **Third Parties** | Consultants · Contractors · Vendors |
| **Library · Design** | Specification · Standard items · Rate Books |
| **Library · Codes** | Compliance · Master Plans · Standards |
| **Library · Knowledge** | Knowledge Bank portal |
| **Admin** | Archived projects · Connection manager (`/ops-db`) · System |

### Taskbar footer (chrome)
LEFT wellness · calculator · CENTER module nav + Admin · RIGHT sync (desktop) · sign out.
Top bar: search · health/dues · greeting → `/account` · AlertsBell.
Studio Intelligence `/` · Tasks `/tasks` · Help `/help` are stage destinations (search/help chords).

### Not in taskbar (by design)
| Destination | How to reach |
|---|---|
| Studio Intelligence | `/` on studio host |
| Tasks | `/tasks` |
| Search | Top-bar search or Ctrl/Cmd+K |
| LXOS | `/lxos` |
| Ask ESTI / AI Studio | Desktop managers only — not this SPA |

---

## 1. Studio Intelligence ✅
Route `/` · `StudioAbstract.tsx` · `dashboard.*`.

**Groups (2026-08-09)** via `ProjectSectionNav`:

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
| **Design** | Measurement · Drawings & approvals · Documents · Moodboard · Lessons | Drawings · Documents · Brief use `ProjectFacetTabs` (MUI) |
| **Commercial** (gated) | Estimation · Tenders · Finance | Finance → Invoices \| Purchase Orders |
| **Site** | Site · Coordination · Technical | Site / Coordination / Technical MUI facets |

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
Not in this SPA (desktop managers).

## 5. Library ✅ (Admin menu)
Clustered as Design · Codes · Knowledge (see Admin menu above).

## 6. People (was Teams menu)
| Module | Status | Where |
|---|---|---|
| Teams | ✅ | `/team` |
| Performance | ✅ | `/performance` |
| HR | ✅ | `/hr` |

## 7. Office · Finance
Office = Capture + Papers. Finance is a **top-level** taskbar menu (not nested under Office).

## 8. AProc ✅
Home `/pmc` · project Site bands · Delivery stakeholders menu.

---

**Related:** [PAGE-STRUCTURE.md](PAGE-STRUCTURE.md) · [COMPOSITION-PRINCIPLES.md](COMPOSITION-PRINCIPLES.md) · [UI-SITE-MAP.md](UI-SITE-MAP.md).
