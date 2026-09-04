# Phase 3 repo audit — Commercial (proposals, quotations, contracts, invoices, payments)

**Status:** Draft audit, not yet reviewed against a Phase 3 implementation
**Date:** 2026-09-04
**Scope:** Per [NEXTJS-SUPABASE-MIGRATION.md](./NEXTJS-SUPABASE-MIGRATION.md) § 36–37,
[ROADMAP-CLOUD.md](./ROADMAP-CLOUD.md)'s Phase 3 definition, and the landing order the
[Phase 2 audit](./NEXTJS-MIGRATION-PHASE2-AUDIT.md) left in place — maps the current
tRPC/Fastify/Drizzle implementation of the Commercial domains onto the target
Next.js + Supabase stack. Follows the same audit shape as Phase 2's; later phases
(Technical, Reporting, Advanced processing, AI) get their own pass when their turn
comes.

---

## Scope correction — "quotations" and "payments" aren't separate features

Before any table design: the roadmap's Phase 3 line item names "proposals,
quotations, contracts, invoices, payments", but the current system doesn't have
quotations or payments as distinct models:

- **Quotations** don't exist as a separate concept. `esti_proposal` (the unified
  Proposals model, migration 0116) already covers both the COA fee-proposal shape
  and a thin scope/agreement shape in one table — that's the system's quotation
  equivalent. Phase 3 should treat "proposals" and "quotations" as the same table,
  not build a second one.
- **Payments** aren't a standalone entity either. An invoice tracks its own
  cumulative receipt via `invoices.paidPaise` against `netReceivablePaise`
  (partial payments leave it `ISSUED`, full payment moves it `PAID` — that
  transition isn't automated anywhere in the current backend, worth flagging
  below), and bank-statement/26AS/AIS/GSTR reconciliation is a separate, much
  larger feature (`esti_reconcile` + the Python worker's `reconcile_import` job,
  `pandas`-based matching) that doesn't fit "Commercial" cleanly — **recommend
  treating reconciliation as its own later slice** (it depends on the Python
  worker per Phase 6, not a straight Server Action/Route Handler port) rather
  than pulling it into Phase 3. This audit covers `invoices.paidPaise` as a plain
  field; it does not cover porting reconciliation.

So Phase 3, as it actually exists in the current system, is four domains:
**proposals, letters, contracts, invoices** (plus purchase orders — see the open
question below).

---

## Purchase orders — in or out of Phase 3?

`esti_purchaseorder` / `esti_po_item` (`backend/src/db/schema/financial.ts`) is a
simple qty × rate procurement document, financial in nature but conceptually
closer to project delivery/procurement than firm-facing commercial documents
(proposals/contracts/invoices are all client-facing; a PO is vendor-facing). It
has no dedicated tRPC namespace found in the module map — **flagging as an open
question rather than deciding it here**: fold it into this Phase 3 pass (it's
financial, `financial.ts` schema file, small), or defer it to whichever phase
picks up procurement/delivery. Recommend folding it in given its size (two
tables, no complex business logic) — decide before Phase 3 implementation starts,
not during it.

---

## Shared/cross-cutting pieces this phase depends on (already built in Phase 2)

- `profiles`, `audit_log` + `write_audit()` RPC, `firm`, `clients`,
  `project_offices`/`phases` — all live from Phase 2. Every table below FKs into
  `project_offices` and often `clients`.
- **Numbering** (`esti_sequence` / `nextRef()`) — the Phase 2 audit deferred this
  as "no natural owner" in Core ERP; **this is the phase that needs it**.
  Proposals, letters, contracts, and invoices all mint a gap-free ref
  (`PRP/…`, `LTR/…`, `CTR/…`, `INV/…`) via one shared `nextRef(db, scope, prefix)`
  helper (`backend/src/lib/numbering.ts`) backed by an atomic
  `INSERT … ON CONFLICT DO UPDATE … RETURNING` against `esti_sequence(scope, fy)`.
  Port this **before** any single domain's `create` action — the Phase 2 branch's
  placeholder count-based project ref (`PRJ-0001`, non-atomic, non-gap-free) was
  an acceptable stopgap for a project ref with no statutory weight; an **invoice**
  number is a statutory GST document number and must not repeat or gap silently,
  so it needs the real atomic-upsert sequence table + RPC (mirroring
  `write_audit()`'s existing pattern: a `public.next_ref(scope text)` SQL
  function, `security invoker`, doing the same `INSERT … ON CONFLICT … RETURNING`
  against a new `public.sequences` table).
- **Financial year** (`financialYearRange()`, `financialYear()`,
  `packages/contracts/src/fy.ts`) — pure function, feeds both numbering and the
  per-client per-FY TDS threshold check below. Port as-is into `web/lib/`.
