# AQC client spec — connecting AQC-Core to AORMS

> **Status: 2026-10-09 — the AORMS side is built; this is the brief for the AQC repo** (`HolagundiWorks/AQC`, WinUI 3 + C++
> engine). It tells the AQC developer exactly what to call, in what order, and what to do on every error. Decisions and
> rationale: [`AQC-CONNECT-PLAN.md`](AQC-CONNECT-PLAN.md). Wire contract version: **`2026-10-aqc-1`**
> (`web/lib/aqc/contract.ts`). Every route below is under `/api/aqc/v1` on the AORMS host (e.g. `https://aorms.in`).
> Test material: `web/tests/fixtures/aqc/pilot-sample.bbsproj` and the demo accounts (`aditi.rao@aorms.in` owner,
> `demo@aorms.in` viewer — password in the demo-credentials doc).

## 1. What changes in AQC (and what must not)

* **Community mode is untouched.** Not signed in = today's behaviour: local `.bbsproj` files, no network calls, nothing sent
  to AORMS. The Connect launcher, `session.json`, `catalog.json`, licence keys, `ESTI_PRODUCT_API_KEY` and the old
  `/platform/v1/activate` + `/api/sync/*` calls in `Aorms.Bridge` are **removed**, not adapted — those endpoints no longer exist.
* **Connected (Pro) mode = signed in.** There is no licence key; the AORMS login is the licence. If the studio's plan lapses the
  server answers `403 not_connected` and AQC drops to Community behaviour (nothing is deleted, the outbox is kept).
* AQC stays AGPL; the entitlement check is server-side, so nothing in the client needs to be hidden or obfuscated.

## 2. First run and sign-in

1. App starts at **Sign in** (with a secondary *Continue without signing in* → Community).
2. `GET /config` (no auth) → `{ contract, supabaseUrl, supabaseAnonKey, endpoints, limits }`. Cache it; refuse to connect if
   `contract` is not a version the client knows (show "Update AQC").
3. `POST /auth/login` `{ email, password }` → `{ accessToken, refreshToken, expiresAt, userId, email }`.
   * `401 invalid_credentials` — show "Invalid login credentials" (same text for every cause).
   * `403 not_linked` — Identity-only user: "Sign in to AORMS on the web once with this account, then try again."
   * `403 pending` — "Your studio hasn't approved your access yet."
   * `429 rate_limited` — show `retryAfterSeconds`. `503 unavailable` — retry later.
4. `POST /session` with `Authorization: Bearer <accessToken>` and body `{ clientLabel: "AQC <version> · <machine>" }` →
   `{ sessionId, account, studio{firmId,name,publicId}, role, capabilities{write,"fees:manage","cost:approve"}, entitlement{connected,plan,expiresAt} }`.
   * `403 not_connected` (`reason`: `PLAN_NOT_CONNECTED` | `EXPIRED` | `NO_STUDIO`) → say why and offer Community.
   * `403 role_not_allowed` — portal accounts cannot use AQC.
5. **Every later call** sends `Authorization: Bearer <accessToken>` **and** `x-aqc-session: <sessionId>`.
6. Store `refreshToken` and `sessionId` in **Windows Credential Manager** — never in `firm.db` or a file.
7. Refresh the access token before `expiresAt` with Supabase's own grant:
   `POST {supabaseUrl}/auth/v1/token?grant_type=refresh_token`, header `apikey: <supabaseAnonKey>`, body `{ refresh_token }`.
   A failed refresh → back to Sign in.
8. **One active session per user.** Any call may return `409 session_replaced` ("You signed in to AQC on another computer").
   Stop syncing, keep the outbox, offer *Sign in here* (which calls `POST /session` again and takes the session back).
9. `GET /session` is the cheap health check (also refreshes `last_seen`). Poll it every ~60 s while a project is open.

## 3. Online projects, and pushing a local project online

After sign-in the home screen lists **Online projects** first and **Local projects** second.

* `GET /projects` → `{ projects: [{ projectOfficeId, ref, title, status, city, aqc: null | { id, headSeq, formatVersion, editedByOther, updatedAt } }] }`.
  Show "Being edited by someone else" when `editedByOther`.
* **Open an online project** (`aqc` is null — first time): `GET /seed/{projectOfficeId}` →
  `{ project, parties, projectOffice, packages[], drawings[{id,ref,title,rev,fileName,sizeBytes,file}], schedule[], aqc }`.
  Build a new `ProjectStore` from it: `project` → `ProjectInfo` (field names are AQC's own `ProjectInfo.ToJson`, including
  `hub_project_id`), `parties` → `PartyBook`. Then **Push** it (below) so the binding exists.
* **Open an online project that is already bound** (`aqc` set): pull rows — `GET /projects/{aqcId}/rows?since=0`, page with
  `nextSince` while `more` is true. The first page also carries `settings` (project-level JSON, §5). Rebuild the `ProjectStore`.
