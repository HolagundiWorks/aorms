# AQC ↔ AORMS connection — plan of action

> **Status: PROPOSED (2026-10-08) — not yet decided.** Written at the user's direction: *estimation and costing will be
> handled by AQC; the AORMS portal is for uploading and viewing; Community is free; Pro connects AORMS and AQC for the
> AQC portal; AQC requires an AORMS login.* Section 1 lists where this conflicts with what the repo currently says —
> those need an explicit decision (section 9) before build starts, per CLAUDE.md § Process.

## 0. The decision in one paragraph

**AQC** (HolagundiWorks/AQC, "AQC-Core", WinUI 3 + C++ engine, AGPL Community / commercial dual-licence) is the
**system of record for quantities, estimates, rate books, BBS, running-account bills and schedules** — the engine
produces the numbers. **AORMS** (`web/`, Next.js + Supabase) is the **office hub and the three outside portals**: it
stores what AQC *publishes* (PDFs, abstracts, scalar totals), shows it to the right people (staff, client, contractor,
consultant) and takes uploads back (contractor bills and measurements, site photos). **Community** AQC runs standalone
and free, exactly as today. **Pro** connects an AQC install to a Studio's AORMS workspace; connected mode needs an AORMS
Platform login and a Pro entitlement.

## 1. What the repo says today, and what changes

| Today | Source | Under this plan |
|---|---|---|
| AQC is listed as *removed, separate repos* | CLAUDE.md "Removed (legacy)" | AQC becomes a **connected product** (still its own repo). Update the list. |
| `web/` has its own rate books, estimates, BOQ, take-off (17 categories), BBS, markup cascade, derivation | ROADMAP § History (2026-09-06/07/08) | Under the split these are **not extended further**. Decide: keep as the *Community fallback inside AORMS* or retire after Pro ships (section 9, Q1). |
| PR #134 adds linked-item derivation to `web/` estimates | open PR | **Do not merge that part** — it deepens the module the plan hands to AQC. The contractor-side views in the same PR (measurement abstract, steel, final account) are viewing, not estimating, and are fine. |
| Contractor submits RA bills with measurement lines and the AORMS database computes deductions | PR #132 | Keep the *upload*; stop treating AORMS as the calculator. Certification and the Interim Payment Certificate move to AQC and are published back (section 5). |
| AQC's bridge targets `POST /platform/v1/activate`, `/api/sync/meta`, `/api/sync/ingest`, HLP licence keys and an "AORMS Connect" `session.json` | AQC `docs/AORMS-BRIDGE.md`, `PROJECT-SYNC.md` | That hub (Fastify + `esti_sync_record`) **no longer exists** and Connect was removed. The *design* (outbox, allow-list, content-hash skip, LWW policy) is reusable; the *endpoints and auth* are rewritten (sections 3–4). |
| Plans: `licences.plan` = TRIAL / STANDARD / PREMIUM (per Studio, per seat); `identity_licences` = FREE / AORMS_IDENTITY (per person) | `platform/supabase/migrations/0004`, `0010`, `0017` | Add the **Pro entitlement** to the Studio licence (section 6). "Community" is the absence of a connected entitlement, not a new row. |
| Identity authority is the `aorms-platform` Supabase project (`accounts`, `AORMS-U-`) | AORMS-PLATFORM-ARCHITECTURE | AQC signs in against it. No new identity system. |

## 2. Roles — who owns what

| Concern | AQC | AORMS |
|---|---|---|
| Rate books, estimates, markups, derivation, BOQ, BBS, take-off | **Owns, computes** | Stores the published result, never recomputes |
| RA bill calculation, statutory deductions, IPC, final account | **Owns** | Shows published statements; contractor *uploads* claims and measurements |
| Schedule (CPM/PERT, Gantt) | **Owns** | Shows published schedule; contractor posts progress updates |
| Projects, clients, contractors, people, permissions | Reads (catalogue) | **Owns** |
| Drawings register, transmittals, approvals, tenders | Reads / contributes | **Owns** |
| Money rules | Integer paise end to end; AQC is the source of truth for derived money | Display only; never edits a published figure |
| Portals (client, contractor, collaborator) | — | **Owns** |

