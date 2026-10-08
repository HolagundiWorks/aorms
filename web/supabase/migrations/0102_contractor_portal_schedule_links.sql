-- Contractor Portal completion (2026-10-08): milestone schedule links for the CPM view (AQC ScheduleCalculator),
-- tender-award provenance on packages, and progress-update application tracking.
alter table public.pmc_milestones add column if not exists duration_days integer check (duration_days is null or duration_days >= 0);
alter table public.pmc_milestones add column if not exists predecessor_id uuid references public.pmc_milestones (id) on delete set null;
alter table public.pmc_milestones add column if not exists dep_type text not null default 'FS' check (dep_type in ('FS', 'SS', 'FF', 'SF'));
alter table public.pmc_milestones add column if not exists lag_days integer not null default 0;
alter table public.contractor_submissions add column if not exists applied_at timestamptz;
alter table public.pmc_packages add column if not exists tender_id uuid references public.tenders (id) on delete set null;

-- Demo schedule links for the CPM view; re-applied nightly at 21:50 UTC after the portal demo seed (21:45). Applied live.
create or replace function public.seed_contractor_schedule_links() returns void language sql security definer set search_path = '' as $$
  update public.pmc_milestones set duration_days = 20, predecessor_id = null where ref = 'PD-MS-01';
  update public.pmc_milestones set duration_days = 20, predecessor_id = (select id from public.pmc_milestones where ref = 'PD-MS-01' limit 1) where ref = 'PD-MS-02';
  update public.pmc_milestones set duration_days = 24, predecessor_id = (select id from public.pmc_milestones where ref = 'PD-MS-02' limit 1) where ref = 'PD-MS-03';
  update public.pmc_milestones set duration_days = 28, predecessor_id = (select id from public.pmc_milestones where ref = 'PD-MS-03' limit 1) where ref = 'PD-MS-04';
  update public.pmc_milestones set duration_days = 14, predecessor_id = (select id from public.pmc_milestones where ref = 'PD-MS-03' limit 1) where ref = 'PD-MS-05';
  update public.pmc_milestones set duration_days = 10, predecessor_id = null where ref = 'PD-MS-06';
  update public.pmc_milestones set duration_days = 14, predecessor_id = (select id from public.pmc_milestones where ref = 'PD-MS-06' limit 1) where ref = 'PD-MS-07';
$$;
revoke execute on function public.seed_contractor_schedule_links() from public, anon, authenticated;
select cron.schedule('seed-contractor-schedule-links', '50 21 * * *', 'select public.seed_contractor_schedule_links()');