* **Push online** (a local project, or a project opened from the seed): `POST /projects` with
  `{ projectOfficeId, formatVersion: 17, settings, rows }` → `201 { aqcProjectId, headSeq, rows }`.
  * The user picks the target AORMS project from the `GET /projects` list (create the AORMS project on the web first).
  * `400 "That project already has an AQC project bound to it."` — a project binds **once**; offer *Open it instead*.
  * `403 forbidden` — the role lacks `write`. Viewers can open and read but not push.
  * After a successful push, write `hub_project_id` and the returned `aqcProjectId` into the `.bbsproj`; the file is now a cache.
* **Drawings:** `GET /files/drawing/{id}` → `{ url, expiresInSeconds: 300 }` — download straight into the take-off viewer
  (PDF/DXF). `503 storage_unavailable` → retry later.

## 4. Editing: lease, rows, outbox

* **Edit lease (one writer per project).** `POST /projects/{aqcId}/lease` → `{ held: boolean }`. Call it when a project opens for
  editing, then **every 60 s** (the lease lasts 120 s and every successful row push also renews it). `held:false` → open
  **read-only** with "Being edited by <someone>" and re-try every 30 s.
* **Row ids.** AQC take-off rows are `Dictionary<string,string>` with no id. On first sync mint a GUID (32 hex chars) per row and store
  it **inside the dictionary as `_rid`**; use it as `row_id`. It round-trips in `.bbsproj` and is ignored by the calculators.
  Rows that already have an `id` field (contracts, bills, suppliers …) use that.
* **Change tracking.** Keep a dirty set of `(section,row_id)` plus tombstones. `ProjectStore.Notify()` marks dirty; deletions are sent as
  `deleted:true` (the server soft-deletes).
* **Outbox flush.** Debounce 2 s. `POST /projects/{aqcId}/rows` with `{ rows: [{ section, row_id, fields, deleted? }] }`, ≤ **500 rows per
  request** (server cap 2000) → `{ headSeq }`. Send in order.
  * `423 lease_required` — you don't hold the lease (expired or another user). Stop flushing, re-acquire; if not held, go read-only and **keep**
    the unsent rows for review.
  * `403 forbidden` — role can't write. `409 session_replaced` — see §2.8. `400` — drop the batch's offending row and report it.
  * Network failure — keep everything, retry with back-off; AQC is local-first and can be offline for days.
* **Catch-up (read-only or after reconnect).** `GET /projects/{aqcId}/rows?since=<lastHeadSeq>` and apply: upsert by `(section,row_id)`;
  `deleted:true` removes the row. Never apply a delta over local unsent changes without telling the user (offer *Pull and reapply*).
* **Settings.** Project-level JSON (levels, markups, covers, yields, τbd/fy tables, link rules, project info, concrete-from-RMC flag):
  sent in `POST /projects`, and replaced later with `PUT /projects/{aqcId}/settings` `{ settings }` (needs the lease; `423 lease_required` otherwise;
  1 MB cap). Send it whenever any of those values change; it comes back with the first rows page (`since=0`).

## 5. What goes where — `.bbsproj` v17 → contract sections

