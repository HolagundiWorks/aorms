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

## 3. Known gaps (documented, not built)
- **Meeting scheduling is a request, not a booking.** The studio replies with a time; there is no calendar, invite or availability check.
- **No drawing file download.** Contractors see the register and revision history, not the DXF/PDF (no storage-read policy; demo rows have no file).
- ~~Bills are lump-sum claims.~~ **Done (migration 0101):** measurement-line RA bills (previous / this-bill qty × rate into `pmc_ra_lines`) with AQC-Core's statutory terms — retention, GST added, TDS 194C, labour cess, GST-TDS, advance recovery — and a live net-payable statement. TS twin `lib/billing/ra-bill.ts`; SQL recomputes in `submit_contractor_ra_bill_lines`. Still missing: joint-measurement abstract, steel reconciliation.
- **Cost tracking is derived** from package value and bills only: no variations/deviations, final account or payment (received) dates.
- **Progress is reported, not edited.** The studio keeps the programme; a contractor's progress update does not change milestones automatically.
- **No attachments** on tickets or bills (photos, measurement sheets); `contractor_submissions.storage_key` exists but there is no upload.
- **No notifications.** New tickets and bills reach the studio only by visiting the inbox / RA-bill list.
- **Awarding a tender does not create a package.** An awarded tender makes the project "current", but a contractor can only bill against a `pmc_packages` row.
- **Site visits and joint measurements** (kinds in the original design) have no form.

## 4. AQC-Core logic ported (2026-10-08)
Reference repo `HolagundiWorks/AQC` (read-only). Ported as deterministic, tested TypeScript (`tests/ra-bill-cpm.test.ts`):
- **Billing** — `lib/billing/ra-bill.ts` (`RunningBill`: gross, GST, retention/TDS/cess/GST-TDS, net; `PREFIX/RA/FY/NNN` numbering).
- **Scheduling** — `lib/scheduling/cpm.ts` (`ScheduleCalculator`: FS/SS/FF/SF + lag, forward/backward pass, float, critical path, cycle detection). **Engine only — not yet wired to a UI**: milestones carry no dependency links, so a Gantt/critical-path view needs predecessor + duration columns first.
- **Estimation** — markup cascade already live in `lib/tax/estimate-markups.ts`; linked-item derivation and rate-book versioning are not ported.
- Pending from the original list (still open): meeting booking/.ics, drawing download, attachments upload UI, notifications, tender-award → package, progress → milestone apply, site-visit/joint-measurement forms. DB prerequisites for several are in 0101.
