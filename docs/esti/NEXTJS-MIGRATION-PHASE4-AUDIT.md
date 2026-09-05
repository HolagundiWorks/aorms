# Phase 4 repo audit — Technical (estimation, BOQ, measurements, documents, drawings)

**Status:** Draft audit, not yet reviewed against a Phase 4 implementation
**Date:** 2026-09-04
**Scope:** Per [NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md) § 36–37
and [ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md)'s Phase 4 definition — maps
Estimation, BOQ, measurements, the unified document register, and drawings onto
the target Next.js + Supabase stack. Same audit shape as Phases 2–3; later
phases (Reporting, Advanced processing, AI) get their own pass when their turn
comes.

---

## Correction to the Phase 3 audit — `recordDocumentIssue` is this phase's, resolved

The [Phase 3 audit](./NEXTJS-MIGRATION-PHASE3-AUDIT.md) flagged
`recordDocumentIssue()` as an open question ("fold into `audit_log` vs. port
separately") without resolving it. Now resolved: it isn't a question, it's this
phase's **Documents** domain. `esti_document_issue` is a real, purpose-built
table — an immutable per-version issue record shared by *every* issuable
document type (`DocumentEntityType`: LETTER, CONTRACT, PROPOSAL, TRANSMITTAL,
INSPECTION, SPEC_SHEET, MOOD_BOARD, MOM, FEE_PROPOSAL), separate from
`audit_log` on purpose — `audit_log` is a generic before/after diff of any
mutation; `documentIssues` is specifically "this document was issued as version
N, with this revision/impact note, by this person, at this PDF." Keep them
separate in Supabase too — don't merge them.

---

## Scope map — what "Estimation, BOQ, measurements, documents, drawings" actually is

Five names in the roadmap line, six domains in the codebase once mapped:

1. **Rate Books** (`rateBooks`) — firm-level, versioned item-code/unit/rate sets.
2. **Estimates** (`estimates` + `estimateItems` + `estimateMeasurements`) — a
   project's priced BOQ against one rate book, with a per-item measurement book.
   This *is* "BOQ" and "measurements" from the roadmap line — they are not
   separate tables, they're two facets of one `estimates` domain.
3. **Documents** (`documentIssues` + `officeTemplates` + `moms`/`momActions`,
   `documentRouter`) — the unified cross-entity document register, reusable
   templates, numbering-pattern settings, and meeting minutes. Depends on
   letters/contracts/proposals (Phase 3) and transmittals/inspections/spec
   sheets (this phase) all existing first — see landing order.
4. **Transmittals** (`transmittals` + `transmittalItems`) — drawing-issue
   tracking with client/consultant acknowledgment.
5. **Spec sheets** (`specSheets` + `specItems`) — per-project material
   specification documents (distinct from the Knowledge Bank's `specCatalog`,
   which is a firm-wide reference library, not a project document — don't
   conflate the two when naming Supabase tables).
6. **Drawings** (`drawings`) — DXF register with worker-driven takeoff (layers,
   bounds, entity counts) and an issue-set PDF.

**Explicitly out of this phase's scope** (adjacent, but not named in the
roadmap line and each large enough to deserve its own audit pass if picked up):
**BBS + steel reconciliation** (`bbs`/`steelReconciliation` namespaces, IS 456
cutting-length engine, `write`-gated with `cost:approve` finalize — CLAUDE.md
groups these under "Delivery", not "Technical") and the **measurement-book /
plan-markup / joint-measurement complex** (`measurementBooks`, `buildingLevels`,
`measurementRows`, `planMarkupSets`/`Items`, `sheetCalibrations`,
`jointMeasurements` — a browser-based canvas takeoff tool that *estimates* can
optionally import from via `importMeasurements`/`sourceMeasurementRowId`, but
which is its own large feature: PDF.js-rendered plan calibration, freeform
markup layers, and a joint (multi-party) measurement recording mode). Estimates
work standalone without it (manual measurement-book rows, nos × L × B × D by
shape); the import path is a nice-to-have wired to a feature this audit
deliberately doesn't cover. **Decide before implementation** whether this phase
ships Estimates without the import path (recommended — smaller, decoupled slice)
or pulls the whole plan-markup/joint-measurement feature in too.

---

## Shared/cross-cutting pieces this phase depends on

- **Numbering** (`sequences`/`next_ref()`) — from Phase 3. Estimates, drawings,
  transmittals, spec sheets, and MOMs all mint a ref the same way proposals/
  invoices did (`EST`, `DRG`, `TRN`, `SPC`, `MOM` prefixes per
  `DEFAULT_NUMBERING_SCOPES`).
- **Retention guards** (`requireDeletableStatus`/`requireUnissuedDocument`) —
  from Phase 3, reused again here (estimates delete-guard, drawing/spec-sheet
  issue-guard).
