# AORMS — Office Management System (agent instructions)

**AORMS** (**Accelerated Operational Resources Management System**) is a
**cloud-based office management system** for **AEC firms & consultancies** — web-only, single unified app.

**Core products (web-based):**
- **AORMS** — Office management hub (clients, projects, proposals, invoices, team, finances, knowledge bank)
- **ESTI** — Built-in AI agent (office automation, insights, recommendations)
- **EOMS** — External knowledge bank API (connected to hub)

**Removed (legacy):**
- ❌ AORMS Connect (desktop launcher) — not needed in web-only model
- ❌ AStudio (architecture practice mgr) — removed, allied app
- ❌ AConsulting (engineering practice mgr) — removed, allied app
- ❌ AProc / AQC PM (project mgmt technical) — removed, allied app
- ❌ AQC Estimation / BBS (technical installers) — removed, separate repos
- ❌ ADraft / ShilpiDB (drafting / geometry) — removed, allied apps
- ❌ Desktop installers, Windows setup, Tauri shell — web-only now

**Architecture:**
- Web-first SPA only (no desktop apps)
- Single sign-on (SSO) → office hub
- Cloud VPS deployment (no local-first requirement)
- tRPC + Fastify backend, React + Vite + Carbon Design frontend

Canon: [`docs/esti/AORMS-OFFICE-SYSTEM.md`](docs/esti/AORMS-OFFICE-SYSTEM.md) ·
[`docs/esti/ROADMAP.md`](docs/esti/ROADMAP.md) ·
[`docs/esti/ARCHITECTURE.md`](docs/esti/ARCHITECTURE.md).

Monorepo (pnpm): `packages/contracts`, `backend` (Fastify + tRPC + Drizzle),
`frontend` (React + Vite), Python `worker`. Dev: `compose.yaml`. Prod VPS:
`compose.prod.yaml` + `deploy/*`.

## Launch status (2026-09-04)

**aorms.in ships landing + blog.** Office hub login going live soon (web-only, no desktop).

| Rule | Detail |
| --- | --- |
| Gate | `VITE_MARKETING_ONLY` (default **true** on public builds) — `frontend/src/lib/marketing-gate.ts` |
| Live | `/` · `/blog` (landing pages) |
| Coming soon | `/login`, `/access`, `/signup`, `/account` → office hub SPA |
| No installers | Web-only app — removed Windows setup, desktop shells, Tauri |
| No allied apps | Removed AStudio, AConsulting, AProc, ADraft, ShilpiDB references from marketing |
| SSO only | Office hub accessed via web login (federated identity if configured) |
| Wiki | `/wiki*` redirects home — no wiki surfaces |

VPS: [`docs/esti/VPS-INSTALL.md`](docs/esti/VPS-INSTALL.md) ·
[`docs/esti/PRODUCTION-OPS.md`](docs/esti/PRODUCTION-OPS.md) § Soft launch ·
`deploy/bootstrap-vps.sh` · `deploy/install-landing.sh` · `deploy/update-landing.sh` ·
`deploy/verify-vps.sh`.

## Product naming (2026-09)

**Executable constants:** `frontend/src/lib/product-nomenclature.ts` — import
`AORMS`, `AORMS_OFFICE_HUB`, `EOMS`, `ESTI`. Do not hard-code product strings in UI/SEO.

| Name | Role |
| --- | --- |
| **AORMS** | Office management system brand + cloud spine |
| **AORMS Office Hub** | Web-only SPA; clients, projects, proposals, invoices, team, finances, KB |
| **ESTI** | Built-in AI agent for office automation + insights |
| **EOMS** | External knowledge bank API (connected to hub) |
| **`esti` / `aorms`** | Hub monorepo codename — never use `esti` in marketing copy |

**Removed (legacy, no longer referenced):**
- ❌ `AORMS_CONNECT` — desktop launcher removed
- ❌ `AORMS_STUDIO` / `ASTUDIO` — allied app removed
- ❌ `AORMS_CONSULTANCY` / `ACONSULTING` — allied app removed
- ❌ `AORMS_PMC` / `APROC` — allied app removed
- ❌ `AQC_ESTIMATION`, `AQC_BBS` — separate repos, removed
- ❌ `ADRAFT` / `AADT`, `SHILPIDB` — allied apps removed
- ❌ `SUITE_*` constants — no longer a suite, single web app

