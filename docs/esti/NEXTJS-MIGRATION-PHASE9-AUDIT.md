# Phase 9 repo audit — Library sub-domains, HR recruitment, firm-issued Tenders

**Status:** Draft audit, not yet reviewed against a Phase 9 implementation.
**This phase does not exist in the migration spec or `ROADMAP-CLOUD.md`**,
same as [Phase 8](./NEXTJS-MIGRATION-PHASE8-AUDIT.md) — defined here at
explicit user request to close out the three things Phase 8 named but didn't
have budget to read in depth: the Library sub-domains (compliance/master
plans/standards/lessons), HR recruitment, and the firm-issued `tenders`/
`contractorPortal` flow. Treat this as a proposed addition to the roadmap
alongside Phase 8, not an adopted one. **Date:** 2026-09-04

---

## The headline finding — the live `contractorPortal` isn't the one Phase 8 assumed, and half of AProc's contractor-facing bidding is dead code

**Update, since this was first written:** `backend/src/modules/pmc/
contractorPortal.ts` — the dead, never-mounted file this finding centers on —
**has since been deleted outright**, confirmed via the commit that closed out
this audit's cleanup backlog: verified via grep it was never imported from
source anywhere (only a stale `backend/dist/` build artifact referenced it).
The file no longer exists to "resurrect under a new name" as this section
originally proposed as one option — that option is effectively foreclosed by
the deletion. If AProc package-level contractor bidding is still wanted as a
live feature, it now needs building fresh rather than resurrecting deleted
code (git history still has it, if needed as a reference). The rest of this
finding — the dead-code diagnosis itself, and the correction it made to
Phase 8's assumption about `contractorPortal` — stands as written below.

This was the most consequential finding in this pass, so it leads rather than
waits in a table cell:

Two different files each export a router literally named
`contractorPortalRouter`:

- `backend/src/modules/pmc/contractorPortal.ts` (270 lines) — handles AProc's
  **package-level** sealed bidding (`pmcPackages`/`pmcPackageInvites`/
  `pmcPackageBids`), which [Phase 8](./NEXTJS-MIGRATION-PHASE8-AUDIT.md)
  audited under `pmcPackageTenders` and assumed was reachable via
  `contractorPortal`.
- `backend/src/modules/contractor/portal.ts` — handles the **firm-issued
  tender** flow this phase covers (`myTenders`/`getInvitation`/`submitBid`/
  `projectDetail`), *plus* several AProc-adjacent reads (`myRunningBills`/
  `projectTeam`/`mySubmissions`/`myApprovedJointMeasurements` — the last one
  touching the plan-markup/joint-measurement complex Phase 4 flagged as its
  own out-of-scope feature).