- **`fees:manage` vs. plain staff access** — Rate Books and Estimates are
  `fees:manage`-gated (same capability, same `is_partner_or_above()` RLS helper
  as Proposals in Phase 3 — they expose firm cost/pricing data). Drawings,
  transmittals, spec sheets, MOMs, and the document register itself are plain
  `protectedProcedure` (`is_office_staff()`), same pattern as Letters/Contracts
  in Phase 3. Don't apply the financial-tier RLS to the wrong half.

---

## Rate Books + Estimates (BOQ + measurement book)

| | Current | Target |
| --- | --- | --- |
| Tables | `rateBooks`/`rateBookItems`, `estimates`/`estimateItems`/`estimateMeasurements` (`backend/src/db/schema/estimation.ts`) — ported 2026-07-18 from the [Construction-Billing-System](https://github.com/HolagundiWorks/Construction-Billing-System) domain model | Direct port, all five tables |
| Business logic | All pure functions in `packages/contracts/src/estimation.ts`: `shapeForUnit()`/`measurementQuantity()` (nos × L × B × D → quantity, shape-aware: COUNT/LENGTH/AREA/VOLUME/WEIGHT/LUMPSUM), `estimateItemAmountPaise()`, `computeEstimateTotals()`/`computeEstimateTotalsFromSubtotal()` (contingency % + GST % rollup), `canTransitionEstimate()` (`DRAFT→FINALISED→APPROVED`, `CANCELLED` from either), `isEstimateEditable()`/`estimateLockedError()` | Same pattern as Phases 2–3: land verbatim in `web/lib/services/estimation.ts`, call from Server Actions. This is the largest concentration of portable pure business logic found in any phase so far — a strong argument for doing this phase's services layer first, then the Server Actions are thin wrappers |
| `upsertItem`/`upsertMeasurement`/`removeMeasurement` | Not simple upserts — every measurement-line write **recomputes the parent item's quantity server-side** (`recomputeItemFromMeasurements()`, not audited line-by-line here but referenced throughout the router) and every header edit (contingency/GST %) re-triggers a totals recompute (`enqueueEstimateTotalsForId()`). The lock check (`assertEstimateEditable`/`assertEstimateEditableForItem`) runs before every mutation, not just at the estimate level — a FINALISED estimate's items are locked even though the estimate row itself still updates status | Port as one `recomputeItemFromMeasurements()` service function called after every measurement write, same as the current router; don't let a Server Action skip the recompute step the way a naive direct-Supabase-write from the client could. This is exactly the "business logic shouldn't live directly in a Server Action, and shouldn't be re-derivable by a client-side write" case the spec's §13 is for — consider whether recompute should happen in a Postgres trigger (defense in depth against a future direct-SQL write bypassing the Server Action) rather than only in application code, given RLS alone doesn't stop a staff member's own client from writing a stale computed quantity |
| `enqueueEstimateTotalsForId` | Named like a queue job but (per the code read here) triggers a synchronous recompute for connected peers/subscribers — **not confirmed to depend on Redis/the Python worker**; worth a closer read before porting to confirm it's pure Postgres/application logic and not another Phase 6 dependency like PDF/DXF rendering | Flagged rather than resolved — check `enqueueEstimateTotalsForId`'s implementation before deciding whether this blocks on Phase 6 |
| Capability | `fees:manage` on both Rate Books and Estimates | `is_partner_or_above()` RLS (same helper Phase 3 introduces for Proposals/Invoices) |

**Frontend:** no dedicated route files were found in the module map for a
"RateBookLibrary"/estimate UI beyond what's listed in `CLAUDE.md`
(`RateBookLibrary.tsx` — Library › Rate Books; the Estimation tab lives inside
`ProjectDetail.tsx`). New Carbon-only pages, not ports, same as every other
phase.

---

## Documents (register, templates, numbering settings, MOMs)

| | Current | Target |
| --- | --- | --- |
| Tables | `documentIssues`, `officeTemplates`, `moms`/`momActions` (`backend/src/db/schema/documents.ts`) | Direct port |
| Business logic | `listDocumentRegister()` (`backend/src/modules/document/readModels.ts`) — a fan-in read model that queries letters/contracts/proposals/transmittals/inspections/specSheets/moms and normalizes them into one `DocumentRegisterRow` shape (`issuedStatus()` derives ISSUED/DRAFT from `pdfStatus` when no explicit status exists); `registerExportRows()` — CSV/export shaping of the same | This must land **last** in this phase (and depends on Phase 3's letters/contracts/proposals too) — it queries seven other tables that all need to exist first. Port as a Server Component doing seven Supabase queries + the same normalize function (or, if performance matters at ~100 users' scale, a Postgres view/function unioning them — the current implementation does it in application code, which is fine to keep as-is per "don't rewrite blindly") |
| `revise` | A single mutation with an entity-type branch (`INSPECTION`/`SPEC_SHEET` handled today; other types throw `BAD_REQUEST` — **not yet wired for every `DocumentEntityType`**, this is an existing gap in the current system, not something to silently "complete" during migration) — bumps `versionNo`, resets `pdfStatus`/`pdfKey` to force re-render, and calls `recordDocumentIssue()` | Port the same two branches (inspection, spec sheet) with the same gap; don't expand scope to cover every entity type unless asked — that would be new functionality, not a migration |
| `numberingPatterns`/`setNumberingPatterns` | Per-scope prefix/padding override stored on the single-row `esti_orgsettings`, `ownerProcedure`-gated (**owner-only, not partner** — narrower than the `fees:manage`/`invoice:manage` tier) | RLS: needs a role check narrower than `is_partner_or_above()` — reuse `current_app_role() = 'OWNER'` directly (Phase 2's migration already used this exact check for `firm: owner/partner update`... actually that one allows PARTNER too — numbering settings should be **OWNER only**, don't copy that policy verbatim) |
| Templates | Plain CRUD, `protectedProcedure` (any staff can create/read templates; delete has no retention guard, unlike almost everything else in these three phases) | Direct port, `is_office_staff()` RLS, no special guard on delete (matches current permissiveness — don't add one as a side effect) |

**Frontend:** no dedicated document-register route was found in the frontend
route table in `CLAUDE.md` — likely a component embedded elsewhere (Office
documents area) rather than a standalone page; confirm during implementation
rather than assuming a 1:1 route exists.

---

## Transmittals & Spec sheets

| | Current | Target |
| --- | --- | --- |
| Tables | `transmittals`/`transmittalItems`, `specSheets`/`specItems` | Direct port |
| tRPC | `transmittal.{listByProject,byId,create,acknowledge,generatePdf}`, `spec.{listByProject,byId,create,generatePdf,remove}` — both `protectedProcedure` | Standard Server Component (list/byId) + Server Action (create/generatePdf/remove) split, `is_office_staff()` RLS |
| `acknowledge` | One-way receiver acknowledgment (SOP §3) — stamps `acknowledgedAt`/`acknowledgedBy`/`acknowledgmentNote`; can be stamped by staff *or* the client portal (per the schema comment) | Client-portal write access to a staff-owned table is a cross-cutting RLS question the Phase 2 audit didn't need to answer yet (Phase 2 had no portal-facing writes). Needs a policy like `clients: own portal read` from Phase 2's migration, but for **write**, scoped to only the `acknowledgedAt`/`acknowledgedBy`/`acknowledgmentNote` columns on a transmittal tied to the client's own project — Postgres RLS can't do column-level restriction directly, so this likely needs a dedicated `acknowledge_transmittal()` RPC function (`security definer`, narrow, validates the caller is that transmittal's project's client) rather than a blanket UPDATE policy |
| Spec sheet `revise` | Handled via the Documents domain's `revise` mutation (see above), not locally in `spec/router.ts` | Note the cross-domain dependency when porting — don't duplicate revision logic in both places |

**Frontend:** transmittals/spec sheets live inside `ProjectDetail.tsx` tabs (not
called out as standalone top-level routes in `CLAUDE.md`'s route table) — same
"confirm rather than assume" note as Documents above.

---

## Drawings

| | Current | Target |
| --- | --- | --- |
| Table | `drawings` (`backend/src/db/schema/delivery.ts`) — DXF register: content-addressed storage (`fileHash`), worker-derived `layers`/`bounds`/`entityCount`/`svgKey`, viewer calibration (`scaleUnitsPerVb`/`scaleUnit`), a separate watermarked issue-set PDF (`issuePdfKey`/`issuePdfStatus`), and drawing-revision chaining via a shared `rootId` (revisions of one drawing share a root, per the schema comment cut off in the read above — confirm the full revision-chain shape before porting, this audit only saw the first ~20 columns) | Direct port; re-read the full table definition (revision/version columns past line ~154) before writing the migration, this audit's read was truncated |
| Upload path | **Not tRPC** — `registerDrawingUpload()` is a raw Fastify multipart route (`POST /upload/drawing`), auth via session cookie (not the tRPC context), capability-checked via `UPLOAD_ROUTE_CAPABILITIES`, rate-limited (30/min), content-hash de-duplicated, file-type sniffed (`looksLikeDxf`/`looksLikeDwg`/`looksLikePdf` — DWG explicitly rejected with a guidance message, PDF accepted as a lighter-weight alternative that skips the worker entirely since Plan Measurement renders PDF client-side via PDF.js). DXF uploads get stored PENDING and enqueue a `dxf_to_svg` worker job; PDF uploads go straight to READY | ~~Route Handler (not a Server Action...)~~ **Built 2026-09-06 (Phase 6's row, ROADMAP-CLOUD.md) as a Server Action instead** — this recommendation assumed binary multipart uploads needed a Route Handler the way the old Fastify route did; Next.js Server Actions accept a real `<input type="file">`'s `File` natively via `FormData` (Carbon's `<Form>`/`FileUploader` posts it directly), so no separate route was needed after all. Supabase Storage `upload()` replaces `putObject()` as this row anticipated; content-hash de-dup and file-type sniffing ported as pure functions, unchanged. One thing this row didn't anticipate: Server Actions default to a 1MB body limit, needing `next.config.ts`'s `experimental.serverActions.bodySizeLimit` raised to 25MB to match `DRAWING_MAX_BYTES`. |
| `dxf_to_svg` worker dependency | Same Phase 6 dependency as PDF rendering flagged in the Phase 3 audit — DXF→SVG conversion needs the Python worker (`worker/esti_worker/jobs/dxf.py`, `ezdxf`) live via Redis Streams | Same recommendation as Phase 3's `generatePdf`: land the CRUD/upload/schema now, either stub the enqueue or wire it if Redis Streams gets ported early, but don't block this phase's whole scope on Phase 6 |
| `issuePdf` | Separate PDF render path (worker target `"drawing"`) for a watermarked issue-set — same `render_pdf` job Phase 3 already covers, just a different target string | No new pattern needed, reuses Phase 3's finding |
| `setReviewStatus`, `versions`, `recentRevisions` | Not read in depth here — flagged as needing a closer look before implementation, likely the revision-chain (`rootId`) query logic | Re-read `backend/src/modules/drawing/router.ts` lines 39–200 in full before writing Server Actions for these three |

**Frontend:** no dedicated `Drawings.tsx` route found in `CLAUDE.md`'s route
table — drawings appear to live inside `ProjectDetail.tsx` too. Confirm during
implementation.

---

## Suggested Phase 4 landing order

1. **Decide the two open scope questions** from the scope map above: BBS/steel
   reconciliation in or out (recommend out — it's "Delivery" per the existing
   module grouping, not "Technical"), and whether Estimates ships with or
   without the plan-markup/joint-measurement import path (recommend without,
   for a first slice).
2. **Rate Books** — no dependencies beyond Phase 1/2's auth+RLS scaffolding,
   smallest table pair, and Estimates needs it to exist first.
3. **Estimates** (items + measurements) — the phase's largest business-logic
   surface; land the `services/estimation.ts` pure-function port before the
   Server Actions, per the pattern established in Phases 2–3.
4. **Spec sheets + Transmittals** — straightforward CRUD, `is_office_staff()`
   RLS, no cross-domain dependency besides `project_offices` (Phase 2). Land
   before Documents, since Documents' `revise` mutation touches spec sheets and
   its register reads transmittals.
5. **Drawings** — independent of Estimates/Documents; can land in parallel with
   step 4 if split across two people, but its Route Handler upload path and the
   `dxf_to_svg` worker-dependency decision should be settled before starting.
6. **Documents (register, templates, numbering, MOMs)** — lands last; its
   register read model depends on Phase 3 (letters/contracts/proposals) and
   this phase's spec sheets/transmittals all existing first. MOMs themselves
   have no dependency and could land earlier if convenient, but the register
   and `revise` mutation are the reason this domain is sequenced last overall.

---

## What this audit deliberately did not cover

- **BBS + steel reconciliation** — flagged as an open scope question above, not
  audited; grouped under "Delivery" in the existing module map, not "Technical".
- **Plan markup / measurement-book / joint-measurement** (`measurementBooks`,
  `buildingLevels`, `measurementRows`, `planMarkupSets`/`Items`,
  `sheetCalibrations`, `jointMeasurements`) — flagged as a large, separate
  feature Estimates can optionally import from; not audited here.
- **`enqueueEstimateTotalsForId`'s actual implementation** — named like it
  might be another Phase 6 (Redis/worker) dependency but not confirmed either
  way; flagged for a closer read before implementation.
- **Drawing revision-chain columns past the first ~20** (`rootId` and whatever
  else `esti_drawing` defines for versioning) and the `setReviewStatus`/
  `versions`/`recentRevisions` procedures — this audit's read of
  `drawing/router.ts` and `delivery.ts` was partial; re-read both in full before
  writing code.
- Reporting/dashboards, PDF/DWG worker internals as their own phase, AI — per
  the roadmap, Phases 5–7, own audit pass when their turn comes.