**Public surfaces:**

| Path / host | Role |
| --- | --- |
| `/` · **aorms.in** | Office hub landing page |
| `/blog` | Office management + best practices articles |
| `/login` | Office hub web login (SSO gate) |
| `/wiki*` | Redirect → `/` (no wiki surfaces) |
| **app.aorms.in** | Office hub SPA (authenticated users only) |

**Removed:**
- ❌ `/downloads` — no installers (web-only)
- ❌ `/aproc`, `/aconsulting`, `/astudio` — allied app hosts removed
- ❌ `admin.aorms.in` — licence manager (not applicable to web-only model)

**Web-first platform:** AORMS hub + portals now **web-only** with **IBM Carbon Design System**.
- [`docs/esti/ROADMAP-CLOUD.md`](docs/esti/ROADMAP-CLOUD.md) — what's live on `aorms.in`; next milestone **S8** (reopen `/login`)
- [`docs/esti/ROADMAP-LOCAL.md`](docs/esti/ROADMAP-LOCAL.md) — codebase cleanup + Carbon migration (local dev)
- [`docs/esti/MARKET-FIT.md`](docs/esti/MARKET-FIT.md)
- Carbon migration active: [`docs/esti/CARBON-MIGRATION.md`](docs/esti/CARBON-MIGRATION.md)

When editing wiki markdown under `frontend/src/content/wiki/`, rebuild the AI wiki
index only if Ask ESTI should see it (wiki is not a public marketing surface).

## Agent do / don't (office management system)

| Do | Don't |
| --- | --- |
| Focus on office hub features (clients, projects, proposals, invoices, team, finances, KB) | Reference allied apps (AStudio, AConsulting, AProc, ADraft, ShilpiDB) |
| Web-only, SPA-focused, Carbon Design System | Desktop apps, Windows installers, Tauri shell, launcher |
| ESTI AI agent for office automation + insights | Multiple per-app logins; legacy suite architecture |
| SSO + federated identity for office hub | Custom installer setup, license manager, local-first |
| Update landing.tsx for office benefits; remove allied app CTAs | Mention architects, consultants, PMC services as separate products |

## UI / design system — IBM Carbon Design System (active 2026-09-04)

> **🎯 CANONICAL (2026-09):** **IBM Carbon Design System v11** — web-only, pure Carbon.
> Whole frontend — app screens, portals, and public landing / marketing pages.
> **No custom UI/UX elements; no MUI, no `@hcw/ui-kit`.** Stock `@carbon/react`
> components only, arranged with Carbon grid and tokens.
>
> **Migration status:** [`docs/esti/CARBON-MIGRATION.md`](docs/esti/CARBON-MIGRATION.md)
> (roadmap) · [`docs/esti/CARBON-PHASE1-STATUS.md`](docs/esti/CARBON-PHASE1-STATUS.md) (current)
> · [`docs/esti/CARBON-WAVE3-PLAN.md`](docs/esti/CARBON-MIGRATION-WAVE3-PLAN.md) (execution).
> **Waves 0–2 complete (2026-08/09).** Wave 3 (app MUI→Carbon) launches Week 2, 
> 8 tranches over 7 weeks (3–4 developers, parallel). All 5 Wave 2 adapters ready
> (StatusDot, DataState, ConfirmModal, PageBreadcrumb, ToastHost). 
> **Entry point for new screens:** build on stock `@carbon/react` + `CarbonScope` 
> adapter in `frontend/src/carbon/`.
>
> **Governing rule (§0):** **Pure Carbon, no custom UI/UX.** Every screen is
> composed **only** from stock `@carbon/react` components and Carbon patterns
> (UI Shell, DataTable, Modal, Tile, etc.). **No bespoke components where Carbon
> provides one.** If Carbon omits a component, use the nearest Carbon pattern
> (`HeaderGlobalBar`, `Tag`, `OverflowMenu`). **No neumorphism, glass, soft surfaces,
> or Urbanist.** Elevation via Carbon `Layer`/`Tile` only (flat). Brand expression
> limited to theme tokens + logo lockups — no restyling.
>
> **Typography:** IBM Plex Sans (Carbon default) — `@carbon/styles` type tokens.
> **Colour:** Carbon theme tokens (`white`/`g10`/`g90`/`g100`) + `@carbon/colors`
> data-viz palette. **Spatial model:** Carbon UI Shell (`Header`, `SideNav`,
> `HeaderGlobalBar`) + bespoke dock (if needed). **Density / a11y:** Carbon
> `useTheme` + component `size` props; WCAG-tested stock components.
>
> **Tech stack:**
> - `@carbon/react@11` · `@carbon/icons-react@11` · `@carbon/styles@1` (tree-shaken)
> - `frontend/src/carbon/carbon-tree.scss` (selective Sass @use per wave)
> - `frontend/src/carbon/CarbonScope.tsx` (per-subtree theming during migration)
> - Carbon adapters for high-use kit primitives: `StatusDot`→`Tag`, `DataState`
>   →`Skeleton*`/empty, `ConfirmModal`→`Modal`, `PageBreadcrumb`→`Breadcrumb`,
>   `DataGrid`→stock `Table` (§ Wave 2/3, CARBON-MIGRATION.md).
>
> **Coexistence (Waves 1–5):** both `@carbon/react` and `@mui/material` installed;
> migrate screens incrementally. Wave 6 removes MUI + the kit. **Exit criteria per
> wave:** typecheck + lint green; visual baselines re-captured (Playwright).