`fields` values are strings, numbers, booleans or null (AQC's string dictionaries pass through unchanged).

| `.bbsproj` key | `section` | Row id |
|---|---|---|
| `columns`, `beams`, `pedestals`, `lintels`, `slabs`, `footings`, `walls`, `stairs` | same name | `_rid` |
| `masonry` · `masonry_openings` · `plaster` · `finish_propose` · `pcc` · `earthwork` · `ssm` · `shuttering` · `flooring` · `painting` · `waterproofing` · `dpc` · `coping` · `screed` · `vdf` · `skirting` · `parapet` · `plinth_protection` · `doors` · `windows` | same name | `_rid` |
| `schedule.activities[]` (id, name, duration, percent, wbs, x, y, links[]) | `schedule_activities` (links nested in `fields`) | activity `id` |
| `contracts.contracts[]` / their `lines[]` | `contracts` / `contract_lines` (line id = `<contractId>:<index>`) | contract `id` |
| `accounts.bills[]` / their `lines[]` | `bills` / `bill_lines` (`<billId>:<index>`) | bill `id` |
| `accounts.transactions[]` | `transactions` | txn `id` |
| `office.documents[]` | `documents` | doc `id` |
| `stores.suppliers/warehouses/orders/grns/issues` | `suppliers` · `warehouses` · `orders` · `grns` · `issues` | `id` |
| `org.sites/resources/employees/payroll` | `sites` · `resources` · `employees` · `payroll` | `id` |
| `link_rules[]` | `link_rules` | rule `id` |
| everything else (`project`, `parties`, `estimate_markups`, `settings`, `levels`, `concrete_from_rmc`, `takeoff`, counters, prefixes) | project **settings** JSON | — |
| `last_estimate` | **not synced as rows** — published as a version (§6) | — |

The `takeoff` block (PDF path, scale, drawn items) holds a local file path, so it stays local; committed take-off rows are already in the sheets above.

## 6. Versions (what portals and certificates show)

`POST /projects/{aqcId}/versions` `{ kind, contentHash, summary, storageKey? }` → `201 { version }`. The same `contentHash` for the same `kind` returns the
existing version (idempotent). Kinds and who may add them: `estimate`, `boq`, `schedule` (`fees:manage`); `running_bill`, `ipc`, `final_account`
(`cost:approve`); `bbs`, `joint_measurement` (`write`). `403 forbidden` otherwise.

`summary` is free JSON, but AORMS reads these keys (all **integer paise**; convert AQC's rupee `double` with *round half away from zero*):

| kind | keys read by AORMS |
|---|---|
| `estimate` | `grandTotalPaise` (shown in staff `/aqc` and the client portal), optional `label` |
| `ipc` | `billId` (the AORMS bill id), `grossPaise`, `netPaise` — **`billId` is what makes it visible to that contractor** |
| `final_account` | `finalValuePaise` |
| others | any |

**Attaching a file (PDF/XLSX/CSV/PNG/JPEG, ≤ 25 MB):**
1. `POST /projects/{aqcId}/files` `{ kind, contentType, sizeBytes, sha256 }` (sha256 = 64 lowercase hex) → `201 { storageKey, uploadUrl }`.
2. `PUT <uploadUrl>` with the bytes and the same `Content-Type`.
3. `POST …/versions` with `storageKey` from step 1. A key outside the firm/project prefix is rejected.

Use the file's SHA-256 as `contentHash` for a pure-file version so republishing the same PDF is a no-op.

## 7. Contractor bills (the inbox loop)

* `GET /inbox?projectOfficeId=<id>&since=<iso>` → `{ bills[], submissions[], now }`. Bills are contractors' submitted running bills
  (`status` DRAFT/SITE_CHECKED) with `lines[{description,unit,previous_qty,this_qty,rate_paise,amount_paise}]`, the statutory terms
  they chose (`retention_pct`, `gst_pct`, `tds_pct`, `cess_pct`, `gst_tds_pct`) and a `backup` file link (`GET /files/bill/{id}`).
  Submissions are progress updates, joint-measurement / site-visit / meeting requests.
* Show them in AQC's *Accounts* as "From contractor portal"; the user checks measurements and applies AQC's own calculation.
* **Certify:** `POST /bills/{billId}/certify` `{ retentionPaise, gstPaise, tdsPaise, cessPaise, gstTdsPaise, advanceRecoveryPaise, otherDeductionPaise,
  contentHash?, aqcProjectId? }` → `{ certified, version }`. Needs `cost:approve`; `409 already_certified` if done. Passing `contentHash` +
  `aqcProjectId` also stores the immutable `ipc` version (with `netPaise` computed for the contractor's statement).
* AQC never changes a bill's gross — it records AQC's deductions on the contractor's claim. Gross corrections go back to the contractor.

## 8. Shared rate books

* `GET /rate-books` → `{ versions: [{ id, client_id, name, notes, revision, item_count, is_active, content_hash, updated_at }] }`. On sign-in,
  merge into `RateBookStore`: match on `client_id` (= AQC's `RateBookVersion.Id`); a higher `revision` than the local one → offer to update.
* `GET /rate-books/{id}` → `{ version, items[{code,category,description,unit,rate}] }` (order = AQC's order).
* `POST /rate-books` `{ clientId, name, notes, items[], activate }` → `201 { versionId, revision, changed:true }` or `200 … changed:false`
  (server-side hash). Duplicate `code`s → `400 duplicate_codes`. Needs `fees:manage`.
* `POST /rate-books/{id}/activate` → makes it the studio's active book. Rates are AQC's raw rupee values — do not convert.

## 9. UX the server assumes

| Situation | AQC shows |
|---|---|
| Signed in, project synced | Status chip *Synced* with last change time |
| Offline / pending outbox | *Offline — N changes waiting* |
| Read-only (lease not held, or `VIEWER`) | Banner *Edited by <name>* / *View only*; editing disabled |
| `session_replaced` | *You signed in on another computer* + **Sign in here** |
| `not_connected` | Reason + **Continue in Community** |
| Role lacks a capability | Hide/disable the action (the server still enforces it) |

## 10. Build order in the AQC repo

| Step | Work | Done when |
|---|---|---|
| A1 | Replace `Aorms.Bridge` internals: config, login, session, token store (Credential Manager), refresh, `session_replaced` handling; delete Connect/licence code | Sign in with the owner demo account; `GET /session` shows `connected:true` |
| A2 | Home screen: online projects list + local list; open from seed; `_rid` minting | Open a demo project; title block and parties are filled |
| A3 | Lease + outbox + row push/pull; map every section in §5 | Push `pilot-sample.bbsproj` (20+ rows); edit one row; a second client sees the delta |
| A4 | Versions + file upload (estimate, BOQ, BBS, schedule) | An estimate PDF appears in AORMS `/aqc` with its total; releasing it shows it in the client portal |
| A5 | Inbox + certify | A contractor bill is certified in AQC and shows as certified in the contractor portal |
| A6 | Rate books | Two machines share one active book |
| A7 | Hardening | Offline for days replays correctly; lease expiry mid-edit; token refresh failure; large project (10k rows) pushes in chunks |

Reference implementation of every call: `web/tests/fixtures/aqc/demo-e2e.mjs` (Node, runnable against a deployment).
