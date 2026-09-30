-- Task libraries (Kanban + timeline generator). A library entry is a
-- formula — base hours + hours per 100 m² of the relevant area — so the same
-- "Working drawing — floor plan" entry yields a different duration per
-- project scale / per floor. See web/lib/tasks/estimate.ts.

alter table public.project_offices
  add column if not exists built_up_area_sqm double precision,
  add column if not exists floor_count smallint;

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default public.current_firm_id() references public.firms (id),
  code text not null,
  title text not null,
  bundle text not null default 'General',
  scope text not null default 'PROJECT' check (scope in ('PROJECT', 'PER_FLOOR')),
  area_basis text not null default 'BUILT_UP' check (area_basis in ('FLOOR', 'BUILT_UP', 'SITE', 'NONE')),
  base_hours numeric(6, 2) not null default 0 check (base_hours >= 0),
  hours_per_100sqm numeric(6, 2) not null default 0 check (hours_per_100sqm >= 0),
  min_hours numeric(6, 2) check (min_hours is null or min_hours >= 0),
  max_hours numeric(6, 2) check (max_hours is null or max_hours >= 0),
  work_type text,
  classification text,
  difficulty_coefficient smallint not null default 3 check (difficulty_coefficient between 1 and 5),
  sequence integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  -- FLOOR area only makes sense when the entry is expanded per floor.
  check (area_basis <> 'FLOOR' or scope = 'PER_FLOOR'),
  unique (firm_id, code)
);
create index task_templates_firm_id_idx on public.task_templates (firm_id);

alter table public.task_templates enable row level security;
create policy "task_templates: staff read" on public.task_templates
  for select using (public.is_office_staff() and firm_id = public.current_firm_id());
create policy "task_templates: staff write" on public.task_templates
  for all using (public.has_capability('write') and firm_id = public.current_firm_id())
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

alter table public.tasks
  add column if not exists template_id uuid references public.task_templates (id) on delete set null,
  add column if not exists floor_label text,
  add column if not exists area_sqm double precision;
create index if not exists tasks_template_id_idx on public.tasks (template_id);
