-- Phase 9 (proposed) — closing out the Library scope: Compliance (the last
-- of the four sub-domains; Master Plans/Standards landed in 0011) + Lessons
-- Learned. Completes Phase 9's "small, structurally uniform, no surprises"
-- Library coverage per NEXTJS-MIGRATION-PHASE9-AUDIT.md.
--
-- RLS: compliance read = is_office_staff(), write = has_capability('write')
-- (modules/compliance/router.ts, same pattern as Master Plans/Standards).
-- lessons_learned has NO capability gate at all — confirmed bare
-- protectedProcedure throughout, same permissiveness the Phase 3 audit
-- already flagged for Letters/Contracts; don't invent a gate that doesn't
-- exist in the current system.

create table public.compliance_far (
  id uuid primary key default gen_random_uuid(),
  zone text not null,
  plot_type text,
  plot_area_min_sqm double precision,
  plot_area_max_sqm double precision,
  far double precision not null default 0,
  ground_coverage_pct integer,
  max_height_m double precision,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.compliance_far enable row level security;
create policy "compliance_far: staff read" on public.compliance_far for select using (public.is_office_staff());
create policy "compliance_far: write capability" on public.compliance_far for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.compliance_setback (
  id uuid primary key default gen_random_uuid(),
  zone text not null,
  plot_type text,
  frontage_min_m double precision,
  frontage_max_m double precision,
  front_m double precision,
  rear_m double precision,
  side1_m double precision,
  side2_m double precision,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.compliance_setback enable row level security;
create policy "compliance_setback: staff read" on public.compliance_setback for select using (public.is_office_staff());
create policy "compliance_setback: write capability" on public.compliance_setback for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.compliance_nbc (
  id uuid primary key default gen_random_uuid(),
  clause text not null,
  title text not null,
  requirement text,
  applicability text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.compliance_nbc enable row level security;
create policy "compliance_nbc: staff read" on public.compliance_nbc for select using (public.is_office_staff());
create policy "compliance_nbc: write capability" on public.compliance_nbc for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.compliance_fire (
  id uuid primary key default gen_random_uuid(),
  building_type text not null,
  height_band_m text,
  requirement text,
  refuge_area text,
  staircase_width_m double precision,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.compliance_fire enable row level security;
create policy "compliance_fire: staff read" on public.compliance_fire for select using (public.is_office_staff());
create policy "compliance_fire: write capability" on public.compliance_fire for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.compliance_regulation (
  id uuid primary key default gen_random_uuid(),
  authority text not null,
  ref_no text,
  title text not null,
  summary text,
  link text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.compliance_regulation enable row level security;
create policy "compliance_regulation: staff read" on public.compliance_regulation for select using (public.is_office_staff());
create policy "compliance_regulation: write capability" on public.compliance_regulation for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.compliance_docs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  file_name text not null,
  file_key text not null,
  file_type text not null default 'PDF',
  notes text,
  uploaded_by_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.compliance_docs enable row level security;
create policy "compliance_docs: staff read" on public.compliance_docs for select using (public.is_office_staff());
create policy "compliance_docs: write capability" on public.compliance_docs for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.lessons_learned (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id),
  title text not null,
  category text not null default 'OTHER',
  body text not null,
  recommendations text not null default '',
  tags text,
  status text not null default 'DRAFT',
  author_id uuid references public.profiles (id),
  author_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.lessons_learned enable row level security;
create policy "lessons_learned: staff read" on public.lessons_learned
  for select using (public.is_office_staff());
create policy "lessons_learned: staff write" on public.lessons_learned
  for all using (public.is_office_staff()) with check (public.is_office_staff());
