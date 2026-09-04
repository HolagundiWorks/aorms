-- Phase 8/9 (proposed) — first small batch: CPI, Knowledge Bank Portal
-- (repo sources/sections), Master Plan Library, Standards Library.
-- Per NEXTJS-MIGRATION-PHASE8-AUDIT.md: esti_repo_source/esti_repo_section
-- are LIVE code (Knowledge Bank Portal), not dead — corrects an earlier
-- (Phase 6/7) assumption. RLS pattern confirmed from each router directly:
-- CPI is bare protectedProcedure throughout (is_office_staff() only);
-- Knowledge Bank/Master Plan/Standards are read = protectedProcedure,
-- write = capabilityProcedure("write") (has_capability('write'), rank 40+).

create table public.cpi_responses (
  project_id uuid primary key references public.project_offices (id) on delete cascade,
  sections jsonb not null default '{}'::jsonb,
  status text not null default 'DRAFT',
  report jsonb,
  report_generated_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.cpi_responses enable row level security;
create policy "cpi_responses: staff read" on public.cpi_responses
  for select using (public.is_office_staff());
create policy "cpi_responses: staff write" on public.cpi_responses
  for all using (public.is_office_staff()) with check (public.is_office_staff());

create table public.repo_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  category text,
  raw_text text,
  markdown_text text,
  convert_status text,
  convert_error text,
  file_key text,
  file_name text,
  executive_summary text,
  status text not null default 'DRAFT',
  process_error text,
  processed_at timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.repo_sources enable row level security;
create policy "repo_sources: staff read" on public.repo_sources
  for select using (public.is_office_staff());
create policy "repo_sources: write capability" on public.repo_sources
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.repo_sections (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.repo_sources (id) on delete cascade,
  seq integer not null default 0,
  title text not null,
  summary text not null,
  rephrased text not null,
  created_at timestamptz not null default now()
);

alter table public.repo_sections enable row level security;
create policy "repo_sections: staff read" on public.repo_sections
  for select using (public.is_office_staff());
create policy "repo_sections: write capability" on public.repo_sections
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.master_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'PDF',
  file_key text not null,
  file_name text not null,
  file_type text,
  version integer not null default 1,
  notes text,
  uploaded_by_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.master_plans enable row level security;
create policy "master_plans: staff read" on public.master_plans
  for select using (public.is_office_staff());
create policy "master_plans: write capability" on public.master_plans
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.standards (
  id uuid primary key default gen_random_uuid(),
  discipline text not null,
  title text not null,
  notes text,
  table_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.standards enable row level security;
create policy "standards: staff read" on public.standards
  for select using (public.is_office_staff());
create policy "standards: write capability" on public.standards
  for all using (public.has_capability('write')) with check (public.has_capability('write'));

create table public.standard_files (
  id uuid primary key default gen_random_uuid(),
  standard_id uuid not null references public.standards (id) on delete cascade,
  kind text not null default 'PDF',
  file_key text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

alter table public.standard_files enable row level security;
create policy "standard_files: staff read" on public.standard_files
  for select using (public.is_office_staff());
create policy "standard_files: write capability" on public.standard_files
  for all using (public.has_capability('write')) with check (public.has_capability('write'));
