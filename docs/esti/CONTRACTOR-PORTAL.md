# Contractor Portal — scope, status and gaps

*Opened 2026-10-08, from the request: contractors see their **current projects**, view the **latest drawings** and a
**drawing change log**, **raise tickets**, **schedule meetings**, use **other communication**, **submit running bills**,
see **project cost tracking** and a **progress schedule**.*

## 1. Audit — what existed before this pass

| Requirement | Status before | Evidence |
|---|---|---|
| Tender invitations, sealed lump-sum bids, decline | ✅ built (2026-09-06) | `/contractor-portal`, `/contractor-portal/[invitationId]`, `tender_invitations` / `tender_bids` |
| Current projects | ❌ missing | A contractor could not read `project_offices`; nothing linked a contractor to a project beyond a tender invitation. The 2026-09-06 notes list `projectDetail` as *deliberately deferred* |
| Latest drawings | ❌ missing | `drawings` had RLS for staff, client and consultant only |
| Drawing change log | ❌ missing in the portal | The data exists on `drawings` (`rev_no`, `root_id`, `is_current`, `revision_note`) but was not exposed |
| Raise tickets / meetings / communication | ❌ missing | `contractor_submissions` existed (staff-only RLS, no UI); `submission_messages` had no contractor thread column |
| Running bills | ❌ missing | `pmc_ra_bills` is the studio's own RA-bill workflow, staff-only; the notes list contractor running bills as deferred |
| Project cost tracking | ❌ missing | No contractor-facing view |
| Progress schedule | ❌ missing | `pmc_milestones` staff-only |
| Studio-side handling of the above | ⚠️ partial | RA bills have a staff UI; contractor tickets had none |

## 2. What this pass built

**Definition of "current project".** A project where the contractor holds an **awarded package** (`pmc_packages`, status
AWARDED / IN_PROGRESS / COMPLETE) or an **awarded tender** (`tenders.awarded_contractor_id`). Helper:
`my_contractor_project_ids()`.

**Access model (migration 0099).** Reads are RLS-scoped, never a broad `project_offices` grant (that would expose
contract values and client data): `drawings` (READY, current projects), `pmc_packages` (own), `pmc_milestones`
(current projects), `pmc_ra_bills` (own packages), `contractor_submissions` (own), `submission_messages` (own threads).
The project name/city/package come from `my_contractor_projects()`. Writes: tickets/messages by RLS insert policies;
bills by `submit_contractor_ra_bill()` (validates the package, mints the RA reference, inserts a DRAFT).

**Portal** (`/contractor-portal`, `/contractor-portal/projects/[projectId]`):
1. Home lists **Current projects** above the tender invitations.
2. **Drawings** — the latest issue of each drawing, and a **change log** of every revision with its note.
3. **Progress schedule** — milestones, planned vs actual, % complete, status; a *Report progress* form.
4. **Running bills** — own bills with status, plus a submit form (bill no., period, gross, work covered).
5. **Cost tracking** — contract value, claimed, in review, certified (gross and net), retention, balance to bill, % billed vs % progress.
6. **Tickets, meetings and messages** — raise a ticket / meeting request / RFI / progress update / note; threaded replies.

**Studio side.** `/contractor-tickets` (Site group): every contractor item with its thread, a status + reply form and a
thread post. Contractor-submitted RA bills appear in `/pmc-ra-bills` tagged *Submitted by contractor*.

**Demo data** (0100): two packages, milestones, three bills, a drawing with three revisions, tickets, a meeting request
and a thread — re-applied nightly by `seed_portal_demo_data()`.

## 3. Pending items — built 2026-10-08 (migrations 0101, 0102)
- **Meeting scheduling:** the studio confirms a date, time (IST) and place on a meeting / site-visit / joint-measurement request; the contractor sees it on the thread and downloads an `.ics` (`/api/contractor-file/ics`).
- **Drawing download:** the drawings table links each file through `/api/contractor-file?t=drawing` (RLS lookup, then a 5-minute signed URL).
- **Measurement-line RA bills:** see § 4.
- **Attachments:** photo/PDF (10 MB) on tickets, progress updates and bills, stored in the private `contractor-attachments` bucket, served through the same signed-URL route.
- **Notifications:** email to the firm's owners/partners on new items and bills; email to the contractor on a studio reply or meeting confirmation. Best-effort — needs `SMTP_*`; silent when unconfigured.
- **Tender award → package:** `awardTender` creates the `pmc_packages` row (value = the sealed bid, `tender_id` recorded) so the contractor can bill straight away.
- **Progress updates:** the contractor picks a milestone and a percentage; the studio's **Apply to milestone** button writes it (100% marks COMPLETE with today's actual date). The programme stays the studio's decision.
- **Site visits / joint measurements:** two new request kinds in the same form and inbox.
- **Critical path:** the studio sets duration, predecessor, link type and lag per milestone (Programme Milestones); the contractor sees a computed critical path, float and Gantt bars.
- **Variations and payments (0103):** studio adds signed variations per package (approval needs `cost:approve`) and records payment received on each RA bill; the contractor's cost tracking shows original value, approved variations, revised value, received to date and certified-but-unpaid.
- **Measurement abstract, steel reconciliation, final account (0104):** the abstract accumulates RA-line quantities per item across bills (`lib/billing/measurement-abstract.ts`); steel certs become visible to the contractor once certified; the final account (`lib/billing/final-account.ts`) rolls original + approved variations, certified net, retention to release and received into a balance due, flagged *projected* until everything is billed and certified.
- Still not built: rate-book versioning and the Perimeter basis. The attachment upload and email paths need the service-role key and SMTP, so they were not exercised on the local QA stack.

## 4. AQC-Core logic ported (2026-10-08)
Reference repo `HolagundiWorks/AQC` (read-only). Ported as deterministic, tested TypeScript (`tests/ra-bill-cpm.test.ts`):
- **Billing** — `lib/billing/ra-bill.ts` (`RunningBill`: gross, GST, retention/TDS/cess/GST-TDS, net; `PREFIX/RA/FY/NNN` numbering).
- **Scheduling** — `lib/scheduling/cpm.ts` (`ScheduleCalculator`: FS/SS/FF/SF + lag, forward/backward pass, float, critical path, cycle detection). Wired to the contractor's Progress schedule (critical path + Gantt) via milestone duration/predecessor columns (0102).
- **Estimation** — markup cascade already live in `lib/tax/estimate-markups.ts`; linked-item derivation (`lib/estimating/derivation.ts`, port of `DerivationEngine`: topological rule order, chained masonry → plaster → paint) now proposes lines on the estimate page, added at rate 0 via *Add linked items*. Trade is inferred from the item description by keyword and the basis from its unit; AQC's Perimeter basis and rate-book versioning are not ported.
