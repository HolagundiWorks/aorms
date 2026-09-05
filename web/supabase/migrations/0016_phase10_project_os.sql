-- Phase 10 (proposed) — Project OS: the lead → active-project acquisition
-- pipeline. Per NEXTJS-MIGRATION-PHASE10-AUDIT.md: this is a single,
-- deliberately designed system (backend/src/db/schema/project-os.ts),
-- documented in docs/esti/UNIFIED-ARCHITECTURE-V4.md — which does not exist
-- anywhere in the repo (a genuine broken doc pointer, flagged not fixed
-- here). Seven tables live in that one schema file (Slices A/B/C/D/H/J below);
-- Project Brief lives in its own schema file and is parallel infrastructure,
-- not part of the activation-gate chain (noted at that table below).
--
-- RLS: leads is bare is_office_staff() for both read and write (matches the
-- router's own plain protectedProcedure throughout, no capability split).
-- Every other table here is is_office_staff() read + has_capability('write')
-- write, matching each router's own writer = capabilityProcedure("write").
-- The plan/quota gates on leads.convert (assertQuota/assertNotFixedPlan) are
-- DROPPED per the Phase 2 tenancy decision already applied to every other
-- phase that hit this same licensing-platform boundary.
--
-- shareToken decision (audit's own open question): finished, not dropped —
-- see web/app/api/feasibility/[token]/route.ts, a public unauthenticated
-- Route Handler serving the frozen snapshot by token by querying with the
-- service-role key. That's why share_token stays NOT NULL UNIQUE here
-- exactly as the original schema had it.

-- ── Leads (Slice A) ─────────────────────────────────────────────────────

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  client_name text not null,
  phone text,
  email text,
  lead_source text not null,
  project_type text,
  site_location text,
  city text,
  assigned_to_id uuid references public.profiles (id),
  status text not null default 'NEW',
  converted_client_id uuid references public.clients (id),
  converted_project_id uuid references public.project_offices (id),
  -- COA Regulations 1989 conflict-of-interest check, confirmed at conversion
  -- (SOP-01/02/26) — a real compliance gate, enforced below via a check
  -- constraint mirroring the router's own server-side throw, not left to
  -- application code alone.
  conflict_check_done boolean not null default false,
  conflict_check_notes text,
  notes text,
  created_by_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads enable row level security;
create policy "leads: staff read" on public.leads
  for select using (public.is_office_staff());
create policy "leads: staff write" on public.leads
  for all using (public.is_office_staff()) with check (public.is_office_staff());

-- ── Project DNA (Slice B) ───────────────────────────────────────────────

create table public.project_dnas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.project_offices (id) on delete cascade,
  budget_mode text not null,
  vastu_requirement text not null,
  design_language text not null,
  design_flexibility text not null,
  decision_makers text not null,
  timeline_criticality text not null,
  material_expectation text not null,
  revision_tolerance text not null,
  custom_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_dnas enable row level security;
create policy "project_dnas: staff read" on public.project_dnas
  for select using (public.is_office_staff());
create policy "project_dnas: write capability" on public.project_dnas
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

-- ── Pre-project assessment (Slice C) ────────────────────────────────────

create table public.pre_project_assessments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.project_offices (id) on delete cascade,
  site_length double precision,
  site_width double precision,
  manual_area double precision,
  site_area_sqm double precision not null default 0,
  far_factor double precision not null default 0,
  permissible_far_area double precision not null default 0,
  front_setback double precision not null default 0,
  rear_setback double precision not null default 0,
  left_setback double precision not null default 0,
  right_setback double precision not null default 0,
  setback_buildable_area double precision not null default 0,
  ground_coverage_pct double precision not null default 0,
  coverage_area double precision not null default 0,
  actual_ground_coverage double precision not null default 0,
  possible_floors double precision not null default 0,
  super_builtup_factor double precision not null default 1.25,
  super_builtup_area double precision not null default 0,
  construction_rate_paise bigint not null default 0,
  estimated_project_cost_paise bigint not null default 0,
  breakdown jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pre_project_assessments enable row level security;
create policy "pre_project_assessments: staff read" on public.pre_project_assessments
  for select using (public.is_office_staff());
create policy "pre_project_assessments: write capability" on public.pre_project_assessments
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

-- ── Feasibility (Slice D) ───────────────────────────────────────────────

create table public.feasibility_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  assessment_id uuid references public.pre_project_assessments (id) on delete set null,
  snapshot jsonb not null default '{}'::jsonb,
  generated_at timestamptz,
  share_token text not null unique,
  pdf_key text,
  pdf_status text not null default 'NONE',
  created_by_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feasibility_reports enable row level security;
create policy "feasibility_reports: staff read" on public.feasibility_reports
  for select using (public.is_office_staff());
create policy "feasibility_reports: write capability" on public.feasibility_reports
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

-- ── Negotiation (Slice H) ───────────────────────────────────────────────

create table public.project_negotiations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  fee_proposal_id uuid references public.proposals (id) on delete set null,
  round_no integer not null default 1,
  fee_change_paise bigint not null default 0,
  scope_changes text,
  timeline_changes text,
  discount_requested_pct numeric(5, 2) not null default 0,
  architect_response text,
  client_response text,
  outcome text not null default 'ONGOING',
  conversion_probability integer not null default 0,
  created_by_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.project_negotiations enable row level security;
create policy "project_negotiations: staff read" on public.project_negotiations
  for select using (public.is_office_staff());
create policy "project_negotiations: write capability" on public.project_negotiations
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

-- ── Program / space schedule ────────────────────────────────────────────

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  version integer not null default 1,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'FROZEN')),
  assessment_id uuid references public.pre_project_assessments (id) on delete set null,
  max_built_area_sqm double precision not null default 0,
  notes text,
  frozen_at timestamptz,
  frozen_by_id uuid references public.profiles (id),
  created_by_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.programs enable row level security;
