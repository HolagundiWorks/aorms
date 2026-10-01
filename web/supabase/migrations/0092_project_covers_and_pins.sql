-- Project cover images + per-user pins (Projects page card view).
--
-- cover_image_key: object key in the private `project-covers` bucket
-- (`<project_id>/<sha256>.<ext>`). Private bucket, no direct client access:
-- uploads go through a Server Action (service role, after an authorization
-- check) and reads go through short-lived signed URLs minted server-side only
-- after an RLS-scoped row read already succeeded — same pattern as
-- esti-receipts / esti-documents.
alter table public.project_offices add column if not exists cover_image_key text;

-- Pins are personal (each person's own "keep these on top"), not firm-wide.
create table if not exists public.project_pins (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null references public.project_offices (id) on delete cascade,
  firm_id uuid not null default public.current_firm_id() references public.firms (id),
  created_at timestamptz not null default now(),
  primary key (profile_id, project_id)
);
create index if not exists project_pins_project_id_idx on public.project_pins (project_id);

alter table public.project_pins enable row level security;

-- Own rows only, in the caller's active firm. Pinning is a preference, not a
-- write to the project, so it needs no `write` capability — any staff member
-- (even read-only) may pin for themselves.
create policy "project_pins: own read" on public.project_pins
  for select using (profile_id = auth.uid() and firm_id = public.current_firm_id());
create policy "project_pins: own insert" on public.project_pins
  for insert with check (
    profile_id = auth.uid() and firm_id = public.current_firm_id() and public.is_office_staff()
    -- the project must be visible to the caller (RLS-scoped subquery): no pinning
    -- another firm's project id, and no probing which ids exist via the FK error.
    and exists (select 1 from public.project_offices p where p.id = project_id)
  );
create policy "project_pins: own delete" on public.project_pins
  for delete using (profile_id = auth.uid() and firm_id = public.current_firm_id());

insert into storage.buckets (id, name, public) values ('project-covers', 'project-covers', false)
on conflict (id) do nothing;