**Starter template:** new Carbon screens follow the recipe in CARBON-MIGRATION.md
§ 3 Wave 3 (tranche 1):
1. Swap kit → `../carbon/adapters` (StatusDot/DataState/ConfirmModal/PageBreadcrumb).
2. MUI → stock Carbon (see § 4.2 component map in CARBON-MIGRATION.md).
3. Wrap root in `<CarbonScope>` while host still on kit.
4. Remove all `@mui/*` and `@hcw/ui-kit` imports; `tsc` + `eslint` green.
5. Add newly-used Carbon components to `carbon-tree.scss`.

**Transitional CSS** (`styles.scss`, `landing.scss`):
- `styles.scss`'s frozen `--cds-*` `:root` block remains for unmigrated screens.
- `landing.scss` editorial system migrates separately (Wave 5).
- Permitted structural helpers (colourless layout/sizing): `esti-fill`, `esti-grow`,
  `esti-row`, `esti-form-panel`, `esti-app-shell`, etc. (see CLAUDE.md historical
  list — these are **structural only**, no visual styling).
- Permitted functional animations: `esti-pom-pulse`, `esti-zone-pulse`,
  `esti-calm-breathe`, `esti-qpulse` (state-indicator keyframes; Carbon has no
  equivalents).
- **Data-driven colour maps** (e.g., `ZCOLOR` in `StudioAbstract.tsx` applying
  `var(--cds-*)` token strings dynamically) are permitted during migration only.

**Removed (retired, not reimplemented):**
- `@hcw/ui-kit` kit primitives: `ActionDock`, `GlassRail`, `SectionDock`,
  `TaskbarFooter`, `KpiStrip`, `HealthGlassOrb`, `Avatar`, `BrandMark`, `Surface`
  (soft/glass). Rewritten on Carbon patterns (UI Shell, `Tile`, `Tag`) per wave.
- `@mui/material`, `@mui/icons-material`, `vendor/hcw-ui-kit`, `@fontsource/urbanist`.

**Documentation (after Wave 6, decommission wave):**
Rewrite CLAUDE.md § UI, `HCW-UI-KIT.md` (mark superseded), all `docs/hcw-kit/*`,
`HCW-KIT-AI-KNOWLEDGE-BASE.md`, the design-debt register.

**AORMS AI:** ESTI runs on **desktop apps only** (local Ollama / Foundry Local) —
not on the cloud hub or aorms.in. `@hcw/aorms-ai-kit` is prompts + Ollama SDK for
local/desktop use; canon: `docs/esti/LOCAL-FIRST.md` · `AORMS-SUITE.md` § AI ·
`PRODUCTION-OPS.md` § ESTI AI.

### Carbon Sass & tokens (`styles.scss`, `landing.scss`)

See UI section above. During migration (Waves 1–5), both legacy and Carbon styles coexist:

