# Phase 10 repo audit — Project OS (the pre-project lead-to-activation pipeline)

**Status:** Draft audit, not yet reviewed against a Phase 10 implementation.
**This phase does not exist in the migration spec or `ROADMAP-CLOUD.md`**,
same as [Phase 8](./NEXTJS-MIGRATION-PHASE8-AUDIT.md) and
[Phase 9](./NEXTJS-MIGRATION-PHASE9-AUDIT.md) — defined here at explicit user
request. Of the groupings offered, this covers the **pre-project funnel**:
`leads`, `projectDna`, `assessment`, `feasibility`, `negotiation`,
`onboarding`, `program`, `projectBrief`, `projectPrecon`. Treat this as a
proposed addition to the roadmap alongside Phases 8–9, not an adopted one.
**Date:** 2026-09-04

---

## This is a real, named, documented architecture — "Project OS" — with one broken doc pointer

Unlike the ad-hoc groupings in Phases 8–9, this one turns out to already be a
single, deliberately designed system. `backend/src/db/schema/project-os.ts`'s
own header comment says so directly: *"Project OS — the lead → active-project
acquisition pipeline. See `docs/esti/UNIFIED-ARCHITECTURE-V4.md`."* Seven of
this phase's nine tables live in that one schema file, each commented with a
lettered "Slice" (A, B, C, D, H, J — the gaps in the lettering imply slices
E/F/G/I/K exist or existed elsewhere; Slice I is Phase 3's proposal client-
approval gate, per that audit's own comment: *"Project OS — Client Approval
Gate (Slice I)"*; Slice K is Phase 3's advance-invoice activation gate, per
`invoices.isAdvance`'s comment: *"a PAID advance gates project activation
(Slice K)"*). **This phase's domain and Phase 3's proposals/invoices domain
are two wings of one designed system, not two coincidentally-related
features.**

**The doc pointer is broken**: `docs/esti/UNIFIED-ARCHITECTURE-V4.md` does not
exist anywhere in the repository — not archived, not renamed to something
findable, just gone or never committed. This is a genuine broken reference
worth flagging for a doc-sync fix independent of the migration, same category
as this series' earlier findings about `CLAUDE.md`/`LOCAL-FIRST.md` drift
(Phase 7) and stale in-code comments (Phase 6) — except this one is a 404, not
a stale pointer to an archived file. Nothing in this audit could consult the
design doc directly; everything below is read from the schema/router code
itself.

---

## The unifying finding — `evaluateActivationGate()` is the load-bearing function tying this whole phase to Phase 2/3

`packages/contracts/src/project-os.ts` defines `evaluateActivationGate()` — a
pure function (explicitly commented *"Pure: the backend feeds it booleans
gathered from the spine and enforces `ok`; the UI shows the checklist"*)
that checks six conditions before a draft project can go live:

```
status === "PROPOSAL"        (project stage)
hasDna                       (Slice B — this phase)
hasAssessment                (Slice C — this phase)
feeApproved                  (Slice I — Phase 3's proposal.setClientApproval)
onboardingComplete           (Slice J — this phase)
advancePaid                  (Slice K — Phase 3's invoices.isAdvance)
```

It's invoked from `backend/src/modules/projectoffice/router.ts` — the same
`activate`/`activationStatus` procedures the [Phase 2 audit](./NEXTJS-MIGRATION-PHASE2-AUDIT.md)
listed by name but didn't dig into ("`projectOffice.{list,byId,create,update,
remove,restore,purge,activate,activationStatus,updateStatus,...}`"). **This
resolves what those two procedures actually do**: `activationStatus` runs this
checklist and returns it for the UI; `activate` presumably enforces `ok` before
flipping the project out of `PROPOSAL`. Port `evaluateActivationGate()`
verbatim into `web/lib/services/project-os.ts` — it's the single piece of
business logic every other finding in this phase (and two findings from Phase
3) ultimately feeds into.

---

## Finding — `shareToken` is minted but never consumed; a half-wired feature, not dead code

Feasibility reports (Slice D) get a `shareToken` (`randomBytes(16).toString
("hex")`) on every `generate` call, with a comment explicitly saying *"A fresh
shareToken enables an anonymous link."* **No route anywhere in the backend
reads a feasibility report by that token** — grepping the whole backend for
`shareToken`/`share_token` outside `feasibility.ts` and the schema file itself
turns up only a demo-seed script hardcoding one as fixture data, never an
actual lookup. Unlike Phase 6's `engagement_register` (dead code left behind
by a teardown) or Phase 9's `pmc/contractorPortal.ts` (a whole router never
mounted), this is a **half-built feature**: the write side (mint a token,
store it) exists and works; the read side (serve the report to whoever holds
the link, unauthenticated) was apparently never finished. **Don't port a
`shareToken` column with no matching Route Handler** — either finish the
feature (a public Route Handler, `GET /feasibility/[token]`, serving the
`snapshot` jsonb read-only, no auth) as part of this phase, or drop the column
if anonymous sharing was abandoned as a product decision. Flagged as a
decision, not resolved here — consistent with this series' posture on every
other "the code and the apparent intent disagree" finding.

---

## Leads (Slice A)

| | Current | Target |
| --- | --- | --- |
| Table | `leads` (`esti_lead`) — inbound enquiry, pre-client/pre-project. `conflictCheckDone`/`conflictCheckNotes` — a COA (Council of Architecture) Regulations 1989 conflict-of-interest check, confirmed at conversion per the schema comment's SOP citation | Direct port |
| `convert` | The single most consequential mutation in this phase: validates the lead isn't already converted and isn't in a terminal non-qualified status, **hard-blocks conversion if `conflictCheckDone` isn't true** (a real compliance gate, not a UI nicety — the mutation throws `BAD_REQUEST` server-side regardless of what the client sends), checks a **project quota** (`assertQuota(db, "projects", ...)`) and a **plan-tier gate** (`assertNotFixedPlan`) — both from the same licensing-platform plan system Phases 2/5/7 already excluded from the single-tenant target — then in one transaction: reuses or mints a `clients` row, mints a project `ref` via `nextRef()`, and creates the `project_offices` row | Port the conflict-of-interest gate and the transaction shape verbatim — this is compliance logic, not incidental. **Drop** `assertQuota`/`assertNotFixedPlan` per the established Phase 2 tenancy decision (no plan tiers in a single-tenant deployment), consistent with every prior phase that's hit this same licensing-platform boundary. The transaction itself needs the same RPC-function treatment Phase 3 recommended for proposals' `setClientApproval` (multi-table write, `security invoker` Postgres function mirroring `write_audit()`'s pattern) rather than sequential client-driven writes |
| Access | Plain `protectedProcedure` throughout, no capability gate | `is_office_staff()` RLS |

---

## Project DNA (Slice B)

| | Current | Target |
| --- | --- | --- |
| Table | `projectDnas` (`esti_project_dna`) — 1:1 with a project, pre-sales commercial-fit fields (budget mode, vastu requirement, design language/flexibility, decision makers, timeline criticality, material expectation, revision tolerance) | Direct port |
| `riskScore` | `computeRiskScore()` (`packages/contracts/src/project-os.ts` or a sibling file — the DNA fields feed a commercial-risk score), a pure function over the DNA record plus the project's `jurisdiction`. Explicitly returns `null` rather than erroring when no DNA exists yet, with a code comment noting this is a deliberate "normal empty state" so the UI hides a badge instead of showing an error toast | Port the function verbatim; preserve the null-not-error semantics exactly — this is the kind of small UX-correctness detail (Phase 3's cancelled-invoice-can't-delete guard, Phase 4's teamMembers-FK note) this series keeps finding worth calling out explicitly so it doesn't get "fixed" into an error case during the port |
| Access | `upsert` on `write`-gated; `byProject`/`riskScore` plain reads | `is_office_staff()` RLS |

---

## Pre-project assessment (Slice C)

| | Current | Target |
| --- | --- | --- |
| Table | `preProjectAssessments` (`esti_pre_project_assessment`) — 1:1 with a project. Site dimensions, FAR factor, four setbacks, ground coverage, possible floors, super-builtup area, construction rate, estimated cost — a full buildability calculation, not just stored inputs | Direct port |
| `computeAssessment()` | Pure function — takes raw inputs (site length/width or manual area, FAR factor, setbacks, ground-coverage %, super-builtup factor, construction rate) and derives every computed field (`siteAreaSqm`, `permissibleFarArea`, `setbackBuildableArea`, `coverageArea`, `actualGroundCoverage`, `possibleFloors`, `superBuiltupArea`, `estimatedProjectCostPaise`). **The server recomputes from raw inputs on every `upsert` rather than trusting client-sent derived values** — the same "don't trust a client-computed number" discipline Phase 4's estimate-measurement recompute and Phase 3's frozen-invoice-snapshot pattern both already established | Port verbatim into the shared services layer. This is the calculation this phase's whole feasibility pipeline (Slice D, and by extension the dashboard's earlier-audited `feasibility_report` PDF target from Phase 6) is downstream of — land it early |
| Access | `upsert` `write`-gated; `byProject` plain read | `is_office_staff()` RLS |

---

## Feasibility (Slice D)

| | Current | Target |
| --- | --- | --- |
| Table | `feasibilityReports` (`esti_feasibility_report`) — a **frozen snapshot** (not a live view) of the assessment at generation time, plus `pdfStatus`/`pdfKey` and the unconsumed `shareToken` (see finding above) | Direct port; the frozen-snapshot design is deliberate (same reasoning as invoices' frozen GST snapshot from Phase 3 — a report that's already been shared shouldn't silently change if the underlying assessment is later edited) |
| `generate` | Reads the current assessment, assembles a `FeasibilitySnapshot` object, inserts it, mints the (currently-unconsumed) share token, enqueues `render_pdf` with target `feasibility_report` — **this closes Phase 6's open finding** ("`feasibility_report` — Project OS Slice D pre-project assessment — not mentioned in any phase 2–5 audit at all") | Port as one Server Action calling `computeAssessment`'s output through the snapshot-assembly step; the PDF render enqueue follows Phase 6's already-established pattern for every other render target |
| Access | `generate` `write`-gated; `byProject` plain read | `is_office_staff()` RLS, plus whatever the `shareToken` decision above implies for an anonymous read path |

---

## Negotiation (Slice H)

| | Current | Target |
| --- | --- | --- |
| Table | `projectNegotiations` (`esti_project_negotiation`) — numbered rounds against a draft project, fee change, scope/timeline change notes, a discount-requested percentage, free-text architect/client responses, an `outcome` field, and a **`conversionProbability` integer** (0–100, presumably a staff-entered estimate rather than a computed score — not confirmed either way in this pass) | Direct port. Confirm whether `conversionProbability` is staff-entered or computed before assuming which — if computed, there may be a fourth "rule-based scoring" function in this codebase (alongside ASPRF, the dashboard's cognition engine, and this phase's `computeRiskScore()`) not yet found |
| Procedures | `listByProject`/`addRound`/`setOutcome` — straightforward, `write`-gated writes | `is_office_staff()` RLS |

---

## Program / space schedule

| | Current | Target |
| --- | --- | --- |
| Tables | `programs` (`esti_program`) + `programSpaces` (`esti_program_space`) — a versioned (`DRAFT → FROZEN`) architectural space schedule, explicitly bounded by the assessment's `superBuiltupArea` per the schema comment (*"formulated within the feasibility envelope... the source of truth"*) — another place this phase's own internal pieces (assessment → program) chain together, not just chaining to Phase 3 | Direct port, both tables |
| Procedures | `byProject` (latest), `listVersions`, `summary`, `siteReference`, a freeze mutation (not read in full — line ~150, unlabeled in this pass), `addSpace`/`updateSpace` | The freeze mutation is worth a closer read before implementing — "a frozen version is the revision baseline" per the schema comment implies it interacts with the Revision Intelligence dashboard module (`CLAUDE.md` § Domain conventions, `revisionCategory`/`revisionSource` on decisions) in a way not traced here |
| Access | Reads plain; `addSpace`/`updateSpace`/freeze `write`-gated | `is_office_staff()` RLS |

---

## Client onboarding (Slice J)

| | Current | Target |
| --- | --- | --- |
| Table | `clientOnboardings` (`esti_client_onboarding`) — 1:1 with a project, billing/GST/PAN details, `authorizedReps` (jsonb array), two uploaded document keys (agreement, ID), a `status`/`completedAt`/`completedById` completion record | Direct port |
| Procedures | `upsert`/`complete`/`reopen` (all `write`-gated), `byProject` (plain read) | Same file-upload Route Handler pattern established for Master Plans/Standards/Drawings for the two document keys; `is_office_staff()` RLS |
| Feeds | `onboardingComplete` in `evaluateActivationGate()` — this table's `status` is one of the six activation-gate checks | Confirm the exact status value(s) that count as "complete" match what `evaluateActivationGate()`'s caller passes in — not traced end-to-end in this pass |

---

## Project Brief

| | Current | Target |
| --- | --- | --- |
| Table | `projectBriefs` (`esti_project_brief`, in its own schema file, not `project-os.ts`) — a section-keyed questionnaire, same shape as [Phase 8](./NEXTJS-MIGRATION-PHASE8-AUDIT.md)'s CPI (`cpiResponses`): `getByProject`/`upsertSection`/`exportCompiled`, plain `protectedProcedure` throughout (no capability gate, unlike most of the rest of this phase) | Direct port, same section-JSONB-upsert pattern as CPI — reuse whatever service function Phase 8's CPI implementation lands for the `INSERT ... ON CONFLICT` race-handling, don't re-derive it a second time for a structurally identical table |
| Scope boundary | Despite living conceptually next to "Project OS" in the roadmap grouping, this table isn't in `project-os.ts` and isn't referenced by `evaluateActivationGate()` — it's parallel infrastructure (a project-info questionnaire), not part of the lead→activation gate chain | Note the distinction rather than assuming it's Slice-lettered like its neighbors; it isn't |

---

## Project Precon (risks/opportunities/phase gates) — a scope-boundary note

`projectPrecon` (`esti_project_risk`/`esti_project_opportunity`/
`esti_project_phase_gate`, per `CLAUDE.md`'s own description: "Studio
pre-construction R&O: risks, opportunities, phase gates") is **not actually
part of the pre-project funnel** this phase set out to cover — it operates on
an already-active project's pre-construction phase, not a lead or a draft
project working toward activation. It was included in scope because it
shares the `project*` naming prefix with everything else here, but
structurally it belongs with Delivery/Site-supervision (closer to
[Phase 8](./NEXTJS-MIGRATION-PHASE8-AUDIT.md)'s domain) than with Leads/DNA/
Assessment/Feasibility/Negotiation/Onboarding.

| | Current | Target |
| --- | --- | --- |
| Tables | `esti_project_risk`/`esti_project_opportunity`/`esti_project_phase_gate` — CRUD + an `upsertPhaseGate` mutation, `write`-gated | Direct port, `is_office_staff()` RLS — no surprises found |
| Note | `CLAUDE.md` confirms its enums were deliberately extracted into `packages/contracts/src/project-precon.ts` *before* the 2026-09 `consultancy` module removal, specifically so this feature could survive that teardown intact | Nothing to resolve — cited for context on why this table's shared-enum file exists separately from `project-os.ts`'s |

**Recommendation**: land this table alongside Phase 8's Delivery work when
that phase is actually implemented, not alongside the rest of this phase's
Leads-through-Onboarding chain — despite this audit covering it here per the
originally offered grouping.

---

## Suggested Phase 10 approach

1. **Fix or accept the broken `UNIFIED-ARCHITECTURE-V4.md` reference** — a
   doc-sync task independent of the migration; flagged, not fixed here.
2. **Decide the `shareToken` question** before touching Feasibility — finish
   the anonymous-link feature or drop the column, don't port it half-wired.
3. **Port `computeAssessment()` and `computeRiskScore()`** (pure functions)
   early — Assessment feeds Feasibility feeds the dashboard's already-ported
   PDF target; DNA's risk score is independent but small.
4. **Leads** — the conflict-of-interest gate is the one piece of real
   compliance logic here; port it verbatim, drop the plan/quota gate per the
   established Phase 2 tenancy decision.
5. **Port `evaluateActivationGate()`** once DNA/Assessment/Onboarding exist on
   the new stack (it also needs Phase 3's proposal-approval and advance-invoice
   fields — this phase can't fully close out the activation gate alone;
   sequence it after Phase 3 if these land in parallel).
6. **Program, Negotiation, Onboarding, Project Brief** — independent of each
   other, land in any order once their shared dependencies (Assessment for
   Program's envelope bound) exist.
7. **Project Precon** — recommend deferring to whenever Phase 8's Delivery
   work is actually implemented, per the scope-boundary note above, rather
   than bundling it with the rest of this phase.

---

## What this audit deliberately did not cover

- **`docs/esti/UNIFIED-ARCHITECTURE-V4.md`'s actual content** — it doesn't
  exist; everything here was read from code alone.
- **`program.ts`'s freeze mutation** (~line 150) and its interaction with the
  Revision Intelligence dashboard module — named, not traced.
- **Whether `conversionProbability` (Negotiation) is staff-entered or
  computed** — not confirmed either way.
- **The exact `clientOnboardings.status` value(s) `evaluateActivationGate()`'s
  caller checks for "complete"** — not traced end-to-end from the gate
  function back to this table's actual status transitions.
- **`projectoffice/router.ts`'s full `activate`/`activationStatus`/
  `updateStatus` implementations** — confirmed they call
  `evaluateActivationGate()`, not read for their complete logic otherwise.