**Only `contractor/portal.ts` is actually mounted** — `backend/src/trpc/
router.ts:218` wires `contractorPortal: contractorPortalRouter` to *this*
file's export. Grepping the whole backend for any import of `pmc/
contractorPortal.ts` (other than its own test, if any) returns nothing: **it
is dead code, never registered on the tRPC router tree, currently
unreachable in production.** That means, as the system stands today, a
contractor invited to bid on an AProc *package* (`pmcPackages`) has no
working API path to submit that bid — the only live contractor-facing
submission path is `contractor/portal.ts`'s `submitBid`, which is wired to
the firm-issued `esti_tender`/`tenderBids` tables this phase's `tender`
namespace owns, not `pmcPackageBids`.

**Consequences for both this phase and Phase 8's implementation plan:**

- **This phase's `contractorPortal` is `contractor/portal.ts`**, not a new
  file to design — it already exists, is live, and is the actual contractor-
  facing surface for firm-issued tenders. Port it as-is (module structure
  below).
- **[Phase 8](./NEXTJS-MIGRATION-PHASE8-AUDIT.md) should be corrected**: its
  `contractorPortal` row assumed the AProc package-bidding portal was live
  and reachable; it isn't. Either (a) resurrect `pmc/contractorPortal.ts` by
  mounting it under a distinct name (e.g. `contractorPackagePortal`) before
  porting, if package-level contractor bidding is still wanted as a live
  feature, or (b) treat it as intentionally retired scaffolding and drop it
  from the port entirely — **a product decision, not resolved here**, same
  posture this audit series has taken on every other "decide on purpose"
  finding. Either way, don't silently port `pmc/contractorPortal.ts` forward
  assuming it was reachable; it wasn't.
- **`contractor/portal.ts`'s own AProc-adjacent reads** (`myRunningBills`/
  `projectTeam`/`mySubmissions`/`myApprovedJointMeasurements`) are a second,
  smaller correction to Phase 8: that phase's AProc RA-bill coverage should
  account for the contractor-facing read side living in *this* file, not
  assume it's bundled with the (dead) package-portal file.

---

## Firm-issued Tenders (`tender` namespace)

| | Current | Target |
| --- | --- | --- |
| Tables | `tenders`/`tenderInvitations`/`tenderBids` (`backend/src/db/schema/tender.ts`) — replaced the 0117-dropped `esti_tender*` spine per the file's own header comment ("lump-sum v1; no BOQ line bids" — deliberately simpler than AProc's package-level BOQ bidding) | Direct port, three tables |
| Business logic | `canTransitionTenderStatus()` and `tenderBidsVisibleToFirm()` (`packages/contracts/src/tender.ts`) — both pure. The second is the sealed-bid rule: *"Bids stay sealed from the firm until the tender is CLOSED or AWARDED"* — a real, simple, correctness-critical guard (a partner peeking at bid amounts before close would defeat the point of sealed bidding) | Port both verbatim into `web/lib/services/tenders.ts`. `tenderBidsVisibleToFirm()` needs to gate a Supabase **RLS policy**, not just an application-layer check — if staff can read `tender_bids` directly via RLS regardless of tender status, the seal is enforced only by convention in the UI, which is exactly the kind of gap Phase 5's dashboard-RLS finding warned against. Recommend a policy like `tender_bids: staff read` `using (exists (select 1 from tenders t where t.id = tender_bids.tender_id and t.status in ('CLOSED','AWARDED')))` rather than a blanket `is_office_staff()` |
| Firm-side procedures | `tender.{listByProject,listOpen,byId,create,update,setStatus,invite,award}` — `create`/`update`/`setStatus`/`invite`/`award` all `write`-gated (`capabilityProcedure("write")`, the same lower tier Phase 8 first needed for site-supervision writes); reads plain `protectedProcedure` | Server Components for reads, Server Actions for writes, `is_office_staff()` RLS on the tenders/invitations tables themselves (separate from the bids-visibility policy above) |
| Contractor-side procedures | `contractorPortal.{myTenders,getInvitation,submitBid,projectDetail}` (`contractor/portal.ts`), `contractorProcedure`/`contractorWriteProcedure`-gated — **not** staff procedures | RLS scoped by `profiles.contractor_id` (the column Phase 2's migration already added but left unused until Phase 8 flagged the need for an `is_contractor()` helper) — reuse that helper here, this is its first concrete consumer |

**Frontend:** `Tenders.tsx` (Office › Tenders, `/office/tenders`) + a detail
view on Project › Tenders per `CLAUDE.md`'s route table;
`ContractorPortal.tsx` for the invited-contractor side (`CONTRACTOR` login at
`/login?tab=portals`).

---

## Library sub-domains (Compliance, Master Plans, Standards, Lessons)

All four are small, structurally similar, and none carries business logic
beyond straightforward CRUD + file attachment — unlike most of this audit
series' findings, there isn't much to flag here beyond confirming the shape:

| | Current | Target |
| --- | --- | --- |
| Compliance | `compliance` namespace — five sub-tables (`esti_compliance_{far,setback,nbc,fire,regulation}`) built from one generic CRUD factory in the router, plus a shared `complianceDocs` file library. `write`-gated mutations, plain reads | Direct port; the generic-factory pattern in the router (one function generating `list`/`create`/`update`/`remove` per sub-table) is a TS-side implementation detail — port as five Server Action sets or keep the factory pattern in `web/lib/actions/compliance.ts`, either works, no behavior to preserve beyond the shape |
| Master Plans | `masterPlans` namespace — one table, content-addressed S3 storage (`fileKey`), `category` enum (PDF/DWG/ZONING/DEVELOPMENT), `version` integer (no revision-chain complexity like Drawings' `rootId`, just a plain counter) | Direct port. File upload → Supabase Storage, same Route Handler pattern Phase 4 established for Drawings, but simpler (no worker-driven DXF processing, no SVG derivation — this is just a stored reference file) |
| Standards | `standards` namespace — `esti_standard` + `esti_standard_file` (one standard can carry multiple attached files), `listByDiscipline` query, `write`-gated mutations | Direct port, same file-upload Route Handler pattern as Master Plans |
| Lessons learned | `lesson` namespace — `esti_lesson_learned` (curiously filed under `backend/src/db/schema/search.ts`, not its own file — worth a housekeeping note, not a migration blocker), `listPublished`/`listByProject`/`create`/`update`/`publish`/`remove`, **no capability gate at all** — any authenticated staff member can create, publish, or remove a lesson | Direct port, `is_office_staff()` RLS for both read and write — matches the current total permissiveness. Confirm this is intentional (a knowledge-sharing feature meant to be low-friction) rather than an oversight before porting; it's consistent with Letters/Contracts' similarly ungated pattern Phase 3 already flagged as "don't tighten silently," so likely intentional, but worth the same one-line confirmation |

**Frontend:** `ComplianceLibrary.tsx`, `MasterPlanLibrary.tsx`,
`StandardsLibrary.tsx` — all three named in `CLAUDE.md`'s route table
already. No `LessonsLibrary.tsx` or equivalent named there — likely a tab
inside another screen or a genuinely missing route-table entry; confirm
rather than assume, per this series' recurring caveat about `CLAUDE.md`
drifting from the live route table.

---

## HR recruitment — resolves Phase 8's open question

[Phase 8](./NEXTJS-MIGRATION-PHASE8-AUDIT.md) flagged `hrProfiles`/
`hrDocuments`/`jobApplications` as "found late, not read in depth... missing
from `CLAUDE.md`'s module map entirely." Resolved: all three live inside one
file, `backend/src/modules/team/hrProfile.ts`, mounted as the `hrProfile`
namespace (which *is* named in `CLAUDE.md`'s module map — the confusion was
the three underlying tables, not the namespace itself being undocumented).

| | Current | Target |
| --- | --- | --- |
| Scope | `getProfile`/`listDocuments` — plain `protectedProcedure`, presumably self-scoped or scoped to whichever `teamMembers` row the caller can see; `upsertProfile`/`updateLevel`/`deleteDocument`/`verifyDocument`/`listApplications`/`createApplication`/`updateApplicationStatus`/`onboardApplication` — all `hr:manage`-gated | This is **internal HR tracking, not a public careers/apply page** — `createApplication` is staff-initiated (an HR person logs a candidate), not a public-facing intake form. No public/unauthenticated procedure exists here at all. Port entirely behind `is_partner_or_above()`-tier RLS (the `hr:manage` rank, same as Phase 8's Payroll section), with the self-service `getProfile`/`listDocuments` pair scoped to the caller's own `team_member_id` |
| `onboardApplication` | Converts an application into (presumably) a `teamMembers` row — **the actual creation path for the `teamMembers` table** [Phase 8](./NEXTJS-MIGRATION-PHASE8-AUDIT.md) flagged as needing a decision (separate table vs. folding into `profiles`) | Whichever way that decision goes, this mutation is where a new roster entry is actually born in the current system — read it in full before implementing Phase 8's `teamMembers` question, it's likely to inform the answer rather than just be affected by it |

**Frontend:** presumably inside `Team.tsx`/`Hr.tsx` per `CLAUDE.md`'s route
table (both already `hrEnabled`-gated); no dedicated recruitment route named
there — confirm rather than assume, same caveat as above.

---

## Suggested Phase 9 approach

1. **Resolve the `contractorPortal` dead-code finding first** — decide
   whether AProc package-level contractor bidding gets resurrected (mount
   `pmc/contractorPortal.ts` under a new name) or is dropped, since this
   changes what Phase 8's AProc section actually needs to port.
2. **Firm-issued Tenders** — self-contained, three tables, two pure functions,
   the sealed-bid RLS design is the one piece worth real care here.
3. **Library sub-domains** — four small, independent, low-risk slices; land
   opportunistically, any order, using the file-upload Route Handler pattern
   Phase 4 already established for Drawings.
4. **HR recruitment** — small, independent of the Library domains, but
   `onboardApplication` should be read in full *before* finalizing Phase 8's
   `teamMembers` decision, not after.

---

## What this audit deliberately did not cover

- **`pmc/contractorPortal.ts`'s full 270 lines** — enough was read to confirm
  it's dead code and characterize its scope (`pmcPackageBids` submission), not
  read line-by-line for a resurrection plan.
- **`contractor/portal.ts`'s `myApprovedJointMeasurements`** — ties into the
  plan-markup/joint-measurement complex Phase 4 already scoped out; not
  re-opened here.
- **Whether `Team.tsx`/`Hr.tsx` actually has a recruitment UI today** —
  inferred from the router's existence, not confirmed against the frontend.
- **The generic CRUD-factory implementation detail in `compliance/router.ts`**
  — characterized, not read for exact signature.