create policy "programs: staff read" on public.programs
  for select using (public.is_office_staff());
create policy "programs: write capability" on public.programs
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.program_spaces (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  name text not null,
  category text not null,
  floor_level integer not null default 0,
  unit_area_sqm double precision not null default 0,
  count integer not null default 1,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.program_spaces enable row level security;
create policy "program_spaces: staff read" on public.program_spaces
  for select using (public.is_office_staff());
create policy "program_spaces: write capability" on public.program_spaces
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

-- ── Client onboarding (Slice J) ─────────────────────────────────────────

create table public.client_onboardings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.project_offices (id) on delete cascade,
  billing_address text,
  gstin text,
  pan text,
  authorized_reps jsonb not null default '[]'::jsonb,
  communication_preference text,
  agreement_doc_key text,
  id_doc_key text,
  status text not null default 'PENDING' check (status in ('PENDING', 'COMPLETE')),
  completed_at timestamptz,
  completed_by_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_onboardings enable row level security;
create policy "client_onboardings: staff read" on public.client_onboardings
  for select using (public.is_office_staff());
create policy "client_onboardings: write capability" on public.client_onboardings
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

-- ── Backlink columns on project_offices ─────────────────────────────────
-- Added after the tables they point to now exist. Not load-bearing for the
-- activation gate itself (gatherActivationGate() in the current backend
-- queries project_dnas/pre_project_assessments by project_id directly, not
-- through these columns) — kept for schema fidelity with the original
-- esti_projectoffice table and because dna.ts/assessment.ts's own upsert
-- procedures write them as a convenience backlink.

alter table public.project_offices
  add column lead_id uuid references public.leads (id) on delete set null,
  add column dna_id uuid references public.project_dnas (id) on delete set null,
  add column assessment_id uuid references public.pre_project_assessments (id) on delete set null;
