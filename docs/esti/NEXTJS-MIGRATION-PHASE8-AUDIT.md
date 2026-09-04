# Phase 8 repo audit — Roadmap gaps (HR/Payroll, Delivery/AProc, CPI, Knowledge Bank)

**Status:** Draft audit, not yet reviewed against a Phase 8 implementation.
**This phase does not exist in the migration spec or `ROADMAP-CLOUD.md`** —
[`NEXTJS-SUPABASE-MIGRATION.md`](./NEXTJS-SUPABASE-MIGRATION.md) § 38's
Development Sequence stops at Phase 7 (Optional AI). It's defined here, per
explicit user direction, to cover four real domains the
[Phase 6](./NEXTJS-MIGRATION-PHASE6-AUDIT.md) and
[Phase 7](./NEXTJS-MIGRATION-PHASE7-AUDIT.md) audits both surfaced as having
no assigned phase number: **HR/Payroll**, **Delivery/Site-supervision/AProc**,
the **CPI** (Client–Project Intelligence) namespace, and **Knowledge Bank /
Library**. Treat this as a proposed addition to the roadmap, not an existing
one — whoever owns `ROADMAP-CLOUD.md` should decide whether to adopt it as
written, renumber/merge it into an existing phase, or split it further.
**Date:** 2026-09-04

---

## Two open questions from earlier audits, resolved here