- **`frontend/src/carbon/carbon-tree.scss`** — tree-shaken Carbon Sass (`@use`),
  imported in `carbon.css` wrapped in `@layer carbon`. Per-wave component adds:
  e.g., `@use '@carbon/react/components/breadcrumb'` as new screens use `Breadcrumb`.
- **`styles.scss`'s frozen `--cds-*` `:root` block** — static compat layer for
  unmigrated HCW-kit screens. Replaced entirely in Wave 6.
- **`landing.scss`** — editorial system for unauthenticated surfaces (Landing, Blog).
  Migrates to Carbon tokens in Wave 5. Do not mix `esti-lp-*` classes into `styles.scss`.

Permitted structural helpers in `styles.scss` (colourless, layout/sizing only):
`esti-fill`, `esti-grow`, `esti-row`, `esti-form-panel`, `esti-app-shell`,
`esti-landing-shell`, `esti-page-header`, `esti-login-shell`, `esti-login-brand`,
`esti-toast-host`, `esti-pomodoro-float`, `esti-header-clock`, `esti-footer`,
`esti-ai-explain__*`, `esti-ai-studio__*`, `esti-float-widget`, `esti-geo--*`,
`esti-staff-tile__*`, `esti-id-card__*` (all sizing constraints, no colour).

**Hidden file inputs** (`<input type="file" style={{ display: "none" }}` triggered via
`ref.current.click()`) are a permitted pattern — the triggering Carbon `Button` is
the visible element.

Permitted functional animations (state-indicator keyframes):
`esti-pom-pulse`, `esti-zone-pulse`, `esti-calm-breathe`, `esti-qpulse`.

## Python worker (`worker/`)

The worker is a **Redis Streams consumer** that handles CPU/IO-heavy jobs
off-loaded by the TypeScript backend. It consumes `esti:jobs`, retries up to
3 times, and routes poison jobs to `esti:jobs:dead`.

Four job handlers (`worker/esti_worker/jobs/`):

| Type | Handler | Purpose |
|---|---|---|
| `dxf_to_svg` | `dxf.py` | Converts DXF takeoff to SVG via `ezdxf` |
| `pdf_to_markdown` | `pdf_to_markdown.py` | Knowledge Bank portal: PDF → Markdown via `pymupdf4llm` (HCW Markdown Tool pipeline) |
| `render_pdf` | `pdf.py` | HTML → PDF via WeasyPrint; targets include `invoice`, `estimate`, `bbs`, `running_bill`, `feeproposal`, `proposal`, `inspection`, `progress_report`, `drawing` (full set: `_RENDERERS` in `pdf.py`) |
| `reconcile_import` | `reconcile.py` | Parses bank/26AS/AIS/GSTR imports and matches entries via `pandas` |

Config (`worker/esti_worker/config.py`): Pydantic Settings reading `REDIS_URL`,
`DATABASE_URL`, `S3_*` env vars. Storage (`storage.py`): S3 `get_bytes`/`put_bytes`.
DB (`db.py`): patches `pdf_status` (PENDING → PROCESSING → READY) and `pdf_key`
on `esti_site_assessment` and invoice rows after PDF upload.

Tests: `worker/tests/test_jobs.py` (handler unit tests) and
`test_retry_dlq.py` (retry/dead-letter stream tests). Run with `pytest` from the
`worker/` directory.

## Dev / verify loop

- Source for `backend` is bind-mounted but `tsx watch` does not reload across
  the VM mount — `docker restart esti-backend` after backend changes.
- `frontend` runs in the `esti-frontend` container (Vite at
  `http://localhost:5173`); typecheck/lint inside it:
  `docker exec esti-frontend sh -lc "cd /app/esti/frontend && pnpm exec tsc -p tsconfig.json --noEmit"`
  and `pnpm exec eslint <files>`.
- After editing `packages/contracts`, rebuild it in the relevant container
  (`cd /app/esti/packages/contracts && pnpm build`).
- Quick render check: `GET http://localhost:5173/src/<path>` should return 200.
- Migrations live in `backend/drizzle/`; generate with drizzle-kit, copy the
  `.sql` + `meta/` into the container, applied on boot by `runMigrations()`.