- **Document retention rules** (`backend/src/lib/retention.ts`) —
  `requireUnissuedDocument()` / `requireDeletableStatus()`, two tiny pure
  functions gating `remove` mutations (can't delete a rendered/issued PDF; can't
  delete a contract that isn't DRAFT). Port as-is; every domain below uses one or
  the other.

---

## Proposals (`esti_proposal`)

| | Current | Target |
| --- | --- | --- |
| Table | `proposals` (`backend/src/db/schema/project.ts`) — unified COA fee proposal + scope/agreement, one model (migration 0116 merged the former thin `esti_proposal` in). `projectId` FK, `feeBasis` (COA_PERCENT/PER_SQM/LUMPSUM), COA-minimum snapshot fields, dual status: `status` (internal SOP-03/04 workflow) + `clientApprovalStatus` (client's own decision — the Project OS approval gate) | Direct port. Keep both status columns distinct — they are two different state machines, not duplicate fields (see business logic below) |
| Business logic | `coaMinimumFee()` / `isBelowCoaMinimum()` (`packages/contracts/src/coa.ts`) — pure functions, already portable as-is; `canTransitionFeeProposal()` (`packages/contracts/src/project-os.ts`) — pure state-machine guard over `FeeProposalStatus` (`DRAFT → INTERNAL_REVIEW → CLIENT_SUBMISSION → APPROVED`, with a `REVISED` loop-back), also portable as-is | Per spec §13, land these three functions in `web/lib/services/proposals.ts` (or similar) unmodified, then call them from the Server Actions below — this is the model case of "business logic that shouldn't live directly in a Server Action" the spec means |
| tRPC | `proposal.{listByProject,listAll,byId,create,generatePdf,remove,setStatus,setClientApproval}` (`backend/src/modules/proposal/router.ts`), capability-gated `fees:manage` (L2+, partner and above — proposals expose firm economics) | `listByProject`/`listAll`/`byId` → Server Components; `create`/`setStatus`/`remove` → Server Actions (each re-running the same guard function server-side, not trusting the client); `generatePdf` → Server Action that enqueues a job (see PDF rendering below) |
| `setClientApproval` — the Project OS approval gate | On `REJECTED`, the linked project is set `CANCELLED` and, if it came from a lead, the lead is marked `LOST` — a 3-table transaction (`proposals` → `project_offices` → `leads`). Runs inside a Drizzle `ctx.db.transaction()` today | Supabase transactions aren't directly exposed the same way from `@supabase/ssr`'s client — either wrap the three writes in a single Postgres function (`security invoker`, called via `.rpc()`, matching the `write_audit()`/`next_ref()` pattern already established) so the transaction boundary lives in the database, or accept sequential writes with a documented small inconsistency window. **Recommend the RPC-function approach** — it's the same pattern already used twice in Phase 2's migration, keeps atomicity, and doesn't need `leads`/`project_offices` write policies to trust the client with a raw multi-table update |
| RLS | No table exists yet — `fees:manage` (`can(role, "fees:manage")`, L2+/rank 80: OWNER/PARTNER) is the capability to mirror. New RLS policy needs a `is_partner_or_above()` helper (`current_app_role() in ('OWNER','PARTNER')`) parallel to the existing `is_office_staff()` from Phase 2's migration — proposals are financial data narrower than "office staff" |

**Frontend:** `frontend/src/routes/Proposals.tsx` (`/office/proposals` — office-wide
list) + the Proposals tab inside `ProjectDetail.tsx` (per-project list). Neither
is a straight port target — Phase 2's clients/projects pages are new Carbon-only
code in `web/app/(app)/`, not ports of the MUI-era route files; same approach here.

---

## Letters & Contracts (`esti_letter`, `esti_contract`)

| | Current | Target |
| --- | --- | --- |
| Tables | `letters` — `projectId` (nullable — a letter can be firm-level, not tied to a project), recipient/subject/body, PDF fields; `contracts` — `projectId` (nullable), party/contractType/valuePaise/dates/status | Direct port, both |
| tRPC | `letter.{list,byId,create,generatePdf,remove}` / `contract.{list,create,updateStatus,remove}` (`backend/src/modules/office/router.ts`) — both on bare `protectedProcedure` (**any authenticated staff member**, no capability gate — unlike proposals/invoices) | `list`/`byId` → Server Components; `create`/`generatePdf`/`updateStatus`/`remove` → Server Actions. RLS: use `is_office_staff()` (already exists from Phase 2), **not** a narrower financial-only policy — matches the current no-capability-gate behavior. A contract carries a money value (`valuePaise`) but read/write access today is not restricted to partners the way invoices/proposals are; don't tighten this silently as a side effect of the port, flag it as a product question if it looks wrong |
| Contract status | `ContractStatus` enum + `updateStatus` mutation, no guarded transition function found (unlike proposals' `canTransitionFeeProposal`) — any status can move to any status today | Port the same permissiveness; don't invent a transition guard that doesn't exist in the current system as part of this migration |
| Delete guard | `requireUnissuedDocument()` (letters — can't delete once a PDF exists/is rendering) / `requireDeletableStatus(status, ["DRAFT"])` (contracts — DRAFT only) | Same two shared functions noted above |
| Letter `generatePdf` side effect | Also calls `recordDocumentIssue()` (`backend/src/lib/documentIssue.ts`) — writes to `esti_document_issue`, an immutable per-version issue record shared by every issuable document type, distinct from `audit_log` on purpose | **Resolved by the [Phase 4 audit](./NEXTJS-MIGRATION-PHASE4-AUDIT.md)**: this is Phase 4's "Documents" domain (`documentIssues`/`officeTemplates`/`moms`, the `documentRouter`'s cross-entity register), not a Phase 3 open question. Port the table+RPC alongside Phase 4's other Documents work, not here — Phase 3 only needs to keep calling it the same way letters/contracts do today |

**Frontend:** `frontend/src/routes/Letters.tsx`, `Contracts.tsx` (Office
documents). New Carbon-only pages, not ports.

---

## Invoices (`esti_invoice`)

| | Current | Target |
| --- | --- | --- |
| Table | `invoices` (`backend/src/db/schema/financial.ts`) — the largest/densest table in this phase: frozen GST tax snapshot (`gstSystem`, `documentKind`, `sac`, `interState`, `placeOfSupplyState`, `cgst/sgst/igst/gstTotal/compositionLevy/tds/grandTotal/netReceivablePaise`), plus `paidPaise` (cumulative receipts), `isAdvance` (Project OS activation gate), `status` (DRAFT/ISSUED/PAID/CANCELLED) | Direct port. This table is intentionally "wide" — a frozen snapshot, not a computed view — because Rule 46 of the CGST Rules requires an issued tax invoice's stated figures to stay fixed even if the project/client record changes later. Keep it wide in Supabase for the same reason |
| Business logic (all pure functions, `packages/contracts/src/`) | `computeGst()` / `computeTds194j()` / `tds194jApplies()` (`gst.ts`), `derivePlaceOfSupply()` (`place-of-supply.ts`), `financialYearRange()` (`fy.ts`) — none of these touch the database directly, all portable as-is | Land in `web/lib/services/invoices.ts` unmodified, same as the proposals business logic above. This is the single most important "don't rewrite, port" case in Phase 3 — GST/TDS/place-of-supply math is compliance-sensitive and already correct; re-deriving it in a Server Action from scratch would be a regression risk for no benefit |
| Creation flow | `createStudioInvoice()` (`backend/src/lib/createInvoice.ts`) — not simple CRUD: derives place of supply (firm state/GSTIN + project state + client state/GSTIN), checks the client's cumulative taxable value already invoiced *this financial year* (`clientFyTaxablePaise()`, a DB query) against the ₹30k s.194J TDS threshold, computes GST via `computeGst()`, assembles the frozen snapshot, mints the ref via `nextRef()`, inserts, audits, activity-logs, and (only when `issue: true`) enqueues a PDF render + publishes to the client-portal hybrid-sync outbox | Per spec §13, this whole flow is a `services/invoices.ts` function (Server Action–callable, not duplicated inline in the action itself) — mirrors the current shape almost exactly: one Postgres function or one Server Action orchestrating a few Supabase queries + the pure GST functions, then an insert. `clientFyTaxablePaise()` is the one DB-dependent piece — keep it as a small query helper alongside the pure functions, not inside them |
| `updateStatus` | Forward-only lifecycle (`DRAFT→ISSUED→PAID`, cancel from any non-terminal state) enforced by a plain `allowed` transition map in the router (not a shared contracts-level function like proposals has — **inconsistency worth normalizing during this port**: either promote this map into `packages/contracts`-equivalent `web/lib/` alongside `canTransitionFeeProposal`, or leave it router-local; recommend promoting it, since Phase 3 is porting `canTransitionFeeProposal` as a service function anyway and invoices deserve the same treatment). On first `ISSUED`, stamps `dateInvoice`, flips `pdfStatus` to PENDING, enqueues the PDF render, and publishes to hybrid sync — **four side effects bundled into one status transition**, all must be preserved together | Port as one Server Action calling one `transitionInvoiceStatus()` service function that returns what needs to happen (stamp date? render? publish?) rather than four inline `if`s — same shape, cleaner seam |
| `remove` | DRAFT-only, with an explicit business reason a CANCELLED invoice is **not** deletable (statutory record, holds a numbering-series slot, must appear in GSTR-1 even cancelled) — this is the single clearest example in the whole codebase of "don't blindly rewrite, the constraint encodes real GST law" | Port the guard and its comment verbatim; do not relax it |
| Payments (`paidPaise`) | Set only via reconciliation import matching (out of Phase 3 scope per the correction above) — **no direct "record a payment" mutation exists in the current invoice router itself**; nothing in Phase 3 needs to build one, since the field is written by a system this audit intentionally defers | Port the column; don't build new payment-recording UI for it in this phase — that's the reconciliation slice's job |
| Capability | `invoice:manage` (L2+, partner and above) gates every mutation *and* every read (`readInvoice` is the same capability as `manageInvoice` — reads were deliberately tightened off `protectedProcedure` because a VIEWER could otherwise pull firm-wide revenue/GST/TDS, per the code comment); `invoice:delete` (separate capability, also L2+) gates only `remove` | RLS: reuse the `is_partner_or_above()` helper from the Proposals section above for both read and write policies — same rank threshold, same reasoning (financial visibility) |

**Frontend:** `frontend/src/routes/Invoices.tsx` (Finance). New Carbon-only page.

---

## PDF rendering (all four domains)

Every domain above calls the same pattern: set `pdfStatus = "PENDING"`, enqueue a
`render_pdf` job (Redis Streams, consumed by the Python worker's
`worker/esti_worker/jobs/pdf.py`, WeasyPrint HTML→PDF), write an audit entry, and
(for letters) also call `recordDocumentIssue()`. The worker's `_RENDERERS` map
already includes `feeproposal`, `letter`, and presumably `invoice`/`contract`
targets (see `CLAUDE.md` § Python worker) — **this dependency makes PDF
generation not a pure Server Action/Route Handler port**: it still needs the
Redis Streams job queue and the Python worker running, which is Phase 6's
"Advanced processing" territory per the roadmap.

**Recommendation:** Phase 3 can port the CRUD/business-logic slices of all four
domains (create, list, status transitions, delete guards) fully, but
`generatePdf` should either (a) stay a stub that enqueues nothing yet and marks
`pdfStatus` for a later Phase 6 pass to wire up, or (b) if Redis Streams +
`enqueueJob()` are ported earlier than Phase 6 as a small standalone piece (it's
a thin wrapper, not itself Python-dependent), the enqueue call can be ported now
even if nothing consumes it live yet. **Decide this before implementation, not
during** — same pattern as the Phase 2 audit's tenancy question. Whichever way
this goes, don't silently drop the `pdfStatus`/`pdfKey` columns or the
`presignedGet()` download-URL pattern (Supabase Storage's `createSignedUrl()` is
the direct equivalent) — the schema and read path should land now regardless of
whether the write path (worker) is live yet.

---

## Suggested Phase 3 landing order

Given the dependencies above:

1. **Decide the two open scope questions**: purchase orders in/out, and the
   `generatePdf`/Redis-Streams timing question above (both block nothing else,
   but should be settled before writing code around them).
2. **`sequences` table + `next_ref()` RPC** (numbering) — blocks every `create`
   below; mirrors the `write_audit()` pattern already live from Phase 2.
3. **Shared services**: port `coaMinimumFee`/`isBelowCoaMinimum`/
   `canTransitionFeeProposal` (proposals), `computeGst`/`computeTds194j`/
   `tds194jApplies`/`derivePlaceOfSupply`/`financialYearRange` (invoices), and
   the two `retention.ts` guards — all pure, all portable verbatim, all needed
   before their respective domain's Server Actions.
4. **`proposals`** — smallest of the four with the most interesting business
   logic (COA guardrail, dual state machine, the 3-table approval-gate
   transaction); a good first slice to prove the RPC-transaction pattern before
   invoices needs the same thing for its own multi-step `updateStatus`.
5. **`letters` + `contracts`** — straightforward CRUD, no capability gate beyond
   `is_office_staff()`, good next slice.
6. **`invoices`** — largest table, most business logic, tightest RLS
   (`is_partner_or_above()`), and the one domain where getting the port wrong has
   real GST-compliance consequences. Land last in this phase, once the RPC/
   service-function pattern is proven on proposals.
7. **Purchase orders**, if the scope decision in step 1 folds them in — simple
   CRUD, no special business logic found, safe to land anywhere after step 2.

---

## What this audit deliberately did not cover

- **Reconciliation** (`esti_reconcile`, bank/26AS/AIS/GSTR import + `pandas`
  matching) — explicitly scoped out above; it depends on the Python worker
  (Phase 6) and is a large feature in its own right, not "Commercial" CRUD.
- Estimation/BOQ, drawings, delivery/site-supervision, reporting, PDF/DWG worker
  internals, AI — per the roadmap, these are Phases 4–7 and get their own audit
  pass when their turn comes.
- The ~70 other tRPC namespaces outside Auth/Users/Clients/Projects/Tasks/Firm/
  Proposals/Letters/Contracts/Invoices (`CLAUDE.md` § Module map).
