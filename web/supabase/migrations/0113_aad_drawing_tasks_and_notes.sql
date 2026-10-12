-- AAD (desktop CAD) inside the drawing: tasks tied to a drawing, and notes (annotations) shared by the studio team.
-- See docs/esti/AORMS-SUITE-SIGNIN.md. Additive only: nothing existing is changed or dropped, AQC is untouched.

-- A task can optionally belong to one drawing (any revision of it: the chain root's id). set null so deleting a drawing
-- never deletes the task.
alter table public.tasks add column if not exists drawing_id uuid references public.drawings (id) on delete set null;
create index if not exists tasks_drawing_id_idx on public.tasks (drawing_id) where drawing_id is not null;

-- Notes on a drawing. `drawing_root_id` is the drawing chain's root (drawings.root_id ?? drawings.id), so a note stays with the
-- drawing across revisions. x/y are model-space coordinates in the CAD drawing (display only; AORMS does not interpret them).
create table public.drawing_notes (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default public.current_firm_id() references public.firms (id) on delete cascade,
  project_id uuid not null references public.project_offices (id) on delete cascade,
  drawing_root_id uuid not null references public.drawings (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id),
  body text not null check (length(body) between 1 and 2000),
  x double precision not null check (x between -1e12 and 1e12),
  y double precision not null check (y between -1e12 and 1e12),
  status text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED')),
  resolved_by_id uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index drawing_notes_root_idx on public.drawing_notes (drawing_root_id, created_at);
create index drawing_notes_firm_id_idx on public.drawing_notes (firm_id);
create index drawing_notes_project_idx on public.drawing_notes (project_id);

alter table public.drawing_notes enable row level security;

create policy "drawing_notes: staff read" on public.drawing_notes for select
  using (public.is_office_staff() and firm_id = public.current_firm_id());

-- Insert: needs `write`, in the caller's own firm, as themselves, on a drawing/project of that firm.
create policy "drawing_notes: write capability insert" on public.drawing_notes for insert
  with check (
    public.has_capability('write')
    and firm_id = public.current_firm_id()
    and author_id = auth.uid()
    and exists (select 1 from public.drawings d where d.id = drawing_root_id and d.project_id = drawing_notes.project_id and d.firm_id = public.current_firm_id())
  );

-- Update: the author, or anyone with `write`. `with check` pins the row in place (same firm); the trigger below makes the
-- identity columns immutable, because RLS `with check` cannot compare old and new rows.
create policy "drawing_notes: write capability update" on public.drawing_notes for update
  using (public.has_capability('write') and firm_id = public.current_firm_id() and (author_id = auth.uid() or public.current_app_role() in ('OWNER', 'PARTNER')))
  with check (public.has_capability('write') and firm_id = public.current_firm_id());

-- No delete policy: notes are resolved, not deleted (the audit trail stays).

create function public.drawing_notes_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.id <> old.id or new.firm_id <> old.firm_id or new.project_id <> old.project_id
     or new.drawing_root_id <> old.drawing_root_id or new.author_id <> old.author_id or new.created_at <> old.created_at then
    raise exception 'not authorized: note identity cannot change';
  end if;
  new.updated_at := now();
  if new.status = 'RESOLVED' and old.status <> 'RESOLVED' then
    new.resolved_by_id := auth.uid(); new.resolved_at := now();
  elsif new.status = 'OPEN' then
    new.resolved_by_id := null; new.resolved_at := null;
  end if;
  return new;
end $$;
create trigger drawing_notes_guard before update on public.drawing_notes
  for each row execute function public.drawing_notes_guard();