- **Apply migrations manually** using `docker cp` (stdin pipe is unreliable):
  ```
  docker cp backend/drizzle/NNNN_name.sql esti-db:/tmp/NNNN_name.sql
  docker exec esti-db sh -lc "psql -U esti -d esti -f /tmp/NNNN_name.sql"
  ```
  Multi-column `ALTER TABLE` via PowerShell heredoc to a container stdin only
  applies the first column — always use `docker cp` + `-f` instead.

## Conventions

- Money is stored/handled in integer **paise**; format with `formatINR` /
  `formatINRShort`.
- Permissions/capabilities live in `packages/contracts/src/permissions.ts`
  (`can(role, capability)`); procedure tiers in `backend/src/trpc/trpc.ts`.
- Login email is canonicalised: `normalizeEmail` (trim+lowercase) on every
  account-creating write, `emailMatches` for case-insensitive lookup/uniqueness
  (both `backend/src/lib/email.ts` — never raw `eq(users.email, …)` or `ilike`).
- Portable identity handles: `AORMS-U-` (person) / `AORMS-C-` (company) on the
  licensing platform via `newPublicId` — see `docs/esti/AORMS-IDENTITY.md`.
- Commit messages end with:
  `Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>`
- Two files have ongoing parallel WIP — avoid editing `frontend/src/routes/
  Projects.tsx` and `frontend/src/routes/Clients.tsx` unless asked.

## Module map (all tRPC namespaces — `backend/src/trpc/router.ts`)

Root router has **80+ namespaces** (see `backend/src/trpc/router.ts`). Organised by domain below.

**Public (no auth):** `health` (liveness), `profile` (India config: currency, FY dates,
GST rates, SAC codes)

**Auth / identity:** `auth` (login/session), `users` (user management), `firm`
(firm profile; `firm:admin` capability required), `settings` (user/firm prefs),
`admin` (admin utilities), `audit` (immutable audit log; `reports:view`)

**Clients & projects:**
- `clients` — client CRM; `clientLog` — interaction history
- `leads` — inbound enquiry capture
- `tenders` — firm **issues** project tenders; `contractorPortal` — invited contractors
 submit sealed lump-sum bids (login at `/login?tab=portals`)
- `projectOffice` — project-level admin data; `phases` — project phase management
- `proposals` — **unified** proposals: COA fee proposals + scope agreements in one
 `esti_proposal` model (`fees:manage`); includes the Project OS client-approval gate
 (`setClientApproval`). *(The separate `feeProposals` namespace + thin `esti_proposal`
 were merged here — migration 0116.)*
- `invoices` — GST invoicing (`invoice:manage`/`invoice:delete`); `reconcile` —
  financial reconciliation; `purchaseOrders` — PO management
- `permits` — building permit tracking; `approvals` — internal approval workflows
- `transmittals` — document transmittals; `letters` / `contracts` — office
  documents (both exported from `backend/src/modules/office/router.ts`)
- `spec` — project specifications; `inspections` — site inspections (PDF generation)
- `reports` — GST/TDS filing abstracts (`reports:view`)

**Estimation** (`fees:manage`; 2026-07-18, see the removal note below):
- `rateBooks` — firm-level, versioned item-code/unit/rate sets (Library → Rate Books)
- `estimates` — a project's priced BOQ against one rate book, with a per-item
  measurement book (nos × dimensions by unit shape) and a contingency/GST rollup

**BBS / steel recon / running bills** (`write`; finalize with `cost:approve`; 2026-07-25):
- `bbs` — project bar bending schedules; IS 456 cutting lengths (Delivery → BBS)
- `steelReconciliation` — scheduled (BBS) vs issued vs consumed kg by diameter
  (Delivery → Steel recon).
- `runningBills` — project-level running-account (RA) bills with line items,
  advances, and deductions (`esti_running_bill` / `esti_running_bill_item`;
  `ProjectRunningBills.tsx`). Distinct from AProc contractor RA on `pmcRaBills`.

**Drawings:**
- `drawings` — drawing/document management (DXF register)

