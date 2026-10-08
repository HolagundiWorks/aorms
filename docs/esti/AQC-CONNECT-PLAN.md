# AQC ↔ AORMS connection — final plan

> **Status: DECIDED (2026-10-08).** Decisions below are the user's; the comparison (§2) is from a read of AQC-Core
> (`HolagundiWorks/AQC`, `ProjectStore`, `AqcSqliteStore`, `Aorms.Bridge`, the C++ engine boundary) against the AORMS
> schema (`aorms-web`, 111 tables) and platform (`aorms-platform`). Nothing in this document is built yet.

## 0. Decisions (final)

| # | Decision |
|---|---|
| D1 | **AORMS's own estimation is frozen.** No new work on `web/` estimates, rate books, take-off, BBS, derivation or markups. They stay readable (and usable) as they are; AQC is where estimation and costing are done. The unmerged linked-item derivation commits were reverted out of PR #134. |
| D2 | **AQC stays open source** (AGPL "Community"). The engine and the desktop app are free and work standalone, exactly as today. |
| D3 | **Pro = the same AQC, connected to AORMS.** Bundled with AORMS — there is no separate product to buy and **no licence keys**. |
| D4 | **The AORMS login *is* the licence.** Signing in with an AORMS Platform account that belongs to a Studio is the entitlement. No `activate` call, no `licenseToken`, no `ESTI_PRODUCT_API_KEY`. |
| D5 | **Project data is imported from the portal.** A connected AQC does not invent projects: the project, its client, firm, contractors, drawings and site/portal inputs come *from* AORMS; the user opens a portal project in AQC. |
| D6 | **All data is synced to the database.** Every section of an AQC project (take-off sheets, levels, settings, estimates, bills, schedule, contracts, stores, org …) is stored in AORMS's database, not only a published subset. |

| D7 | **Trial or expired Studio loses connected mode.** The entitlement follows the Studio's licence status; AQC drops to Community behaviour (local work continues, nothing deleted, nothing syncs). |
| D8 | **One active session per user.** No device cap and no device registry. Signing in on a second machine ends the first session (the first sees "signed in elsewhere" and falls back to read-only / Community until it signs in again). |
| D9 | **Login first; online projects first.** AQC opens to a sign-in screen. After sign-in it shows the user's **online projects** (from AORMS) instead of local files. A local project can be **pushed online** — adopted into an AORMS project **once**. Community (not signed in) still opens local files. |
| D10 | **Releasing an estimate to the client is a staff action**, per version, in AORMS. Syncing never makes anything client-visible. |
| D11 | **No pilot Studio or real AQC file yet.** A synthetic pilot project file is provided as a test fixture (§9). |

Consequences: the billing/licence phase (earlier "P6") is **dropped**; "Pro" is a *mode* (signed in + synced), and the
earlier "publish allow-list / never-sync scratch" idea is replaced by *sync everything, show selectively* (§4).

## 1. Roles after the change

| Concern | AQC (desktop, authoritative) | AORMS (web, authoritative) |
|---|---|---|
| Quantities, BBS, BOQ, rate books, estimates, markups, derivation, schedule (CPM/PERT), RA-bill maths, final account | **Computes and owns** | Stores the synced data; shows it; **never recomputes** |
| Projects, clients, contractors, consultants, people, roles, permissions, drawings register, transmittals, approvals, tenders, invoices, HR, expenses | Reads (imported) | **Owns** |
| Portals (client, contractor, collaborator) | — | **Owns** — uploads in, views out |
| Money | AQC engine is the source of truth for derived amounts | Display only |

Rule inherited from AQC: *the engine is the single source of truth for numbers.* AORMS only stores, versions, filters
and displays them.

## 2. Structure and flow — AQC vs AORMS (the comparison)

### 2.1 How AQC is built

* **One in-memory aggregate per project** — `ProjectStore` — saved as a single `.bbsproj` JSON (`format v17`) or exported
  to a relational `.aqcdb` (SQLite) that is *additive*, not the working store.
