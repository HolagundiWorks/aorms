-- Phase 8 (proposed) — HR/Payroll. Port of backend/src/db/schema/hr-work.ts,
-- EXCLUDING two tables deliberately:
--   * `tasks` (esti_task) — already exists from Phase 2, FK'd straight to
--     `profiles`. This file's `tasks` duplicate FKs assignee/reviewer to
--     `teamMembers` instead — that's exactly the "teamMembers vs profiles"
--     conflict the Phase 8 audit reopened. Reasonable call made here: KEEP
--     Phase 2's live, already-UI-verified profiles-based design; don't
--     retrofit tasks onto team_members. The tension is real and stays
--     documented (ROADMAP-CLOUD.md), not silently resolved by this
--     migration either way.
--   * `timesheets` (esti_timesheet) — the current schema's own comment
--     marks it `@deprecated Removed from product — use attendance register
--     instead`. Not porting dead-per-current-system tables.
--
-- team_members now existing UNBLOCKS Phase 5's attendance table (its own
-- migration explicitly deferred this for exactly this reason) — added here.
--
-- RLS confirmed per-table from the actual routers (modules/team/router.ts,
-- hr.ts, hrProfile.ts; modules/attendance/router.ts; modules/reward/router.ts):
--   team_members/teams        -> read staff, write OWNER only (ownerProcedure)
--   team_memberships/assignments/leaves/attendance -> read+write staff (bare protectedProcedure)
--   payslips                  -> read staff (byId is bare protectedProcedure),
--                                 write hr:manage
--   reward_points              -> read staff, write OWNER only (grant is ownerProcedure)
--   hr_profiles/hr_documents  -> hr:manage OR the member's own row (get is
--                                 "L4 (hr:manage) or own profile" per the
--                                 router's own comment); write hr:manage only
--   job_applications          -> hr:manage for everything

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  employment_type text not null,
  email text,
  phone text,
  monthly_salary_paise bigint not null default 0,
  date_joined date,
  active boolean not null default true,
  user_id uuid references public.profiles (id),
  backup_contact_name text,
  backup_contact_phone text,
  wellbeing_opt_in boolean not null default false,
  staff_level text,
  job_title text,
  created_at timestamptz not null default now()
);

alter table public.team_members enable row level security;
create policy "team_members: staff read" on public.team_members
  for select using (public.is_office_staff());
create policy "team_members: owner write" on public.team_members
  for all using (public.current_app_role() = 'OWNER') with check (public.current_app_role() = 'OWNER');

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.teams enable row level security;
create policy "teams: staff read" on public.teams
  for select using (public.is_office_staff());
create policy "teams: owner write" on public.teams
  for all using (public.current_app_role() = 'OWNER') with check (public.current_app_role() = 'OWNER');

create table public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  team_member_id uuid not null references public.team_members (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, team_member_id)
);

alter table public.team_memberships enable row level security;
create policy "team_memberships: staff read" on public.team_memberships
  for select using (public.is_office_staff());
create policy "team_memberships: staff write" on public.team_memberships
  for all using (public.is_office_staff()) with check (public.is_office_staff());

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id),
  team_member_id uuid not null references public.team_members (id),
  role text not null,
  created_at timestamptz not null default now()
);

alter table public.assignments enable row level security;
create policy "assignments: staff read" on public.assignments
  for select using (public.is_office_staff());
create policy "assignments: staff write" on public.assignments
  for all using (public.is_office_staff()) with check (public.is_office_staff());

create table public.leaves (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members (id),
  type text not null,
  from_date date not null,
  to_date date not null,
  days double precision not null default 0,
  reason text,
  status text not null default 'REQUESTED',
  created_at timestamptz not null default now()
);

alter table public.leaves enable row level security;
create policy "leaves: staff read" on public.leaves
  for select using (public.is_office_staff());
create policy "leaves: staff write" on public.leaves
  for all using (public.is_office_staff()) with check (public.is_office_staff());

