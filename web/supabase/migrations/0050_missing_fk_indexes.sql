-- 2026-09-14 — performance audit: `project_id` is the single most
-- commonly filtered column across this whole app (nearly every
-- project-scoped sub-page does `.eq("project_id", id)`), yet only two
-- tables (`esti_embeddings`, `takeoff_items`) had any index on it before
-- this — every other one of the 36 tables below was doing a full table
-- scan on every project-detail page load. Scoped to `project_id` plus the
-- two other explicitly hot FK columns the audit named (`tasks.
-- assignee_id`, used by /workload's assignee join; `engagements.
-- consultant_id`, used by /consultants/[id]) and the contractor_id
-- columns that back the Contractor Portal's own "my assigned records"
-- queries — not a blanket index-every-FK sweep (a much larger, separately
-- justified change; ~150 other FK columns were found with no index and
-- are deliberately left alone here, most of them low-traffic admin/
-- lookup tables where a seq scan is genuinely fine).
--
-- `if not exists` throughout — safe to re-run, and two tables
-- (`esti_embeddings`, `takeoff_items`) already have a project_id index
-- from an earlier migration; this doesn't duplicate those.
create index if not exists ai_runs_project_id_idx on public.ai_runs (project_id);
create index if not exists approvals_project_id_idx on public.approvals (project_id);
create index if not exists assignments_project_id_idx on public.assignments (project_id);
create index if not exists bbs_schedules_project_id_idx on public.bbs_schedules (project_id);
create index if not exists consultant_submissions_project_id_idx on public.consultant_submissions (project_id);
create index if not exists contractor_submissions_project_id_idx on public.contractor_submissions (project_id);
create index if not exists contracts_project_id_idx on public.contracts (project_id);
create index if not exists decisions_project_id_idx on public.decisions (project_id);
create index if not exists document_issues_project_id_idx on public.document_issues (project_id);
create index if not exists drawings_project_id_idx on public.drawings (project_id);
create index if not exists engagements_project_id_idx on public.engagements (project_id);
create index if not exists estimates_project_id_idx on public.estimates (project_id);
create index if not exists feasibility_reports_project_id_idx on public.feasibility_reports (project_id);
create index if not exists invoices_project_id_idx on public.invoices (project_id);
create index if not exists lessons_learned_project_id_idx on public.lessons_learned (project_id);
create index if not exists letters_project_id_idx on public.letters (project_id);
create index if not exists moms_project_id_idx on public.moms (project_id);
create index if not exists phases_project_id_idx on public.phases (project_id);
create index if not exists pmc_milestones_project_id_idx on public.pmc_milestones (project_id);
create index if not exists pmc_packages_project_id_idx on public.pmc_packages (project_id);
create index if not exists pmc_ra_bills_project_id_idx on public.pmc_ra_bills (project_id);
create index if not exists pmc_steel_certs_project_id_idx on public.pmc_steel_certs (project_id);
create index if not exists portal_submissions_project_id_idx on public.portal_submissions (project_id);
create index if not exists programs_project_id_idx on public.programs (project_id);
create index if not exists progress_reports_project_id_idx on public.progress_reports (project_id);
create index if not exists project_negotiations_project_id_idx on public.project_negotiations (project_id);
create index if not exists project_opportunities_project_id_idx on public.project_opportunities (project_id);
create index if not exists project_risks_project_id_idx on public.project_risks (project_id);
create index if not exists proposals_project_id_idx on public.proposals (project_id);
create index if not exists purchase_orders_project_id_idx on public.purchase_orders (project_id);
create index if not exists site_instructions_project_id_idx on public.site_instructions (project_id);
create index if not exists snags_project_id_idx on public.snags (project_id);
create index if not exists spec_sheets_project_id_idx on public.spec_sheets (project_id);
create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists tenders_project_id_idx on public.tenders (project_id);
create index if not exists transmittals_project_id_idx on public.transmittals (project_id);

-- Other explicitly hot FK columns.
create index if not exists tasks_assignee_id_idx on public.tasks (assignee_id);
create index if not exists engagements_consultant_id_idx on public.engagements (consultant_id);
create index if not exists pmc_packages_contractor_id_idx on public.pmc_packages (contractor_id);
create index if not exists pmc_package_invites_contractor_id_idx on public.pmc_package_invites (contractor_id);
create index if not exists tender_invitations_contractor_id_idx on public.tender_invitations (contractor_id);
create index if not exists site_instructions_contractor_id_idx on public.site_instructions (contractor_id);