Principle (inherited from AQC): *the engine is the single source of truth for numbers.* AORMS never writes a
derived quantity or amount; it only stores, versions and displays what AQC published.

## 3. Architecture

```
AQC desktop (Pro)                       AORMS web (Next.js)                     AORMS Platform (Supabase)
─────────────────                       ───────────────────                     ─────────────────────────
Engine + local .bbsproj / SQLite
 │  sign in (device-code / PKCE) ───────────────────────────────────────────►  Auth: accounts (AORMS-U-)
 │◄───────────── platform access token ◄─────────────────────────────────────
 │  GET /api/aqc/v1/entitlement ─────►  verify JWT with Platform ───────────►  licences (Studio plan + aqc_connect)
 │  GET /api/aqc/v1/catalog  ────────►  projects the caller may publish to (firm_id scoped, RLS)
 │  POST /api/aqc/v1/publications ───►  metadata + content hash → returns signed upload URL(s)
 │  PUT  signed URL (PDF/xlsx) ──────►  private bucket `aqc-publications`
 │  POST …/publications/{id}/commit ─►  row in aqc_publications, event in aqc_sync_events
 │  GET  /api/aqc/v1/inbox?since=seq ►  contractor bills, measurements, progress, approvals to act on
Portals (staff, client, contractor) read aqc_publications through RLS — read-only "Estimate & costing" views.
```