create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members (id),
  month text not null,
  gross_paise bigint not null default 0,
  deductions_paise bigint not null default 0,
  net_paise bigint not null default 0,
  paid boolean not null default false,
  paid_date date,
  notes text,
  pdf_key text,
  pdf_status text not null default 'NONE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_member_id, month)
);

alter table public.payslips enable row level security;
create policy "payslips: staff read" on public.payslips
  for select using (public.is_office_staff());
create policy "payslips: hr:manage write" on public.payslips
  for all using (public.has_capability('hr:manage')) with check (public.has_capability('hr:manage'));

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members (id) on delete cascade,
  attendance_date date not null,
  status text not null default 'PRESENT',
  notes text,
  marked_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_member_id, attendance_date)
);

alter table public.attendance enable row level security;
create policy "attendance: staff read" on public.attendance
  for select using (public.is_office_staff());
create policy "attendance: staff write" on public.attendance
  for all using (public.is_office_staff()) with check (public.is_office_staff());

create table public.reward_points (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members (id) on delete cascade,
  points integer not null,
  reason text not null,
  award_type text,
  reference_id uuid,
  created_by_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.reward_points enable row level security;
create policy "reward_points: staff read" on public.reward_points
  for select using (public.is_office_staff());
create policy "reward_points: owner write" on public.reward_points
  for all using (public.current_app_role() = 'OWNER') with check (public.current_app_role() = 'OWNER');

create table public.hr_profiles (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.team_members (id) on delete cascade,
  date_of_birth date,
  gender text,
  blood_group text,
  nationality text not null default 'Indian',
  aadhaar_number text,
  pan_number text,
  passport_number text,
  passport_expiry date,
  passport_country text default 'India',
  voter_id text,
  driving_licence text,
  permanent_address jsonb,
  current_address jsonb,
  same_address boolean not null default false,
  personal_email text,
  personal_phone text,
  emergency_contact_name text,
  emergency_contact_relation text,
  emergency_contact_phone text,
  bank_account_number text,
  bank_ifsc text,
  bank_name text,
  bank_branch text,
  pf_uan text,
  esic_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hr_profiles enable row level security;
create policy "hr_profiles: hr:manage or own" on public.hr_profiles
  for select using (
    public.has_capability('hr:manage')
    or exists (
      select 1 from public.team_members tm
      where tm.id = hr_profiles.member_id and tm.user_id = auth.uid()
    )
  );
create policy "hr_profiles: hr:manage write" on public.hr_profiles
  for all using (public.has_capability('hr:manage')) with check (public.has_capability('hr:manage'));

create table public.hr_documents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.team_members (id) on delete cascade,
  document_type text not null,
  document_name text not null,
  s3_key text,
  file_name text,
  file_size integer,
  mime_type text,
  issue_date date,
  expiry_date date,
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.hr_documents enable row level security;
create policy "hr_documents: hr:manage or own" on public.hr_documents
  for select using (
    public.has_capability('hr:manage')
    or exists (
      select 1 from public.team_members tm
      where tm.id = hr_documents.member_id and tm.user_id = auth.uid()
    )
  );
create policy "hr_documents: hr:manage write" on public.hr_documents
  for all using (public.has_capability('hr:manage')) with check (public.has_capability('hr:manage'));

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  applied_role text not null,
  experience_years numeric(4, 1),
  current_employer text,
  current_salary_paise bigint,
  expected_salary_paise bigint,
  resume_key text,
  portfolio_url text,
  status text not null default 'APPLIED',
  notes text,
  handled_by uuid references public.profiles (id),
  member_id uuid references public.team_members (id),
  applied_at timestamptz not null default now(),
  status_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_applications enable row level security;
create policy "job_applications: hr:manage" on public.job_applications
  for all using (public.has_capability('hr:manage')) with check (public.has_capability('hr:manage'));