* **Sections inside a project:** `Info` (name, location, client, company, GSTIN/CIN/PAN, logo, `HubProjectId`), `Parties`
  (two personas: **PM** and **Contractor**, each with letterhead, signatory, number prefix), `Markups`, `Settings`
  (bar diameters, covers, τbd, hook/bend constants, civil yields), `Levels`, ~**28 take-off sheets**, the PDF take-off
  state, `Schedule`, `Office` (letters/memos), `ContractBook`, `Accounts` (RA bills + cash/bank), `Stores`
  (suppliers, warehouses, PO, GRN, issues, stock), `Org` (sites, resources, employees, attendance, payroll),
  `LinkRules`, and the **last estimate snapshot**.
* **Take-off rows are schemaless:** each is a `Dictionary<string,string>` (no id) with fields per category. They map
  1:1 onto AORMS's own `takeoff_items(category, fields jsonb)` shape — a good sign, because the AORMS table was
  designed as a port of exactly this.
* **App-level, not per project:** the **rate-book library** (`ratebooks.json`, versioned schedules) and the Bridge's
  `firm.db` (tokens, outboxes).
* **Calculation flow:** Levels → element and civil sheets → **C++ `bbs_engine`** (RCC/BBS) and `CivilBoqCalculator`
  (civil) → `DerivationEngine` (linked trades) → `EstimateCalculator` (qty × rate-book version + markups) →
  Contracts / Accounts (RA bills, deductions, IPC) → Schedule. The estimate is a **recomputable snapshot** (exported
  for reporting, deliberately not re-imported).
* **Persistence of money:** `double` in rupees, rounded to 2 dp at calculation points.
* **Connection today:** `Aorms.Bridge` — an outbox (`meta_outbox`, `artifact_outbox`), a `syncToken`, a shared
  `catalog.json` from the retired AORMS Connect launcher, licence activation by key. It targets endpoints
  (`/platform/v1/activate`, `/api/sync/meta`, `/api/sync/ingest`) that **no longer exist**.

### 2.2 How AORMS is built

* **Relational, multi-tenant:** every tenant table has `firm_id`, every policy checks `firm_id = current_firm_id()`;
  one row per fact, not one document per project.
* **Money in integer paise.**
* **Two Supabase projects:** `aorms-web` (Studio data) and `aorms-platform` (identity, Studios, licences, payments).
* **Portals** read through RLS with role-specific policies (`my_contractor_id()`, `my_contractor_project_ids()`).

### 2.3 Section-by-section mapping

| AQC section | AORMS equivalent today | Gap / treatment |
|---|---|---|
| `Info` + `HubProjectId` | `project_offices` | **Import** from AORMS; `HubProjectId` = `project_offices.id` |
| `Parties` (PM, Contractor) | `firms`, `clients`, `contractors` | **Import** (firm letterhead, contractor record) |
| `Levels`, `Settings`, `Markups`, `Yields` | none (estimates carry only 4 markup %) | Sync as project-level JSON |
| Take-off sheets (28) | `takeoff_items` (17 categories, jsonb) | Sync **all 28** into a generic row store; AORMS's own table stays frozen |
| RCC/BBS | `bbs_schedules/members/items` | Same — AQC rows go to the generic store; AORMS BBS frozen |
| Estimate snapshot + lines | `estimates`, `estimate_items` | Synced as **immutable versions** (artifact), never merged into AORMS's native estimates |
| Rate books (versioned, app-level) | `rate_books`, `rate_book_items` (no versioning) | New **firm-level** versioned store so every seat shares one library |
| Link rules | none (derivation in code) | Sync with the project |
| Schedule (activities, links, CPM) | `pmc_milestones` (+ duration/predecessor, 0102) | **New** `aqc` schedule rows; milestones stay the portal-facing summary |
| ContractBook (work orders, tenders, SOR) | `contracts`, `tenders`, `pmc_packages` | AQC rows synced as-is; AORMS native tenders/packages stay authoritative for award |
| Accounts — RA bills + deductions | `pmc_ra_bills`, `pmc_ra_lines`, `pmc_variations` | Contractor *claims* originate in AORMS (inbox); **certified** bill/IPC comes back from AQC |
| Accounts — cash/bank | `expenses`, `accounts` | AQC copy synced; AORMS finance is authoritative (no merge) |
| Stores (suppliers, PO, GRN, issues, stock) | `purchase_orders`, `po_items` (no GRN/issue/stock) | AQC rows synced; AORMS PO unchanged |
| Org (sites, resources, employees, payroll) | `attendance`, `payslips`, `hr_profiles` | AQC copy synced; AORMS HR authoritative (no merge) |
| Office register (letters) | `letters`, `documents` | AQC copy synced; AORMS authoritative |