> The **old Estimation OS** (`esti_component`/RuleSet engine, `formula-engine`/
> `ruleset-engine`, CostingWindow, ParametricCanvas, ComponentLibrary) and the
> **Construction Cost spine** (tenders, work packages, running bills, measurement
> book, deviations/variations, final accounts, cost dashboard, GRN, procurement
> forecast, BBS + steel reconciliation) were **removed** in the 2026-06-28
> teardown. The old **Rate Books** (`dsr` / `esti_dsr_*` / `@hcw/master-dsr-kit` /
> MasterDsr) and **Rate Analysis** (`rateAnalysis` / `esti_rate_*`) went with it
> (migration `0108`).
>
> A **new, deliberately narrower Estimation** shipped 2026-07-18 (migration
> `0179`) — `rateBooks` + `estimates` namespaces, ported from
> [Construction-Billing-System](https://github.com/HolagundiWorks/Construction-Billing-System)'s
> domain model. Firm-level, versioned **Rate Books** (Library → Rate Books)
> price a project's **Estimation** tab (priced BOQ + per-item measurement book +
> contingency/GST rollup), both gated to `fees:manage`. No Contracts or tenders
> in this BOQ model. Project **BBS** + **steel reconciliation** returned as
> Delivery sub-tabs (migrations `0223`/`0224`); contractor RA stays on AProc
> `pmcRaBills`. See `packages/contracts/src/estimation.ts` and
> `docs/esti/UNIFIED-ARCHITECTURE-V4.md`.

**Team / HR / Performance:**
- `team` / `assignments` — roster and project-staff assignments
- `leaves` / `payroll` — HR (from `backend/src/modules/team/hr.ts`; `hr:manage`)
- `workload` — team workload overview; `notifications` — notification system
- `attendance` — per-person daily attendance and time attribution records
- `aspRf` — rolling 30-day ASPRF composite score; `teamScores/myScore`
- `rewards` — reward point events with audit; `listByMember/grant` (owner-only)

**Consultants / Collaborators:**
- `consultants` — external consultant directory; `engagements` — scope/engagement
  records; `collab` — collaborator portal sessions
  (all three from `backend/src/modules/consultant/`)

**Knowledge:**
- `specCatalog` — specification material catalogue (Library → Specification).
  *(The old `knowledgeBank` namespace + `KnowledgeBank.tsx` and the Item Library
  UI were removed 2026-07-09; only the spec catalogue survives.)*
- `lessons` — lessons-learned knowledge entries

> The in-product RIE/compliance rule engine, site assessments (`ruleVersions` /
> `siteAssessments`), and the BBMP bylaw calculator (`bbmpRules`) were removed in the
> 2026-06 Knowledge-Bank cleanup. The Estimation OS + Construction Cost spine
> (incl. steel reconciliation, the Components + Parametric KB tabs) were removed
> in the 2026-06-28 teardown, **followed by Rate Books (`dsr`) and Rate Analysis
> (`rateAnalysis`)**. Project BBS + steel recon returned 2026-07-25 (`esti_bbs*` /
> `esti_steel_reconciliation*`, IS 456 engine) under Delivery; RA bills remain
> on AProc `pmcRaBills`.

**Supplementary:** `comments` — threaded comments on records; `criticalNotes` —
project critical notes; `activity` — immutable activity timeline; `dashboard` —
computed KPIs, Action Center, health modules (`dashboard.home` bundles the office home view); `portal` — client portal access

**Site delivery (consultancy site supervision + AProc):**
- `snags` / `siteInstructions` / `progressReports` / `phaseProgress` / `siteVisits` /
  `inspections` — site supervision (Project → Delivery)
- `pmcMilestones` (CSV + P6 XER) / `pmcPackages` / `pmcPackageTenders` /
  `pmcRaBills` / `pmcSteelCerts` / `pmcDigest` / `contractorPortal` /
  `phaseProgress` — AProc programme, packages, sealed tender bids, RA + steel
  certification, portfolio digest, CA/handover live stages (owner-side; see
  `docs/esti/APROC-ARCHITECTURE.md`)

> **Removed in the 2026-06-29 consultancy-only teardown** (migration 0117 dropped the
> tables): `pmc` (hub/portfolio), `programme` (delivery Gantt / milestones),
> `constructionSchedule` (CPM), `construction` (contractor coordination), and the old
> work-package tender spine. A narrower lump-sum **Project › Tenders** flow shipped
> 2026-07-25 (`esti_tender*` + top-level `tenders` namespace + `contractorPortal` —
> firm issues; contractors bid; no BOQ/RA award bridge).
>
> **Mood boards returned 2026-07-25** as an AStudio project canvas — the `moodboard`
> namespace (`esti_moodboard*`; board CRUD + freeform canvas items with layers and
> discussion; `ProjectMoodboard.tsx`).

