-- Multi-tenancy, Batch 7/12 -- Delivery ops / PMC.
-- snags, site_instructions, progress_reports, phase_progress, pmc_milestones, pmc_packages, pmc_package_invites, pmc_package_bids, pmc_steel_certs, pmc_ra_bills, pmc_ra_lines. All uniform Pattern A (staff read + write
-- capability, no portal policies in this batch).

alter table public.snags add column firm_id uuid references public.firms (id);
update public.snags set firm_id = (select id from public.firms limit 1);
alter table public.snags
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index snags_firm_id_idx on public.snags (firm_id);
alter policy "snags: staff read" on public.snags
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "snags: write capability" on public.snags
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.site_instructions add column firm_id uuid references public.firms (id);
update public.site_instructions set firm_id = (select id from public.firms limit 1);
alter table public.site_instructions
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index site_instructions_firm_id_idx on public.site_instructions (firm_id);
alter policy "site_instructions: staff read" on public.site_instructions
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "site_instructions: write capability" on public.site_instructions
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.progress_reports add column firm_id uuid references public.firms (id);
update public.progress_reports set firm_id = (select id from public.firms limit 1);
alter table public.progress_reports
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index progress_reports_firm_id_idx on public.progress_reports (firm_id);
alter policy "progress_reports: staff read" on public.progress_reports
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "progress_reports: write capability" on public.progress_reports
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.phase_progress add column firm_id uuid references public.firms (id);
update public.phase_progress set firm_id = (select id from public.firms limit 1);
alter table public.phase_progress
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index phase_progress_firm_id_idx on public.phase_progress (firm_id);
alter policy "phase_progress: staff read" on public.phase_progress
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "phase_progress: write capability" on public.phase_progress
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.pmc_milestones add column firm_id uuid references public.firms (id);
update public.pmc_milestones set firm_id = (select id from public.firms limit 1);
alter table public.pmc_milestones
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index pmc_milestones_firm_id_idx on public.pmc_milestones (firm_id);
alter policy "pmc_milestones: staff read" on public.pmc_milestones
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "pmc_milestones: write capability" on public.pmc_milestones
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.pmc_packages add column firm_id uuid references public.firms (id);
update public.pmc_packages set firm_id = (select id from public.firms limit 1);
alter table public.pmc_packages
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index pmc_packages_firm_id_idx on public.pmc_packages (firm_id);
alter policy "pmc_packages: staff read" on public.pmc_packages
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "pmc_packages: write capability" on public.pmc_packages
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.pmc_package_invites add column firm_id uuid references public.firms (id);
update public.pmc_package_invites set firm_id = (select id from public.firms limit 1);
alter table public.pmc_package_invites
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index pmc_package_invites_firm_id_idx on public.pmc_package_invites (firm_id);
alter policy "pmc_package_invites: staff read" on public.pmc_package_invites
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "pmc_package_invites: write capability" on public.pmc_package_invites
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.pmc_package_bids add column firm_id uuid references public.firms (id);
update public.pmc_package_bids set firm_id = (select id from public.firms limit 1);
alter table public.pmc_package_bids
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index pmc_package_bids_firm_id_idx on public.pmc_package_bids (firm_id);
alter policy "pmc_package_bids: staff read" on public.pmc_package_bids
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "pmc_package_bids: write capability" on public.pmc_package_bids
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.pmc_steel_certs add column firm_id uuid references public.firms (id);
update public.pmc_steel_certs set firm_id = (select id from public.firms limit 1);
alter table public.pmc_steel_certs
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index pmc_steel_certs_firm_id_idx on public.pmc_steel_certs (firm_id);
alter policy "pmc_steel_certs: staff read" on public.pmc_steel_certs
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "pmc_steel_certs: write capability" on public.pmc_steel_certs
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.pmc_ra_bills add column firm_id uuid references public.firms (id);
update public.pmc_ra_bills set firm_id = (select id from public.firms limit 1);
alter table public.pmc_ra_bills
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index pmc_ra_bills_firm_id_idx on public.pmc_ra_bills (firm_id);
alter policy "pmc_ra_bills: staff read" on public.pmc_ra_bills
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "pmc_ra_bills: write capability" on public.pmc_ra_bills
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.pmc_ra_lines add column firm_id uuid references public.firms (id);
update public.pmc_ra_lines set firm_id = (select id from public.firms limit 1);
alter table public.pmc_ra_lines
  alter column firm_id set not null,
  alter column firm_id set default public.current_firm_id();
create index pmc_ra_lines_firm_id_idx on public.pmc_ra_lines (firm_id);
alter policy "pmc_ra_lines: staff read" on public.pmc_ra_lines
  using (public.is_office_staff() and firm_id = public.current_firm_id());
alter policy "pmc_ra_lines: write capability" on public.pmc_ra_lines
  using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