Reading of the table: **the compute-heavy sections have no AORMS counterpart worth keeping (AQC wins); the
office/finance/HR sections overlap and AORMS must stay authoritative** — in connected mode AQC keeps its local copy
and syncs it, but nothing is merged into AORMS-native tables.

### 2.4 Mismatches that the design has to absorb

1. **No row ids in AQC take-off rows.** Add a stable `_rid` field (GUID) on first sync; harmless in `.bbsproj`.
2. **Document vs relational.** Solved by a generic row store (§4) rather than forcing 28 sheets into typed tables.
3. **`double` rupees vs integer paise.** The generic store keeps AQC's raw values (jsonb); any typed projection AORMS
   needs (portal figures) converts once, with a fixed rule — round half away from zero to paise — and is flagged
   *derived from AQC*.
4. **Two sources for office data** (cash, letters, payroll, stores). Ownership matrix above; no automatic merge.
5. **Concurrent editing.** AQC has no merge logic (whole-project in memory). Use a **per-project edit lease** (§4.4).
6. **Estimate is a snapshot.** Versioned and immutable; recompute happens only in AQC.
7. **The old hub is gone.** Bridge endpoints, `session.json`, `catalog.json` and licence keys are replaced (§3).

## 3. Identity and entitlement (login is the licence)

```
AQC (Pro mode)                         AORMS web                        aorms-platform
──────────────                         ─────────                        ──────────────
Sign in (device code / PKCE) ──────────────────────────────────────────► Auth (accounts, AORMS-U-, MFA)
◄───────────────────── access + refresh token ─────────────────────────
GET /api/aqc/v1/session ───────────►  verify JWT, resolve Studio membership + firm_id
◄──── { account, studio, firmId, role, capabilities, connected:true }
```

* **Entitlement rule:** a valid Platform session **and** an ACTIVE membership of a Studio that has an Office Hub
  firm. That is all. The Studio's existing licence status is read only to suspend (expired/non-payment → the Studio
  is already locked out of the hub; AQC follows).
* **No second credential.** Tokens go in Windows Credential Manager. `firm.db` keeps no secrets.
* **Community mode is unchanged:** not signed in → no network calls, no sync, local `.bbsproj` only.
* **Capabilities** reuse AORMS's: `fees:manage` (estimates), `write` (project data), `cost:approve` (certify a bill).
  AQC hides actions the role can't perform; the server enforces them.
* **One active session per user (D8):** sign-in creates `aqc_sessions(account_id unique, session_id, started_at,
  last_seen_at)`; a new sign-in replaces the row. Every API call carries the `session_id` claim; a stale one gets
  `409 session_replaced` and AQC shows "signed in on another computer — sign in here to continue". Replaces the earlier
  device registry and cap. Pending offline outbox rows survive and replay after the next sign-in (subject to the
  project lease).
* **Entitlement lapse (D7):** if the Studio becomes TRIAL-expired or expired, `/session` returns `connected:false`
  with a reason; AQC switches to Community behaviour and keeps the outbox untouched until it reconnects.

## 4. Data plane — sync everything, show selectively

### 4.0 First-run flow (D9)