- **Phase 6/7's `esti_repo_source` liveness question, resolved: it's live.**
  Both prior audits flagged `esti_repo_source`/`pdf_to_markdown` as "possibly
  a leftover from the 2026-07-09 Knowledge Bank cleanup, not confirmed either
  way." It isn't dead — `esti_repo_source` (`backend/src/db/schema/
  repo-portal.ts`) is owned by the **`knowledgeBankPortal`** tRPC namespace
  (`backend/src/modules/repository/router.ts`), which `CLAUDE.md` explicitly
  lists as a kept feature: *"`KnowledgeBankPortal.tsx` stays (Knowledge Bank
  portal is a kept feature) — only the EOMS panel/branding was removed from
  it."* This is a real, current feature (upload → PDF-to-Markdown convert →
  review/rephrase → publish), not dead code. Update those two audits'
  mental model accordingly; this phase covers it properly below.
- **Phase 5's flagged risk, resolved: an `attendance` table exists.** Phase
  5's audit worried ASPRF's reliability KPI "likely needs an attendance table
  no phase (2–5) has scoped yet." It exists — `esti_attendance` (`backend/
  src/db/schema/hr-work.ts`), owned by the `attendance` namespace
  (`backend/src/modules/attendance/router.ts`). Covered below under HR.

---

## Scope map

1. **HR/Payroll** — `team`/`teams`/`assignments` (roster + project staffing),
   `leaves`/`payroll` (`hr:manage`-gated), `hrProfile`/HR documents/job
   applications (recruitment — not previously mentioned in any prior audit or
   `CLAUDE.md`'s module map at all), `attendance`.
2. **Delivery / Site-supervision / AProc** — exactly the grouping `CLAUDE.md`
   already names "Site delivery (consultancy site supervision + AProc)":
   `snags`, `siteInstructions`, `progressReports`, `phaseProgress`,
   `siteVisits`, plus AProc's `pmcMilestones` (CSV + Primavera P6 XER
   import), `pmcPackages`/`pmcPackageTenders` (sealed package bidding),
   `pmcRaBills`/`pmcSteelCerts` (RA bill certification, `cost:approve`-gated
   — the same capability Phase 4 noted BBS/steel-recon finalize uses),
   `pmcDigest`, `contractorPortal`, `sitePortal`. (Firm-issued project
   `tenders` + its `contractorPortal` bidding intake is adjacent but
   distinct — CLAUDE.md groups it under "Clients & projects," not Delivery —
   **not covered here**, still an open gap after this phase.)
3. **CPI (Client–Project Intelligence)** — a residential-project onboarding
   questionnaire (`cpiResponses`, section-keyed JSONB) whose `generateReport`
   mutation calls **Phase 7's `runAiGateway()` directly** — this domain is
   partially blocked on Phase 7's provider-architecture decision, not
   independent of it.
4. **Knowledge Bank / Library** — `knowledgeBankPortal` (repo upload +
   convert + publish, resolves the open question above),
   `specCatalog` (Library → Specification, versioned catalogue),
   `compliance`/`masterPlans`/`standards`/`lessons` (the rest of `CLAUDE.md`'s
   "Library" section — FAR/setback/NBC/fire/regulation sub-routers, master-plan
   file library, design standards by discipline, lessons-learned).

---

## HR / Payroll

| | Current | Target |
| --- | --- | --- |
| Roster | `teamMembers` (`esti_teammember`) — **a separate table from `users`/`profiles`**, not a straight alias. `assignments`/`attendance`/HR documents/job applications all FK to `teamMembers`, not to the auth-identity table | This directly reopens a question the [Phase 2 audit](./NEXTJS-MIGRATION-PHASE2-AUDIT.md) flagged and deferred: *"decide whether Phase 2 also needs a minimal `teamMembers`-equivalent, or whether tasks temporarily FK straight to `profiles` until HR lands."* Phase 2's live branch chose the latter (`tasks.assignee_id` → `profiles` directly). **Now that HR has landed (this phase), the deferred question is due**: either introduce a `team_members` table distinct from `profiles` (matching the current system exactly — a team member need not have login credentials, e.g. an HR record for someone not yet onboarded to the app) and migrate `tasks.assignee_id`/`reviewer_id` to point at it instead, or confirm `profiles` was always meant to absorb this and drop `teamMembers` as a separate concept. **Flagging, not deciding** — this is exactly the kind of "decide on purpose" case the series has surfaced repeatedly; picking wrong here means a breaking FK migration on `tasks` later |
| Teams | `teams` (`esti_team`) + `assignTeam` bulk-assign mutation — a grouping layer over `teamMembers`, `ownerProcedure`-gated create/update | Direct port once the roster-table question above is settled |
| Leaves | `leaves` (`esti_leave`) — `create` on plain `protectedProcedure` (any staff can request their own leave), `setStatus` on `hr:manage` (approve/reject) | Two-tier RLS: self-service insert (`is_office_staff()`, scoped to the requester's own `team_member_id`/`profile_id`) vs. approval (`is_partner_or_above()`-equivalent — `hr:manage` is rank 80, same tier Phase 3 established) |
| Payroll | `payroll` (`esti_payslip`) — `hr:manage`-gated throughout, `generate`/`markPaid`. PDF rendering (`payslip` target) already audited in [Phase 6](./NEXTJS-MIGRATION-PHASE6-AUDIT.md) | Direct port, `is_partner_or_above()`-equivalent RLS (reuse the helper introduced in Phase 3, gated at the `hr:manage` rank rather than a new one — same numeric rank, 80) |
| Attendance | `attendance` (`esti_attendance`) — `dayRegister`/`list`/`mark`, plain `protectedProcedure`. **This is the table Phase 5's ASPRF audit was missing** | Port now; unblocks Phase 5's `computeReliabilityKpi()` if that phase's implementation is sequenced after this one, or requires a small addendum to Phase 5's landing order if sequenced before |
| Recruitment | `hrProfiles`/`hrDocuments`/`jobApplications` (`esti_hr_profile`/`esti_hr_document`/`esti_job_application`) — **not mentioned anywhere in `CLAUDE.md`'s module map or route table**, found only by reading the schema file directly | Not audited in depth here (found late, budget didn't allow a full pass) — flag for a closer read before implementing; `CLAUDE.md` itself may need a module-map update once this is confirmed as a real, current feature (same kind of doc-drift this audit series has repeatedly found between `CLAUDE.md` and the live code) |

**Frontend:** `Team.tsx`/`Hr.tsx` (`hrEnabled`-gated, per `CLAUDE.md`'s route
table), `Payroll.tsx` (Finance › Payroll). No mention of a recruitment UI in
`CLAUDE.md`'s route table either — another thing to confirm rather than
assume during implementation.

---

## Delivery / Site-supervision / AProc

| | Current | Target |
| --- | --- | --- |
| Site supervision core | `snags`, `siteInstructions`, `progressReports`, `phaseProgress`, `siteVisits` — all read on `protectedProcedure`, write on `capabilityProcedure("write")`. PDF rendering for `progress_report`/`site_instruction` already audited in Phase 6 (both were flagged there as belonging to "nobody's phase" — this phase is that phase) | Direct port, `is_office_staff()` read + a `can_write()`-equivalent RLS helper for the `write` capability tier (not yet introduced by any prior phase's migration — Phases 2–7 only needed `is_office_staff()` and `is_partner_or_above()`; `write` is a third, lower tier per `permissions.ts` that this phase is the first to actually need) |
| AProc milestones | `pmcMilestones` — CSV import (`parseMilestoneCsv()`) and **Primavera P6 XER import** (`extractXerMilestones()`, looks for `TT_Mile`/`TT_FinMile`/`WBSSTEP` markers, optionally all `TASK` rows) — both pure TypeScript text-parsing functions, **no Python worker dependency**, unlike Phase 6's DXF/PDF processing | Port both parser functions verbatim into `web/lib/services/` or a Route Handler doing the file parse server-side (large-ish text payloads, probably a Route Handler rather than a Server Action for the file upload itself, same reasoning Phase 2/4 used for `exportData`/drawing uploads) |
| AProc packages + sealed bidding | `pmcPackages`/`pmcPackageTenders` — package-level tendering with invited-contractor sealed bids (`pmcPackageInvites`/`pmcPackageBids`) | This is a **second, independent sealed-bidding system** alongside the top-level `tenders`/`contractorPortal` (firm-issued project tenders) `CLAUDE.md` describes separately — confirm whether these two are meant to converge or genuinely serve different scopes (package-level vs. whole-project) before assuming one design covers both; not resolved here, and the top-level `tenders` namespace isn't covered by this phase at all (see scope map above) |
| AProc RA bills + steel certs | `pmcRaBills`/`pmcRaLines` (`cost:approve`-gated certification — same capability tier as BBS/steel-recon finalize, per Phase 4's note) + `pmcSteelCerts`. PDF rendering (`pmc_ra_bill` target) already audited in Phase 6 | RLS: needs an `is_partner_or_above()`-tier check specifically for `cost:approve` (same rank, 80, as `hr:manage`/`invoice:manage`/`fees:manage` — reuse the existing helper, don't introduce a fourth-named-but-identical-rank policy) |
| AProc digest | `pmcDigest` — portfolio-wide summary, `reports:view`-gated (same capability as Phase 5's GST/TDS reports) | Reuses Phase 5's `is_partner_or_above()` RLS directly, no new pattern |
| Contractor + site portals | `contractorPortal`, `sitePortal` — **not staff procedures at all**, gated by `contractorProcedure` (a distinct auth middleware from staff `protectedProcedure`, alongside the `clientProcedure`/`collaboratorProcedure` `CLAUDE.md` mentions for the client/consultant portals). `siteVisitRouter` mixes both: `list` on `protectedProcedure`, a custom `writeProcedure` wrapper, and presumably contractor-scoped writes via `contractorProcedure`. **Correction from the [Phase 9 audit](./NEXTJS-MIGRATION-PHASE9-AUDIT.md)**: the `contractorPortal` namespace actually mounted in `router.ts` is `contractor/portal.ts`, not `pmc/contractorPortal.ts` — the latter (this section's assumed source for AProc package-bid submission) is **dead code, never mounted, currently unreachable**. Contractors invited to bid on an AProc *package* have no working submission path today. See Phase 9 for the full finding and the resulting open decision (resurrect it under a new name, or drop it) | **This is a cross-cutting RLS pattern no prior phase has needed**: Phases 2–7 only ever needed `is_office_staff()`/`is_partner_or_above()` (both staff-role checks) plus one narrow client-portal read policy (Phase 2's `clients: own portal read`) and one flagged-but-unresolved client-write RPC idea (Phase 4's transmittal acknowledge). This phase is the first to need the full three-portal-role shape (`CLIENT`/`CONSULTANT`/`CONTRACTOR`) as a systematic RLS concern, not a one-off. Recommend introducing `is_contractor()`/`is_collaborator()` helpers parallel to `is_office_staff()`/`current_app_role() = 'CLIENT'`, each scoped by the matching `client_id`/`consultant_id`/`contractor_id` FK on `profiles` (already present as columns from Phase 2's migration, just unused by RLS until now) — `contractor/portal.ts`'s live `myTenders`/`getInvitation`/`submitBid`/`projectDetail` (Phase 9's tenders domain) plus its own AProc-adjacent reads (`myRunningBills`/`projectTeam`/`mySubmissions`) are this helper's first real consumers, not the dead package-bid file |

**Frontend:** `ContractorPortal.tsx` (invited tenders + sealed bids,
`CONTRACTOR` login), delivery tabs live inside `ProjectDetail.tsx` per
`CLAUDE.md`'s route table (same "confirm rather than assume" note Phase 4
gave Transmittals/Spec sheets/Drawings — this phase inherits it for
snags/site instructions/progress reports too).

---

## CPI (Client–Project Intelligence)

| | Current | Target |
| --- | --- | --- |
| Table | `cpiResponses` — one row per project, section-keyed JSONB (`CpiSectionId` enum, `CPI_SECTION_MAX_BYTES` = 32KB per section), `getOrCreateCpi()` handles the insert-or-fetch race with `onConflictDoNothing()` + a re-select fallback | Direct port; the race-handling pattern (`INSERT ... ON CONFLICT DO NOTHING` then re-select if the insert didn't return a row) is worth preserving as-is rather than assuming Supabase's client makes this trivial — it's still a real concurrent-request race regardless of the DB client |
| `saveSection` | Per-section upsert into the JSONB map, `protectedProcedure` (any staff) | Server Action, `is_office_staff()` RLS |
| `generateReport` | **Calls `runAiGateway()` directly** (same function [Phase 7](./NEXTJS-MIGRATION-PHASE7-AUDIT.md) audited) — assembles the questionnaire responses as the "prompt," asks ESTI to synthesize a structured `CpiReport` (parsed via `parseCpiReport()`, a strict-JSON-contract parser), which the architect then reviews/edits/saves. Also calls `assertPlanFeature` (the same licensing-plan gate Phase 7 already recommended dropping) | **This domain cannot be fully implemented independently of Phase 7's unresolved provider-architecture question.** `parseCpiReport()` itself (pure JSON-contract parsing) ports fine regardless; `generateReport`'s actual AI call is blocked on the same decision Phase 7 flagged. Land CPI's questionnaire CRUD (`get`/`saveSection`) now if this phase is implemented before Phase 7; treat `generateReport` as blocked until Phase 7's provider question resolves, same as any other AI-gateway caller |

**Frontend:** not found in `CLAUDE.md`'s route table at all — likely a tab
inside `ProjectDetail.tsx` or `Projects.tsx`'s onboarding flow, unconfirmed.

---

## Knowledge Bank / Library

| | Current | Target |
| --- | --- | --- |
| Knowledge Bank Portal | `knowledgeBankPortal` (`backend/src/modules/repository/`) — `esti_repo_source` table, `list`/`get`/`create`/`update`/`remove` on `write`-gated `manage` procedure (plain reads on `protectedProcedure`), `publish`/`unpublish` (visibility gate — presumably what makes a source available to `loadPublishedRepoKnowledge()`, the function [Phase 7](./NEXTJS-MIGRATION-PHASE7-AUDIT.md)'s AI retrieval layer reads from), and `processWithEoms` — the PDF→Markdown convert-and-rephrase action `CLAUDE.md` confirms is "unrelated internal processing, kept, UI-relabelled off the EOMS name." **The mutation name itself is still `processWithEoms`** — the UI label was changed but the backend procedure name wasn't, a small naming leftover from the same 2026-09 EOMS removal Phase 6 already found stale-comment evidence of elsewhere (`pdf_to_markdown.py`'s docstring) | Rename to something EOMS-free when this procedure becomes a Server Action (e.g. `processInternal`/`rephraseSource`) — cosmetic, but worth doing while the code is touched anyway rather than perpetuating a name that references a removed integration. The PDF→Markdown conversion itself is Phase 6's `pdf_to_markdown` worker job — this domain is the tRPC/CRUD half, Phase 6 audited the processing half; implement them together or explicitly sequence one after the other |
| Specification catalogue | `specCatalog` — versioned category/item/make/spec/finish rows (`RateBookLibrary.tsx`'s sibling per `CLAUDE.md`'s route table — `SpecCatalogLibrary.tsx`), plain `protectedProcedure` throughout (no capability gate found, matching the Phase 3 audit's observation that not every domain is capability-gated the way financial ones are) | Direct port, `is_office_staff()` RLS |
| Compliance / Master Plans / Standards / Lessons | `compliance` (FAR/setback/NBC/fire/regulation sub-routers), `masterPlans` (file library), `standards` (by discipline + attached files), `lessons` (lessons-learned) — **none opened in depth in this audit pass**, named only from `CLAUDE.md`'s "Library (2026-06-29)" section and the module directory listing | Not audited here — this phase's four named domains (HR, Delivery, CPI, Knowledge Bank Portal) already exceeded the time budget for a single pass; these four sub-domains would need their own closer read before implementation, structurally similar to `specCatalog`/`knowledgeBankPortal` (plain CRUD, file attachments, `is_office_staff()` RLS) but not confirmed |

**Frontend:** `SpecCatalogLibrary.tsx`, `ComplianceLibrary.tsx`,
`MasterPlanLibrary.tsx`, `StandardsLibrary.tsx` — all named in `CLAUDE.md`'s
route table already (`/libraries/*`), unlike most of this phase's other
domains which needed inference. `KnowledgeBankPortal.tsx` likewise named.

---

## Suggested Phase 8 approach

This phase's four domains are far more independent of each other than any
prior phase's internal sequencing — pick based on what unblocks other work:

1. **Attendance** — small, no dependencies beyond Phase 2's `profiles`, and
   directly unblocks Phase 5's ASPRF reliability KPI if that phase hasn't
   shipped yet.
2. **Decide the `teamMembers`-vs-`profiles` question** before touching HR
   further — it affects a live Phase 2 schema decision (`tasks.assignee_id`)
   that would need a migration to change later if decided wrong now.
3. **Knowledge Bank Portal** — mostly independent, but its `publish`/
   `unpublish` visibility gate feeds Phase 7's retrieval layer directly, so
   sequence before Phase 7 if both are unimplemented, or revisit Phase 7's
   retrieval once this lands if Phase 7 shipped first.
4. **CPI questionnaire CRUD** — independent of everything except Phase 7's
   `generateReport` half, which stays blocked either way.
5. **Delivery/AProc** — the largest sub-domain, genuinely independent of the
   rest of this phase; introduce the `is_contractor()`/`is_collaborator()` RLS
   pattern here since it's the first domain that actually needs it.
6. **specCatalog, compliance, masterPlans, standards, lessons** — smallest
   individual pieces, land opportunistically; each needs its own closer read
   first per the note above.

---

## What this audit deliberately did not cover

- ~~`compliance`/`masterPlans`/`standards`/`lessons`~~, ~~`hrProfiles`/
  `hrDocuments`/`jobApplications`~~, and ~~the top-level `tenders`/
  `contractorPortal` firm-issued-tender flow~~ — **all three now covered by
  the [Phase 9 audit](./NEXTJS-MIGRATION-PHASE9-AUDIT.md)**, which also found
  that `hrProfile.ts` (not a missing namespace, just three underlying tables
  found late) is internal HR tracking, not a public careers intake, and that
  `pmcPackageTenders`' contractor-facing bid submission is dead code — see
  Phase 9's headline finding.
- **`siteVisitRouter`'s exact `writeProcedure` custom-wrapper logic** — noted
  as mixing staff and contractor access, not traced line-by-line.
- **Whether this phase should actually exist as written** — per the framing
  at the top of this document, that's a call for whoever owns
  `ROADMAP-CLOUD.md`, not settled by this audit.
