# AORMS platform nomenclature

**Status:** Canonical · **Owner:** Human Centric Works (HCW) · **Updated:** 2026-07-25

This document is the **single source of truth for product naming**. Where an older doc still says
*Architecture Office Resource Management System*, **AORMS-Architecture**, **HiveD**,
**AORMS-Studio**, or **AORMS-Consultancy** as the *primary* display name, treat those as
**superseded** (legacy redirects / transitional copy) unless the doc is explicitly marked historical.

Executable constants: `frontend/src/lib/product-nomenclature.ts`.

---

## Names at a glance

| Name | Expansion / role | Audience |
| --- | --- | --- |
| **AORMS** | **Accelerated Operational Resources Management System** — the **platform** | **AEC consulting + PMC firms** — architecture, engineering, and project management consultancies |
| **AStudio** | **Accelerated Studio** — architecture app (slug `astudio`; host `studio.aorms.in`) | Indian architecture & interior design consultancies |
| **AConsulting** | **Accelerated Consulting** — engineering app (slug `aconsulting`; host `consultancy.aorms.in`) | Structural, MEP, civil, and multidisciplinary engineering consultancies |
| **AProc** | **Accelerated Project Management** — PMC app (slug `aproc`; host `proc.aorms.in`) | Project management consultancies — programme, packages, site certification |
| **EOMS** | **Knowledge bank** (standalone API, separate repo) — *Emergent Object Management System* | Catalog of standard codebooks & compliance codes; apps query its API |
| **ESTI** | **Internal AI agent** — *Embedded Studio Intelligence* | Ask ESTI, Studio Intelligence, ESTI Pulse (live in **AStudio**) |
| **`esti` (codename)** | Repo name, `@esti/*` packages, `esti_*` DB tables | Engineering only — do not expose in marketing |

**HCW** (Human Centric Works) is the design-system and product studio behind AORMS.

---

## Three apps on one platform

AORMS targets **AEC consulting firms and project management consultancies**. There are
exactly **three apps**:

| Discipline | App name | Expansion | Slug | Host | Status |
| --- | --- | --- | --- | --- | --- |
| Architecture | **AStudio** | Accelerated Studio | `astudio` | `studio.aorms.in` | **Live** (this repo) |
| Engineering | **AConsulting** | Accelerated Consulting | `aconsulting` | `consultancy.aorms.in` | **Live** |
| Project management | **AProc** | Accelerated Project Management | `aproc` | `proc.aorms.in` | **Preview** |

Legacy marketing names / slugs redirect:

| Legacy | Canonical |
| --- | --- |
| AORMS-Studio · `aorms-studio` · `hived` · `aorms-architecture` | **AStudio** · `astudio` |
| AORMS-Consultancy · `aorms-consultancy` · `/aorms-consultancy` | **AConsulting** · `aconsulting` · `/aconsulting` |
| AORMS-PMC · `aorms-pmc` · `/aorms-pmc` · `pmc.aorms.in` | **AProc** · `aproc` · `/aproc` · `proc.aorms.in` |

---

## Platform vs apps

### AORMS (platform)

Mission: give **architecture, engineering, and PMC consultancies** an **operational
framework** and a **design framework** on one spine.

**AORMS is not** a contractor ERP or solution-delivery PM suite. It consolidates scattered
office tools into one AI-enhanced system for consultancies that advise and govern.

North-star capabilities:

- **Operational framework** — intake, process standards, rollout, adoption
- **Design framework** — engagement methodologies, deliverable models, templates
- Collaborative workspace (documents, channels, reviews)
- Dual-tier AI / **EOMS** (knowledge bank) + **ESTI** (internal RAG)
- Audit & compliance reporting
- Knowledge base with semantic search
- Analytics & operational dashboards

**Canonical pre-release architecture:** [AORMS-DEVELOPMENT-SPEC.md](AORMS-DEVELOPMENT-SPEC.md)
(rendered on the public landing at `/`).

### AStudio (architecture app — this repo)

The **shipped monorepo** is the **architecture consultancy app** — formerly marketed as
AORMS-Studio / AORMS-Architecture / HiveD.