1. AQC launches to **Sign in** (AORMS account; "Continue without signing in" = Community, local files only).
2. After sign-in: **Online projects** list (the user's AORMS projects, with sync state) and a secondary **Local
   projects** list. Opening an online project pulls its data (§4.1) and the AQC project becomes bound.
3. **Push local project online:** on a local project, *Push online* → pick the target AORMS project (or create a new
   one from AQC if the user has `write`) → the project is bound **once**, `_rid` ids are minted, all sections upload,
   and the local file becomes a cached copy of the online project. Rebinding or pushing the same local file to a
   second AORMS project is refused.
4. Not signed in / lapsed: the Local list is all that shows.

### 4.1 Import (portal → AQC)

Opening a project in AQC is a **pull**: `GET /api/aqc/v1/projects` (the caller's, RLS-scoped) and
`GET /api/aqc/v1/projects/{id}/seed` returning project info, firm letterhead/party data, client, contractors on the
project, the drawings register (with signed download URLs so a drawing can be loaded straight into the take-off
viewer), approved joint measurements, contractor RA claims and progress updates waiting in the inbox, and the
milestone summary. In connected mode a new project is created either in AORMS or from AQC's *Push online* (above).

### 4.2 Sync (AQC → database)

Generic, lossless, queryable store in `aorms-web` (all `firm_id`-scoped, RLS):

| Table | Holds |
|---|---|
| `aqc_projects` | one row per bound project: `project_office_id`, `format_version`, `settings jsonb` (levels, markups, covers, yields, link rules), `head_seq`, `lease_*` |
| `aqc_rows` | every row of every sheet/book: `(project_id, section, row_id, fields jsonb, deleted, updated_at, updated_by, seq)` |
| `aqc_versions` | immutable snapshots: estimate, BOQ, BBS schedule, certified bill/IPC, final account — `(kind, version, content_hash, summary jsonb, storage_key)` |
| `aqc_rate_books` / `aqc_rate_items` | firm-level versioned rate books shared across seats |
| `aqc_sessions`, `aqc_events` | the single active session per account (D8); monotonic per-firm `seq` for catch-up |

* **Row-level sync with an outbox**, as AQC's bridge already does: enqueue locally, flush in order, `seq`-checked.
* **Content-hash skip** for artifacts; PDFs/xlsx go to a private `aqc` bucket via signed URLs.
* **No service-role key on the desktop, no direct database access** — everything goes through versioned
  `/api/aqc/v1` routes that authorise, then use the caller's RLS-scoped client.
* **Contract:** `web/lib/aqc/contract.ts` (zod), mirrored into AQC with a version tag; breaking change bumps
  `aqc-contract`.

### 4.3 Show (database → portals)

Staff, client, contractor and collaborator pages read **typed projections**, not the raw store:

| Portal | Sees |
|---|---|
| Staff | Estimate and costing tab per project (latest version, history), BOQ/BBS files, schedule, bills, final account |
| Client | Estimate summary and schedule, only after staff mark a version *client-visible* |
| Contractor | Their package only: issued BBS, certified bills/IPC, measurement abstract, schedule, final account |
| Collaborator | Items explicitly shared |

Projections are written by the **sync route** from the version's `summary jsonb` (scalars AQC itself computed). The
web app never derives a figure from `aqc_rows`.

### 4.4 Concurrency and offline

* **Edit lease:** one writer per project at a time (`lease_holder`, `lease_expires_at`, heartbeat). A second user (or the same user
  after a session replace) opens read-only with an "edited by <name>" banner. Avoids inventing merge logic AQC does not have.
* **Offline:** unlimited; the outbox replays in order. Lease expiry rules decide who wins on reconnect; a stale
  `base_seq` is rejected and the user is offered "pull and reapply".
* **Deletes** are soft (`deleted=true`) so a replay can't resurrect or lose rows silently.

### 4.5 Closing the loop with the contractor portal

1. Contractor uploads a running bill with measurement lines and backup in the portal (exists).
2. It appears in AQC's **inbox** for that project.
3. Staff check it in AQC; AQC's engine computes deductions and certifies.
4. AQC syncs the **certified bill/IPC version**; AORMS shows it and sets `pmc_ra_bills.status = CERTIFIED`
   (the existing `cost:approve` guard still applies server-side, so certification is double-gated).
5. Payment received is recorded in AORMS (an office event).

## 5. Security

* Device-code / PKCE sign-in against Platform Auth; MFA honoured; refresh tokens in the OS credential store.
* Every route: verify JWT → resolve account → Studio → `firm_id` → capability → RLS. `firm_id` and `project_id` are
  **never** taken from the request body without the membership check.
* Signed uploads, size caps, file-signature validation (`lib/security/file-signature.ts`), private bucket, reads only
  via signed URL minted after an RLS lookup (the `/api/contractor-file` pattern).
* Single-session enforcement, per-account rate limits (`rate_limit_buckets`), `write_audit` on every state change.
* **Open-source consequence:** the AQC client is public, so *all* authorisation is server-side; the client is
  untrusted. That is also why there is nothing licence-shaped to crack.

## 6. Phases

| Phase | Work | Repo | Exit |
|---|---|---|---|
| **P0** | Adopt this plan: update CLAUDE.md (AQC is a connected product, not "removed"), ROADMAP | aorms | Docs merged |
| **P1 — Session** | `/api/aqc/v1/session`, device-code auth, `aqc_sessions` (single active session) | aorms | A Platform token returns `connected:true`; a non-member is refused |
| **P2 — Store + contract** | `aqc_*` tables, bucket, `projects` / `seed` / `rows` / `versions` / `inbox` / `lease` routes, zod contract, contract tests, RLS cross-firm denial tests | aorms | Contract tests green; second-firm token reads nothing |
| **P3 — Portal views** | Staff "Estimate & costing" tab; client/contractor read-only views with visibility flag; empty states | aorms | Browser QA per role with a seeded version |
| **P4 — AQC client** | Replace `Aorms.Bridge`: sign-in-first screen, online-projects list, *Push online* (one-time adopt), `_rid` ids, outbox sync of all sections, lease, versions upload; remove Connect/licence code; Community path untouched | AQC | Sign in → open portal project → edit → sync → visible in portal |
| **P5 — Contractor loop** | Inbox producer (bills, measurements, progress), certified-bill back-sync, status mapping | both | Contractor bill certified in AQC shows CERTIFIED in portal |
| **P6 — Rate-book library** | Firm-level versioned rate books shared across seats | both | Two seats see the same versioned book |
| **P7 — Freeze/migrate** | Banner on frozen AORMS estimation; one-way export of existing AORMS estimates/take-off/BBS into an AQC project | both | Export opens in AQC with identical totals (checked on a real estimate) |
| **P8 — Pilot** | One real Studio, security review, volume test of row sync | both | Sign-off |

Each phase: migration → verify live → browser QA → docs in the same pass (repo rule).

## 7. Resolved points and what remains

| Point | Resolution |
|---|---|
| Trial / expired Studio | Loses connected mode (D7) |
| Device cap | None; one active session per user (D8) |
| Adopt a local project | Yes, once, via *Push online*; login-first UI (D9) |
| Client visibility | Staff action per version (D10) |
| Pilot Studio / real file | None exists; synthetic fixture provided (§9). **Still needed:** one real AQC save to replace it before P4/P7 are signed off |

## 8. Risks

* **Large `.bbsproj`** (thousands of rows): row-level sync keeps writes small; initial sync is chunked.
* **Drift between the two repos' contracts:** one versioned contract file with tests on both sides.
* **Frozen AORMS estimation confusing users:** banner + export path (P7); no removal until a Studio has migrated.
* **Desktop sign-in friction:** long-lived refresh token, silent refresh, offline allowed for the lease duration.

## 9. Test fixture

`web/tests/fixtures/aqc/pilot-sample.bbsproj` — a synthetic G+1 residence in AQC's `.bbsproj` v17 layout (generated by
`make-pilot-sample.mjs`, documented in the folder's README). Contents: project/parties, 2 levels, RCC and civil
take-off rows (≈25 rows across 14 sheets), openings, an 8-activity schedule with FS/SS links, a work order, one
certified RA bill and a cash entry, stores/org stubs, default link rules, no estimate snapshot.
`web/tests/aqc-fixture.test.ts` checks it has exactly AQC's 47 top-level keys, string-valued id-less take-off rows,
resolvable references, a critical path through our ported CPM engine, and a bill that reproduces through our ported
billing engine. **Limit:** field names inside RCC member rows are best-effort — replace with a real AQC save when one
exists. Use: the P2 contract tests and the P4 client's import/sync tests load this file.