**Library (2026-06-29):**
- `compliance` — structured compliance library: `far` / `setback` / `nbc` / `fire` /
  `regulation` sub-routers (each CRUD; tables `esti_compliance_*`, migration 0118)
- `masterPlans` — master-plan file library (`esti_master_plan`, migration 0119; upload
  route `/upload/master-plan`)
- `standards` — design standards by discipline + attached files (`esti_standard` +
  `esti_standard_file`, migration 0120; upload route `/upload/standard-file`)
- `userProfile` — current user's Work Profile aggregate (`workSummary`); distinct from
  the public India-config `profile` namespace

**Project brief, expenses, and system (Phases 17–20):**
- `projectBrief` — Project Info questionnaire sections
- `projectPrecon` — Studio pre-construction R&O: risks, opportunities, phase gates (Brief → R&O)
- `moodboard` — AStudio project mood board canvas (`esti_moodboard*`; board CRUD +
  freeform canvas items, layers, discussion; `ProjectMoodboard.tsx`)
- `accounts` / `expenses` — office cash book and project costing expenses
- `system` — release metadata (owner-only)
- `marketing` — landing visit counter
- `specCatalog` — specification material catalogue (Knowledge Bank)
- `consultancy` — AORMS-Consultancy engineering OS (engagements, deliverables, RACI, HLP, timesheets, WIP, contract review, lessons, NC/CAPA, MoM, opportunities, phase gates)
- `office` — includes enquiry register + go/no-go (`office.enquiries`)
- `admin.usageReports` — HLP usage billing export + suspend-for-non-payment (P7.2 / P7.3)

## Frontend routes (`frontend/src/routes/`)

> **Sidebar / module placement** is canonically defined in
> [docs/esti/NAVIGATION.md](docs/esti/NAVIGATION.md) — the **Canonical V3** IA
> (Studio Intelligence · Projects · Tasks · AI Studio · Library · Studio · Third Parties ·
> Office · Finance · LXOS · Admin), consultancy-only, with per-module ✅/🚧/🔲 status. The
> nested sidebar is a recursive `NavNode` tree (`link` | `menu`) in `App.tsx`; **Library**
> (Item/Compliance/Master Plan/Standards) and **AI Studio** (plan+rank gated) are top-level
> sidebar entries; Studio holds Teams/Performance/HR. Search is a **header** action
> (with the Alerts bell, ID card, clock and Pomodoro). **Removed (consultancy-only):** PMC,
> Construction, Programme. **Tenders** is back as firm-issued project
> tenders (Office › Tenders + Project › Tenders; bidding in the contractor portal), and
> **mood boards** returned as an AStudio project tab (`ProjectMoodboard.tsx`).
> Edit nav via the `nav` tree and keep NAVIGATION.md in sync.

Key routes by area:

| File | Purpose |
|---|---|
| `StudioAbstract.tsx` | **Studio Intelligence** home screen (route `/`; component/file name kept as StudioAbstract) — tabs Overview · Lead · Project · Financial · Team · Work · Approval, each one shell: header + **4 KPI cards** + a **DataTable** that scrolls inside its Tile (page never scrolls, 100% width). Overview merges Studio + Summary and carries the right **sidebar** (AI recommendation over last-10 Office Log). Zone-state vocab in `components/dashboard/zoneState.ts`; uses `dashboard.home`. |
| `Projects.tsx` ⚠️ | Project list (parallel WIP — avoid editing unless asked) |
| `ProjectDetail.tsx` | Single project — phases, tasks, drawings, decisions, Estimation (BOQ, `fees:manage` gated), Delivery (BBS · steel recon · running bills), Tenders, and Moodboard tabs |
| `ArchivedProjects.tsx` | Archived project browser |
| `Clients.tsx` ⚠️ | Client CRM (parallel WIP — avoid editing unless asked); Third Parties (`/clients`) |
| `Work.tsx` | Work hub shell — tabs in `components/work/` (`/tasks`; `/work` alias); Tasks pillar |
| `Lxos.tsx` | **LXOS** pillar placeholder (`/lxos`; `/leos` redirects) — 4 exchange layers, greenfield |
| `Team.tsx` / `Hr.tsx` | Team roster and HR/payroll (hrEnabled gated); Studio (`/team`, `/hr`) |
| `Invoices.tsx` | Consultancy invoices (Finance) |
| `Proposals.tsx` | **Unified Proposals** (Office, `/office/proposals`) — COA fee + scope; `trpc.proposals` |
| `Tenders.tsx` | **Office › Tenders** (`/office/tenders`) — open firm-issued project tenders; detail on Project › Tenders |
| `Reconcile.tsx` | Financial reconciliation (route kept; not in V3 menu) |
| `Consultants.tsx` / `Contractors.tsx` | Consultants / contractors (Third Parties); contractors can provision portal logins for bidding |
| `Letters.tsx` / `Contracts.tsx` | Office documents |
| `Filing.tsx` | GST/TDS filing abstracts (Finance › Financial Reports) |
| `SpecCatalogLibrary.tsx` | Library › Specification catalogue (`/libraries/spec-catalog`) — versioned category/item/make/spec/finish rows (`/knowledge-bank` redirects here; the old Item Library — Materials/Labour/Brands/Recipes — was removed 2026-07-09) |
| `RateBookLibrary.tsx` | Library › Rate Books (`/libraries/rate-books`, `fees:manage` gated) — item code/unit/rate sets that price project Estimation tabs |
| `ComplianceLibrary.tsx` | Library › Compliance (`/libraries/compliance`) — NBC/FAR/Setbacks/Fire/Regulations CRUD |
| `MasterPlanLibrary.tsx` | Library › Master Plan (`/libraries/master-plans`) — PDF/DWG file uploads |
| `StandardsLibrary.tsx` | Library › Standards (`/libraries/standards`) — by discipline + files |
| `Payroll.tsx` | Finance › Payroll (`/finance/payroll`) — payslips (reuses `payroll` namespace) |
| `Vendors.tsx` | Third Parties › Vendors (`/vendors`) — placeholder |
| `Profile.tsx` | User Profile (`/profile`) — Personal + Work Profile + identity/cert placeholders |
| `Performance.tsx` | ASPRF performance dashboard |
| `AuditLog.tsx` | Audit trail (firm:admin gated) |
| `Alerts.tsx` | Notification/alert center (header bell) |
| `Portal.tsx` | Client portal — `/` and `/projects/:projectId` |
| `CollaboratorPortal.tsx` | Consultant portal — `/` and `/projects/:projectId` |
| `ContractorPortal.tsx` | Contractor portal — invited tenders + sealed lump-sum bids (`CONTRACTOR` login at `/login?tab=portals`) |
| `Company.tsx` | Removed — `/company` redirects to `/company-account` |
| `Users.tsx` | User management (firm:admin) |
| `Settings.tsx` | Removed — `/settings` redirects to `/account#settings` |
| `Landing.tsx` / `Login.tsx` | Unauthenticated pages |

## Domain conventions

- **Task dimensions**: `TaskClassification` (BILLABLE/NON_BILLABLE/TRAINING/
  COLLABORATION/PERSONAL) is financial. `TaskWorkType` (DESIGN_COMMUNICATION/
  DESIGN_DEVELOPMENT/TECHNICAL_PRODUCTION/CONSTRUCTION_SUPPORT) is architectural
  work category for ASPRF scoring. Both are now live fields on `esti_task`.
- **Task ASPRF fields**: `difficultyCoefficient` (1–5, default 3, anti-gaming weight)
  and `estimatedHours` (numeric, for delivery-predictability scoring) are separate
  from classification and work type.
- **Revision types**: decisions carry a `revisionCategory` (MINOR/MAJOR/CRITICAL)
  and a `revisionSource` (CLIENT_DRIVEN/INTERNAL_ERROR/TECHNICAL_QUERY/SCOPE_CHANGE).
  Both fields are live and feed the Revision Intelligence dashboard module.
- **ASPRF performance weights**: Reliability 30%, Quality 25%, Client Impact 15%,
  Collaboration 15%, Learning 10%, Wellbeing 5%. Wellbeing is opt-in only.