| Aspect | AStudio |
| --- | --- |
| **Product name** | **AStudio** (*Accelerated Studio*; slug: `astudio`) |
| **Scope** | Indian architecture office: projects, fees, GST invoicing, drawings, site supervision, HR, client & consultant portals |
| **Typical URL** | `studio.aorms.in` (legacy `app.aorms.in` → 301) |
| **Public wiki** | [aorms.in/wiki](https://aorms.in/wiki) |

### AConsulting (engineering app — live)

The **engineering consultancy app** — structural, MEP, civil, and multidisciplinary firms.
Shares the same AORMS platform primitives as a separate workspace profile
(`hlp_organization.workspace_type = CONSULTANCY`).

### AProc (PMC app — preview)

The **project management consultancy app** — programme, packages, and site certification
for PMC firms that govern delivery on behalf of clients (`workspace_type = PMC`).
Greenfield chrome at `/pmc` / `proc.aorms.in`; modules land behind this shell.
**Not** a revival of the retired contractor-ERP “PMC” portfolio module.

---

## Portals and surfaces

Executable labels: `AORMS_PORTALS` in `frontend/src/lib/product-nomenclature.ts`.

| Surface | Display name | URL / route | Notes |
| --- | --- | --- | --- |
| **Staff workspace (architecture)** | **AStudio** | `studio.aorms.in` · `/login` (Workspace tab) | Architecture app |
| **Staff workspace (engineering)** | **AConsulting** | `consultancy.aorms.in` | Engineering app |
| **Staff workspace (PMC)** | **AProc** | `proc.aorms.in` · `/pmc` | PMC preview |
| **Knowledge Bank portal** | Knowledge Bank portal | `/libraries/knowledge-bank-portal` | EOMS textbook intake → ESTI RAG |
| **Wiki** | AORMS Wiki | `/wiki/*` on **aorms.in** | Public documentation |
| **Unified sign-in** | Sign in | `/login` | Tabs: Workspace · Portals · Account |
| **External portals** | External portals | `/login?tab=portals` (legacy `/access` redirects) | Client, consultant, contractor, site sign-in |
| **Client portal** | Client portal | external session | Scoped to client projects |
| **Consultant portal** | Consultant portal | external session | Alias *collaborator portal* in internal copy |
| **Contractor portal** | Contractor portal | external session | Rebuild in progress |
| **Site portal** | Site portal | site supervisor session | Mobile-first site inspections |
| **Personal account** | AORMS account | `/account` · sign-in `/login?tab=account` | Portable identity + licence hub |
| **Company account** | Company account | `/company-account` · sign-in `/login?tab=account&scope=company` | Firm owners: GST, members, admin |
| **Licensing console** | Licensing console (**HCW License Manager**) | `admin.aorms.in` · `/platform-admin` · sign-in `/login?tab=account&scope=licensing` | In-tree operators console |
| **Consultancy marketing** | **AConsulting** | `consultancy.aorms.in` · `/aconsulting` | Legacy path `/aorms-consultancy` |
| **PMC marketing** | **AProc** | `proc.aorms.in` · `/aproc` | Legacy path `/aorms-pmc` |
| **Blog** | Blog | `/blog` | Platform + practice notes |

Frozen host map: [AORMS-SURFACE-URLS.md](AORMS-SURFACE-URLS.md).

---

## EOMS — the knowledge bank

**EOMS** — *Emergent Object Management System* — is AORMS's **continuously-learning
knowledge bank**, delivered as a standalone **API in its own repository** (not part of
the `esti` monorepo). It ingests, catalogs, and serves the codified knowledge every AEC
practice depends on:

- **Standard codebooks** — IS / NBC / Eurocode and the like
- **Building compliance** — development-control rules, zonal and bye-law regulations
- **Other compliance codes** — fire, structural, MEP, environmental standards

Content is stored **catalogued** so a specific code, clause, or dataset can be **retrieved**
on demand. Every AORMS app queries **EOMS over its API** for authoritative codes.

Full design: **[EOMS-ARCHITECTURE.md](EOMS-ARCHITECTURE.md)**.

---

## ESTI — internal AI agent

**ESTI** — *Embedded Studio Intelligence* — is the **internal AI agent**. It answers
only from **validated firm repositories** inside the tenant boundary:

- Ask ESTI / ESTI AI / AI Studio
- Cognition engine & Studio Intelligence home
- ESTI Pulse

**AStudio** ships ESTI today. **AConsulting** ships Ask / EOMS review on the same spine.

### Agent split (governing rule)

> **EOMS** handles the outside world. **ESTI** handles what the firm already knows.

### Knowledge Bank portal

Staff route **`/libraries/knowledge-bank-portal`** — see [KNOWLEDGE-BANK-PORTAL.md](KNOWLEDGE-BANK-PORTAL.md).

---

## Legacy names (superseded)

| Legacy | Use instead | Notes |
| --- | --- | --- |
| *Architecture Office Resource Management System* | **AORMS** (platform) or **AStudio** (app) | Retire in new copy |
| **AORMS portal** / **AORMS-Architecture** / **HiveD** | **AStudio** | Staff workspace SPA |
| **AORMS-Studio** | **AStudio** (*Accelerated Studio*) | Legacy marketing title |
| **AORMS-Consultancy** | **AConsulting** (*Accelerated Consulting*) | Legacy marketing title |
| **AORMS-PMC** | **AProc** (*Accelerated Project Management*) | Legacy / transitional |
| Risk / education / auditing as platform scope | **AEC + PMC consultancies** | Retired multi-industry scope (2026-07-11) |
| Old in-app **PMC** portfolio module | **AProc** app (greenfield) | Contractor-ERP spine removed 2026-06-29 |
| **Holagundi License Panel** / **License Cloud** | **HCW License Manager** (in-tree) | Merged 2026-06-28 |

---

## Migration notes for authors

1. **Expand AORMS** as *Accelerated Operational Resources Management System*.
2. Three apps: **AStudio** · **AConsulting** · **AProc** (Accelerated Studio / Consulting / Project Management).
3. Import **`AORMS_APPS`**, **`AORMS_STUDIO`** / **`ASTUDIO`**, **`AORMS_CONSULTANCY`** / **`ACONSULTING`**, **`AORMS_PMC`** / **`APROC`**, **`PLATFORM_APPS`** from `product-nomenclature.ts`.
4. Do **not** rename the repo, packages, or tables to `aorms_*` — the `esti` codename is stable.
5. Staff workspace brands: **AStudio** / **AConsulting** / **AProc** — never “AORMS portal”.
6. External **client / consultant / contractor / site** portals keep the word *portal*.

---

## Precedence

When nomenclature conflicts:

1. This file — naming and platform vs apps
2. [UNIFIED-ARCHITECTURE-V4.md](UNIFIED-ARCHITECTURE-V4.md) § System state — what exists in **AStudio**
3. [AORMS-DEVELOPMENT-SPEC.md](AORMS-DEVELOPMENT-SPEC.md) — platform north-star (may ahead of code)
