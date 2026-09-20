-- Fixes the same authorization bug QA found on `clients` (VIEWER could
-- create client records via /clients), now closed across every other
-- table that had the identical mistake: a write-side policy (INSERT/
-- UPDATE/DELETE/ALL) gated on `is_office_staff()` instead of
-- `has_capability('write')`.
--
-- `is_office_staff()` (0001, extended by 0078) answers "can this role see
-- staff data" and deliberately includes VIEWER and SITE_SUPERVISOR — it
-- was never meant to gate writes. The write-side convention used
-- consistently from roughly migration 0011 onward is
-- `has_capability('write')` (rank >= 40; VIEWER is rank 20, and
-- SITE_SUPERVISOR's only grant is `site_portal` — see
-- 0002_capability_helper.sql), but the original Phase 2/3/4 core tables
-- (and a few later ones that copied their shape) predate that
-- convention and were never swept.
--
-- web/ has no app-layer authorization at all (grep -rn "requireCapability
-- \|hasCapability" web/lib/actions turns up nothing outside ai.ts/
-- bbs.ts/pmc-steel-certs.ts) — RLS is the *only* enforcement boundary, so
-- every one of these was a real, directly-exploitable hole via a plain
-- PostgREST/supabase-js call, not just a defense-in-depth gap.
--
-- Every `staff read` (SELECT) policy on these tables is untouched and
-- stays on `is_office_staff()` — VIEWER/SITE_SUPERVISOR keeping read
-- access is intended. Where a table's write policy is `for all` and
-- there's a separate `staff read` policy, narrowing the `for all`
-- policy's `using`/`with check` doesn't remove SELECT access: permissive
-- policies OR together, so the untouched `staff read` policy keeps
-- granting it independently.
--
-- Scope note: this migration only swaps the role-class gate
-- (is_office_staff -> has_capability('write')), the minimal fix for the
-- specific VIEWER/SITE_SUPERVISOR bug class. It deliberately does NOT
-- second-guess `write`'s rank (40, ASSOCIATE+) against a more specific
-- capability some of these tables might arguably want instead (e.g.
-- `leaves`/`attendance`/`team_memberships` are HR data, and
-- `packages/contracts/src/permissions.ts` documents `hr:manage` — L2+
-- only — for exactly "team + HR + payroll operations"; using `write`
-- here still closes the VIEWER hole but leaves ASSOCIATE/SENIOR with
-- HR-record access `hr:manage`'s own definition suggests they shouldn't
-- have). That's a separate, bigger behavioral change than "fix the
-- clients-class bug" and is left for a follow-up decision rather than
-- bundled in here silently.
--
-- Explicitly NOT touched, audited and confirmed intentional (see each
-- table's own migration-header comments):
--   - audit_log ("staff insert"): deliberately insert-only for ANY
--     authenticated staff action (0001) via `write_audit()`, itself
--     `security invoker` so it runs as the calling user — an VIEWER
--     performing a VIEWER-permitted action still needs to log it.
--   - ai_runs ("staff write"): self-logging of ESTI Ask usage, which is
--     read-only Q&A available to all office staff by design (0010).
--   - ai_devices ("staff insert"/"staff delete"): migration 0043's own
--     header comment states "registering/removing a device is a staff
--     decision" without a rank carve-out, and deliberately has no
--     staff UPDATE policy at all (device gateway/service-role owns
--     status) — read as intentionally broad, not reconsidered here.

-- ── core project objects (Phase 2, the ones most exploitable exactly
--    like clients was — projects, phases, tasks) ───────────────────────
alter policy "project_offices: staff create" on public.project_offices
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "project_offices: staff update" on public.project_offices
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "phases: staff write" on public.phases
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "tasks: staff write" on public.tasks
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

-- ── clients (the originally-reported bug; recreating the fix here since
--    a prior migration file for it was never actually committed) ───────
alter policy "clients: staff create" on public.clients
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

-- ── everything else found in the same audit ──────────────────────────
alter policy "approvals: staff write" on public.approvals
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "assignments: staff write" on public.assignments
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "attendance: staff write" on public.attendance
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "contractor_submissions: staff write" on public.contractor_submissions
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "contractors: staff write" on public.contractors
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "contracts: staff write" on public.contracts
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "cpi_responses: staff write" on public.cpi_responses
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "decisions: staff write" on public.decisions
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "document_issues: staff insert" on public.document_issues
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "drawings: staff write" on public.drawings
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "leads: staff write" on public.leads
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "leaves: staff write" on public.leaves
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "lessons_learned: staff write" on public.lessons_learned
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "letters: staff write" on public.letters
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "mom_actions: staff write" on public.mom_actions
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "moms: staff write" on public.moms
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "office_templates: staff write" on public.office_templates
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "po_items: staff write" on public.po_items
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "project_briefs: staff write" on public.project_briefs
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "purchase_orders: staff write" on public.purchase_orders
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "site_inspection_reports: staff write" on public.site_inspection_reports
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

-- site_inspection_photos has no firm_id column of its own — scoped via
-- its parent report, same join the existing policy already used.
alter policy "site_inspection_photos: staff write" on public.site_inspection_photos
  using (
    exists (
      select 1 from public.site_inspection_reports r
      where r.id = report_id
        and public.has_capability('write')
        and r.firm_id = public.current_firm_id()
    )
  )
  with check (
    exists (
      select 1 from public.site_inspection_reports r
      where r.id = report_id
        and public.has_capability('write')
        and r.firm_id = public.current_firm_id()
    )
  );

alter policy "spec_catalog_items: staff write" on public.spec_catalog_items
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "spec_catalog_versions: staff write" on public.spec_catalog_versions
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "spec_items: staff write" on public.spec_items
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "spec_sheets: staff write" on public.spec_sheets
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "task_dependencies: staff write" on public.task_dependencies
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "task_missing_params: staff write" on public.task_missing_params
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "team_memberships: staff write" on public.team_memberships
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "transmittal_items: staff write" on public.transmittal_items
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter policy "transmittals: staff write" on public.transmittals
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());
