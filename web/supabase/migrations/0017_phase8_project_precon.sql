-- Phase 8 (proposed) — Project Precon: Studio pre-construction R&O (risks,
-- opportunities, design phase gates). Per NEXTJS-MIGRATION-PHASE10-AUDIT.md's
-- own scope-boundary note: this table set was offered as part of the
-- Phase 10 "Project OS" grouping but structurally belongs with Phase 8's
-- Delivery work instead (it operates on an already-active project's
-- pre-construction phase, not the lead-to-activation funnel) — landed here,
-- numbered as a Phase 8 migration, once Phase 8's Delivery UI already existed.
--
-- RLS: is_office_staff() read + has_capability('write') write throughout,
-- matching the router's own capabilityProcedure("write") gate on every
-- mutation (listByProject is the only bare protectedProcedure).

create table public.project_risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  title text not null,
  likelihood integer not null default 3,
  impact integer not null default 3,
  owner text,
  response text not null default 'REDUCE',
  mitigation text,
  residual_likelihood integer,
  residual_impact integer,
  status text not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_risks enable row level security;
create policy "project_risks: staff read" on public.project_risks
  for select using (public.is_office_staff());
create policy "project_risks: write capability" on public.project_risks
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.project_opportunities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  linked_risk_id uuid references public.project_risks (id) on delete set null,
  title text not null,
  source text not null default 'WORKSHOP',
  area text not null default 'DESIGN',
  probability integer not null default 3,
  impact integer not null default 3,
  response text not null default 'ENHANCE',
  owner text,
  action_plan text,
  due_date date,
  value_note text,
  estimated_value_paise bigint,
  status text not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_opportunities enable row level security;
create policy "project_opportunities: staff read" on public.project_opportunities
  for select using (public.is_office_staff());
create policy "project_opportunities: write capability" on public.project_opportunities
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.project_phase_gates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  phase_id uuid references public.phases (id) on delete set null,
  gate_key text not null,
  checklist jsonb not null default '{}'::jsonb,
  decision text not null default 'PENDING',
  notes text,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_by_name text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, gate_key)
);

alter table public.project_phase_gates enable row level security;
create policy "project_phase_gates: staff read" on public.project_phase_gates
  for select using (public.is_office_staff());
create policy "project_phase_gates: write capability" on public.project_phase_gates
  for all using (public.has_capability('write')) with check (public.has_capability('write'));
