-- Phase 8 (proposed) — Delivery/AProc: site supervision (snags, site
-- instructions, progress reports, phase progress) + owner-side programme
-- (milestones) + package-level tendering (packages/invites/bids, a SECOND
-- independent sealed-bidding system alongside Phase 9's firm-issued
-- `tenders` — the Phase 8 audit flagged these as maybe-should-converge,
-- not resolved here, ported as the two distinct systems they are today) +
-- steel certification + RA bills.
--
-- RLS confirmed uniformly from every pmc/*.ts router: read = bare
-- protectedProcedure (is_office_staff()), write = capabilityProcedure
-- ("write") (has_capability('write')) — except the CERTIFIED transition on
-- steel certs / RA bills, which additionally requires cost:approve
-- (raBills.ts's `certify` procedure, steelCerts.ts's inline `can(...,
-- "cost:approve")` check) — enforced here as triggers, same defense-in-depth
-- reasoning as Phase 4's estimate-lock trigger (RLS alone can't gate a
-- specific column transition).
--
-- Package bids get the same sealed-view treatment as Phase 9's tender_bids:
-- `pmcPackages.bids_opened_at` (null = sealed) governs amount_paise/
-- cover_note visibility, per packageTenders.ts's own listBids redaction.
-- NOTE: the contractor-facing bid *submission* path (pmc/contractorPortal.ts)
-- was found dead/unreachable and deleted earlier this session (see
-- ROADMAP-CLOUD.md's cleanup backlog) — this schema still exists because
-- staff-side package/bid viewing and steel/RA-bill certification are live,
-- reachable features independent of that broken submission path.

create table public.snags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  ref text not null,
  location text,
  trade text,
  description text not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'VERIFIED', 'CLOSED')),
  photo_key text,
  contractor_submission_id uuid references public.contractor_submissions (id),
  due_date date,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.snags enable row level security;
create policy "snags: staff read" on public.snags
  for select using (public.is_office_staff());
create policy "snags: write capability" on public.snags
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.site_instructions (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  project_id uuid not null references public.project_offices (id) on delete cascade,
  contractor_id uuid references public.contractors (id) on delete set null,
  subject text not null,
  body text,
  issued_at date,
  acknowledged_at timestamptz,
  pdf_key text,
  pdf_status text not null default 'NONE',
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_instructions enable row level security;
create policy "site_instructions: staff read" on public.site_instructions
  for select using (public.is_office_staff());
create policy "site_instructions: write capability" on public.site_instructions
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.progress_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  narrative text,
  physical_progress_pct integer,
  schedule_progress_pct integer,
  open_snag_count integer not null default 0,
  open_rfi_count integer not null default 0,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ISSUED')),
  pdf_key text,
  pdf_status text not null default 'NONE',
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.progress_reports enable row level security;
create policy "progress_reports: staff read" on public.progress_reports
  for select using (public.is_office_staff());
create policy "progress_reports: write capability" on public.progress_reports
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.phase_progress (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.phases (id) on delete cascade,
  live_stage_code text not null,
  label text not null,
  status text not null default 'NOT_STARTED' check (status in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE')),
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.phase_progress enable row level security;
create policy "phase_progress: staff read" on public.phase_progress
  for select using (public.is_office_staff());
create policy "phase_progress: write capability" on public.phase_progress
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.pmc_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  ref text not null,
  title text not null,
  planned_date date,
  actual_date date,
  percent_complete integer not null default 0,
  status text not null default 'PLANNED' check (status in ('PLANNED', 'ON_TRACK', 'AT_RISK', 'DELAYED', 'COMPLETE')),
  baseline_ref text,
  sort_order integer not null default 0,
  notes text,
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pmc_milestones enable row level security;
create policy "pmc_milestones: staff read" on public.pmc_milestones
  for select using (public.is_office_staff());
create policy "pmc_milestones: write capability" on public.pmc_milestones
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.pmc_packages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  ref text not null,
  title text not null,
  trade text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'TENDERING', 'AWARDED', 'IN_PROGRESS', 'COMPLETE', 'CANCELLED')),
  contractor_id uuid references public.contractors (id) on delete set null,
  contract_value_paise bigint,
  tender_close_date date,
  award_date date,
  bids_opened_at timestamptz,
  notes text,
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pmc_packages enable row level security;
create policy "pmc_packages: staff read" on public.pmc_packages
  for select using (public.is_office_staff());
create policy "pmc_packages: write capability" on public.pmc_packages
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.pmc_package_invites (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.pmc_packages (id) on delete cascade,
  contractor_id uuid not null references public.contractors (id) on delete cascade,
  status text not null default 'INVITED' check (status in ('INVITED', 'WITHDRAWN', 'DECLINED')),
  notes text,
  invited_by_id uuid references public.profiles (id) on delete set null,
  invited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pmc_package_invites enable row level security;
create policy "pmc_package_invites: staff read" on public.pmc_package_invites
  for select using (public.is_office_staff());
create policy "pmc_package_invites: write capability" on public.pmc_package_invites
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.pmc_package_bids (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.pmc_packages (id) on delete cascade,
  invite_id uuid references public.pmc_package_invites (id) on delete set null,
  contractor_id uuid not null references public.contractors (id) on delete cascade,
  amount_paise bigint not null,
  cover_note text,
  validity_days integer,
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED', 'WITHDRAWN', 'AWARDED', 'REJECTED')),
  submitted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pmc_package_bids enable row level security;
-- Base table stays staff-readable, matching current app behaviour (see
-- header note) — pmc_package_bids_sealed below is the real seal.
create policy "pmc_package_bids: staff read" on public.pmc_package_bids
  for select using (public.is_office_staff());
create policy "pmc_package_bids: write capability" on public.pmc_package_bids
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create view public.pmc_package_bids_sealed
with (security_invoker = true) as
select
  b.id,
  b.package_id,
  b.invite_id,
  b.contractor_id,
  case when p.bids_opened_at is not null then b.amount_paise else null end as amount_paise,
  case when p.bids_opened_at is not null then b.cover_note else null end as cover_note,
  b.validity_days,
  b.status,
  (p.bids_opened_at is null) as sealed,
  b.submitted_at,
  b.withdrawn_at,
  b.created_at,
  b.updated_at
from public.pmc_package_bids b
join public.pmc_packages p on p.id = b.package_id;

comment on view public.pmc_package_bids_sealed is
  'Port of packageTenders.ts listBids'' redaction (bidsAreSealed(pkg) = bids_opened_at is null). Query this, not pmc_package_bids directly, wherever the app shows bid amounts to firm staff.';

create table public.pmc_steel_certs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  package_id uuid references public.pmc_packages (id) on delete set null,
  ref text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SITE_CHECKED', 'CERTIFIED', 'SENT_TO_CLIENT', 'CLOSED')),
  issued_kg double precision not null default 0,
  consumed_kg double precision not null default 0,
  wastage_pct double precision not null default 0,
  narrative text,
  certified_at timestamptz,
  certified_by_id uuid references public.profiles (id) on delete set null,
  sent_at timestamptz,
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pmc_steel_certs enable row level security;
create policy "pmc_steel_certs: staff read" on public.pmc_steel_certs
  for select using (public.is_office_staff());
create policy "pmc_steel_certs: write capability" on public.pmc_steel_certs
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.pmc_ra_bills (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  package_id uuid references public.pmc_packages (id) on delete set null,
  ref text not null,
  bill_no text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SITE_CHECKED', 'CERTIFIED', 'SENT_TO_CLIENT', 'CLOSED')),
  gross_paise bigint not null default 0,
  advance_recovery_paise bigint not null default 0,
  retention_paise bigint not null default 0,
  other_deduction_paise bigint not null default 0,
  other_deduction_note text,
  gst_note text,
  tds_note text,
  narrative text,
  certified_at timestamptz,
  certified_by_id uuid references public.profiles (id) on delete set null,
  sent_at timestamptz,
  pdf_key text,
  pdf_status text not null default 'NONE',
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pmc_ra_bills enable row level security;
create policy "pmc_ra_bills: staff read" on public.pmc_ra_bills
  for select using (public.is_office_staff());
create policy "pmc_ra_bills: write capability" on public.pmc_ra_bills
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.pmc_ra_lines (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.pmc_ra_bills (id) on delete cascade,
  sort_order integer not null default 0,
  description text not null,
  unit text,
  previous_qty double precision not null default 0,
  this_qty double precision not null default 0,
  rate_paise bigint not null default 0,
  amount_paise bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.pmc_ra_lines enable row level security;
create policy "pmc_ra_lines: staff read" on public.pmc_ra_lines
  for select using (public.is_office_staff());
create policy "pmc_ra_lines: write capability" on public.pmc_ra_lines
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

-- Defense-in-depth: the CERTIFIED transition on steel certs / RA bills
-- additionally requires cost:approve (raBills.ts's `certify` procedure,
-- steelCerts.ts's inline check) — has_capability('write') alone isn't
-- enough, mirroring the app's own extra gate on this one status value.
create or replace function public.assert_cost_approve_for_certify()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'CERTIFIED' and (old.status is null or old.status is distinct from 'CERTIFIED') then
    if not public.has_capability('cost:approve') then
      raise exception 'Certifying requires cost:approve';
    end if;
  end if;
  return new;
end;
$$;

create trigger pmc_steel_certs_certify_guard
  before insert or update on public.pmc_steel_certs
  for each row execute function public.assert_cost_approve_for_certify();

create trigger pmc_ra_bills_certify_guard
  before insert or update on public.pmc_ra_bills
  for each row execute function public.assert_cost_approve_for_certify();