* **Two Supabase projects stay as they are.** Entitlement is read from the Platform; publications live in `aorms-web`
  (the Studio's own data, `firm_id` on every row, RLS `firm_id = current_firm_id()` like the other ~90 tables).
* **AQC never gets a service-role key and never talks to Postgres.** It calls the versioned `/api/aqc/v1` routes with a
  user access token; the route does the authorisation and uses the caller's RLS-scoped client for reads/writes
  (service role only for storage signing, as `lib/receipts/upload.ts` already does).
* **Contract** lives in `web/lib/aqc/contract.ts` (zod) and is copied to AQC as `docs/SYNC-CONTRACT.md` with a version
  tag; breaking changes bump `aqc-contract` (the existing AQC versioning rule).

## 4. Data plane

**Bind.** An AQC project is bound once to an AORMS `project_offices.id` picked from `/catalog`. The id is stored in the
`.bbsproj` (`HubProjectId`, already in AQC's `ProjectInfo`). Unbound projects never publish.

**Publish allow-list** (additive only; everything else stays local):

| Entity | Form | Shown to |
|---|---|---|
| `estimateSummary` (totals, markups, version, date) | scalars + PDF | staff, client (when marked client-visible) |
| `boq` / `rateAbstract` | PDF + xlsx | staff |
| `bbsSchedule` | PDF + xlsx | staff, contractor (when issued) |
| `runningBill` / `ipc` (certified) | scalars + PDF | staff, contractor (own package), client (when sent) |
| `jointMeasurement` (approved abstract) | scalars + PDF | staff, contractor (own) |
| `schedule` (activities, dates, critical flags, % complete) | JSON | staff, client, contractor (own) |
| `finalAccount` | scalars + PDF | staff, contractor (own) |

**Never sync:** AI transcripts, measurement scratch, draft estimates, unissued drawings, local rate-book internals.

**Versioning.** Each publish is a new immutable version `(project, entity, entity_id, version)`; the portals show the
latest *issued* version and keep the history (same idea as drawing revisions). Content-hash skip: republishing identical
bytes is a no-op.

**Pull (inbox).** AQC polls `/inbox?since=<seq>` for things it must act on: contractor RA-bill claims and measurement
lines, progress updates, approvals. Acting on one publishes the result (e.g. a certified bill). The contractor portal
upload that exists today (PR #132) is the producer for this inbox.

**Conflict policy** (from AQC's bridge doc, tightened): AQC wins on every derived number; AORMS wins on project
metadata, people and permissions; task-like fields are last-writer-wins per field; every write carries the last seen `seq`
and is rejected if stale.

**New tables (aorms-web):** `aqc_installs` (device registration, revocable), `aqc_publications` (versioned rows + storage
key + content hash + visibility), `aqc_sync_events` (monotonic `seq` per firm for catch-up), `aqc_inbox_acks`.
All carry `firm_id`; write access only through the `/api/aqc/v1` routes for a user with the right capability
(`fees:manage` for estimates, `write` for bills, `cost:approve` to certify — existing capability names).

## 5. Contractor, client and consultant loops

1. Contractor uploads a running bill with measurement lines and backup (exists) → lands in the AQC inbox.
2. Studio staff open it in AQC, check measurements, apply statutory deductions with AQC's engine, certify.
3. AQC publishes the certified bill / IPC → the AORMS bill status becomes CERTIFIED (the existing
   `pmc_ra_bills_certify_guard` and `cost:approve` rule still apply on the AORMS side, so certification is double-gated).
4. The contractor sees the certified statement, retention and balance in the portal; payment-received dates are still
   recorded in AORMS (migration 0103) because payment is an office event, not an engineering one.
5. The client portal shows the estimate summary and schedule once marked client-visible.

## 6. Licensing — Community vs Pro

| | Community (free) | Pro |
|---|---|---|
| AQC desktop | Full engine, local files, AGPL | Same engine |
| Login | **Not required** | AORMS Platform login required (connected mode) |
| Sync with AORMS | None | Bind, publish, pull inbox |
| Portals' "Estimate & costing" views | Empty state ("not connected") | Populated |
| AORMS office hub | Free tier as defined on the landing page | Studio on a paid plan |

* Entitlement = a Studio licence that is active **and** carries the `aqc_connect` feature. Implement as a column
  `licences.features text[]` (or a new `PRO` plan row in `plan_pricing` — Q2) so entitlement stays a data change, not a
  deploy. The route `/api/aqc/v1/entitlement` returns `{ plan, connected: boolean, seats, expiresAt }`.
* Payment reuses the Razorpay flow already in place for Studio licences (`payments`, verified-webhook only; the
  self-serve free-edit hole in 0011 stays closed).
* **Seat model:** one seat = one signed-in person; `aqc_installs` caps devices per seat (Q4).
* **AGPL note:** the dual-licence in AQC's `LICENSING.md` is unchanged; a hosted/SaaS use of AQC itself still needs a
  commercial licence. The connector in AQC stays open source; the *entitlement check* lives server-side in AORMS.
* **Grace:** if the entitlement lapses AQC drops to Community behaviour (local work continues, publishing pauses,
  nothing is deleted); already-published versions stay visible in AORMS read-only.

## 7. Security

* AQC sign-in: OAuth 2.0 **device-code** (or loopback PKCE) against Platform Auth — no password in the desktop app, MFA
  respected (the Platform already has `/platform-mfa`). Tokens kept in Windows Credential Manager, not in `firm.db`.
* Every route: verify JWT → resolve account → resolve Studio and `firm_id` → check entitlement → check capability →
  RLS-scoped query. Never trust a project id from the client without the catalogue check.
* Uploads: signed URLs, size caps, file-signature validation (`lib/security/file-signature.ts`), private bucket, reads
  only through a signed URL minted after an RLS row lookup (the same pattern as `/api/contractor-file`).
* Device registry with revoke; per-device rate limiting (`rate_limit_buckets` exists); audit via `write_audit`.
* Threat to design for: a stolen AQC token publishing into the wrong Studio → catalogue and `firm_id` come from the
  token's membership, never from the request body.

## 8. Phases

| Phase | Work | Repo | Exit |
|---|---|---|---|
| **P0 — Decide** | Answer section 9; update CLAUDE.md (AQC no longer "removed"), ROADMAP, this doc to "Decided" | aorms | Written decisions; PR #134 scoped |
| **P1 — Entitlement + login** | `features`/Pro on Studio licence; `/api/aqc/v1/entitlement`; device-code auth; `aqc_installs`; admin toggle in `/admin/licences` | aorms (+ platform migration) | A test Studio is Pro; a curl with a Platform token returns `connected: true` |
| **P2 — Ingest** | Tables, bucket, `catalog` / `publications` / `commit` / `inbox` routes, contract + tests, audit | aorms | Contract tests green; RLS cross-firm test denies |
| **P3 — Portal views** | Read-only "Estimate & costing" on project, client and contractor pages; empty states; visibility flag | aorms | Seeded publication visible to the right roles only (browser QA per role) |
| **P4 — AQC bridge** | Rewrite `Aorms.Bridge`: sign-in, entitlement gate, bind, outbox, publish, pull; keep Community path untouched; remove Connect/`session.json` dependency | AQC | End-to-end: sign in → bind → publish → appears in portal |
| **P5 — Contractor loop** | Inbox producer for bills/measurements/progress; certified bill and IPC back-publish; status mapping | both | A contractor bill is certified in AQC and shows CERTIFIED in the portal |
| **P6 — Billing** | Pro plan price, Razorpay checkout, lapse/grace handling, pricing page copy | aorms | Paid Studio turns connected on; lapse turns it off cleanly |
| **P7 — Retire/freeze web estimation** | Per Q1: banner "managed in AQC", then hide or keep as Community fallback; export to AQC import format | aorms | No new feature work in `web/` estimation |
| **P8 — Pilot + hardening** | One real Studio, security review, load test of publish, docs | both | Pilot signed off |

Each phase follows the repo rule: migration → verify live → browser QA → docs in the same pass.

## 9. Decisions needed before P1

1. **Q1 — Existing `web/` estimation:** keep as the in-AORMS Community fallback, freeze read-only, or retire after Pro?
   (Recommendation: freeze — no new work, keep readable, export to AQC.)
2. **Q2 — Plan shape:** add a feature flag to existing STANDARD/PREMIUM, or a distinct **PRO** plan? What is the price
   and is it per seat or per Studio? (Recommendation: feature flag + a named plan row for pricing display.)
3. **Q3 — Does Community AQC need any login?** The brief reads as "Community is standalone, login only when connecting".
   Confirm — if Community must also sign in, offline use and the AGPL story change.
4. **Q4 — Device limit per seat** (e.g. 2 installs) and whether a team seat can share an install.
5. **Q5 — Client visibility:** is publishing to the client portal automatic once issued, or a separate "release to client"
   step in AORMS?
6. **Q6 — Scope of the first release:** estimate summary + schedule only (smallest useful), or include running bills and
   IPC from day one? (Recommendation: summary + schedule first, bills in P5.)
7. **Q7 — AQC's own remaining bridge assumptions:** does anything else in AQC still depend on the old hub or Connect
   (Joint Measurement pull, project catalogue)? Needs a read of AQC's `Aorms.Bridge` project before P4 is estimated.

## 10. Risks

* **Two sources of numbers during transition** — mitigated by freezing `web/` estimation (Q1) and never recomputing
  published figures.
* **Desktop auth UX** — device-code is slower than a saved password; mitigate with long-lived refresh tokens in the
  credential store and silent refresh.
* **Offline** — AQC is local-first; the outbox must tolerate days offline and replay in order with `seq` checks.
* **Contract drift between two repos** — one versioned contract file, copied with a tag, contract tests in both repos.
* **Licence lapse mid-project** — defined grace behaviour (section 6) so work is never held hostage.

## 11. What I would build first

P0 decisions, then **P1 + P2** together in AORMS (entitlement, device registry, ingest routes, tables, contract tests) —
they are independent of any AQC change and make the AQC side testable with a stub client. P4 can then start against a
live, tested API instead of a paper design.
