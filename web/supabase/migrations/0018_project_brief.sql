-- Project Brief — the design-stage client questionnaire (distinct from
-- Phase 10's Project OS: this is parallel infrastructure, not part of the
-- lead-to-activation chain, per NEXTJS-MIGRATION-PHASE10-AUDIT.md's own
-- scope-boundary note). Direct port of backend/src/db/schema's
-- esti_project_brief + packages/contracts/src/project-brief.ts's section
-- shapes.
--
-- RLS: bare is_office_staff() for both read and write, matching the
-- router's own plain protectedProcedure throughout (no capability gate
-- anywhere in projectBriefRouter) — same as Phase 10's `leads`.

create table public.project_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.project_offices (id) on delete cascade,
  basic_info jsonb not null default '{}'::jsonb,
  project_info jsonb not null default '{}'::jsonb,
  occupants jsonb not null default '{"household": []}'::jsonb,
  design_prefs jsonb not null default '{}'::jsonb,
  space_schedule jsonb not null default '[]'::jsonb,
  materials jsonb not null default '{}'::jsonb,
  room_details jsonb not null default '[]'::jsonb,
  assumptions text,
  approval_note text,
  approved_at date,
  compiled_brief text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_briefs enable row level security;
create policy "project_briefs: staff read" on public.project_briefs
  for select using (public.is_office_staff());
create policy "project_briefs: staff write" on public.project_briefs
  for all using (public.is_office_staff()) with check (public.is_office_staff());
