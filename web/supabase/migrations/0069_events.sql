-- Events system (2026-09-20) — first step of the lightweight event/
-- workflow architecture: a plain table, not Kafka/Redis/EventBridge, per
-- the explicit direction to keep the cloud footprint small at this scale
-- (see docs/esti/EVENTS-AND-CONNECTOR-MODES.md for the full design).
-- No workflow engine consumes these yet — this migration only proves the
-- emission side works, end to end, on real writes. Consuming/dispatching
-- (event -> condition -> action) is a later, separate migration.
--
-- Two ways events get written, both bypassing normal client RLS by
-- design (a regular staff member never inserts an event directly):
--   1. Triggers on business tables (tasks/drawings/project_offices below)
--      — read firm_id straight off NEW, so they fire correctly whether
--      the write came from a live session or a service-role job (e.g.
--      the nightly demo-data reset), matching next_ref()'s NEW-firm_id
--      handling.
--   2. emit_event() — a security-definer RPC for future Server Actions
--      that need to emit an event outside a table write (workflow
--      completions, Esti tool calls). Not called from application code
--      yet; built now as the sanctioned surface, same as switch_active_
--      firm()/next_ref() were built ahead of every caller that uses them
--      today.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) default public.current_firm_id(),
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSED', 'ERROR')),
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index events_firm_id_idx on public.events (firm_id);
create index events_pending_idx on public.events (created_at) where status = 'PENDING';
create index events_entity_idx on public.events (entity_type, entity_id);

alter table public.events enable row level security;

-- No client-facing INSERT policy on purpose — every row is written by a
-- security-definer trigger function or emit_event(), never a raw
-- `.insert()` from the app, so there's nothing for a write policy to gate.
create policy "events: staff read"
  on public.events for select
  using (is_office_staff() and firm_id = current_firm_id());

create function public.emit_event(
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_firm_id uuid := public.current_firm_id();
  v_id uuid;
begin
  if v_firm_id is null then
    raise exception 'emit_event(): no resolvable firm for the current session';
  end if;

  insert into public.events (firm_id, event_type, entity_type, entity_id, payload)
  values (v_firm_id, p_event_type, p_entity_type, p_entity_id, p_payload)
  returning id into v_id;

  return v_id;
end;
$$;

-- Not called from anywhere yet — the future event-consumer/workflow
-- engine's job. Built now so that piece isn't also designing its own
-- write-side API when it lands.
create function public.mark_event_processed(
  p_event_id uuid,
  p_status text default 'PROCESSED',
  p_error text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_office_staff() then
    raise exception 'not authorized';
  end if;
  if p_status not in ('PROCESSED', 'ERROR') then
    raise exception 'invalid status %', p_status;
  end if;

  update public.events
  set status = p_status, error_message = p_error, processed_at = now()
  where id = p_event_id and firm_id = public.current_firm_id();
end;
$$;

-- ---- Trigger wiring: proves the mechanism on 4 real events ----

create function public.trg_emit_task_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.events (firm_id, event_type, entity_type, entity_id, payload)
  values (new.firm_id, 'task.created', 'task', new.id, jsonb_build_object('title', new.title, 'project_id', new.project_id, 'priority', new.priority));
  return new;
end;
$$;

create trigger tasks_emit_created
  after insert on public.tasks
  for each row execute function public.trg_emit_task_created();

create function public.trg_emit_task_completed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'DONE' and old.status is distinct from 'DONE' then
    insert into public.events (firm_id, event_type, entity_type, entity_id, payload)
    values (new.firm_id, 'task.completed', 'task', new.id, jsonb_build_object('title', new.title, 'project_id', new.project_id));
  end if;
  return new;
end;
$$;

create trigger tasks_emit_completed
  after update on public.tasks
  for each row execute function public.trg_emit_task_completed();

create function public.trg_emit_drawing_uploaded() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.events (firm_id, event_type, entity_type, entity_id, payload)
  values (new.firm_id, 'document.uploaded', 'drawing', new.id, jsonb_build_object('title', new.title, 'file_name', new.file_name, 'project_id', new.project_id));
  return new;
end;
$$;

create trigger drawings_emit_uploaded
  after insert on public.drawings
  for each row execute function public.trg_emit_drawing_uploaded();

create function public.trg_emit_project_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.events (firm_id, event_type, entity_type, entity_id, payload)
  values (new.firm_id, 'project.created', 'project', new.id, jsonb_build_object('title', new.title, 'ref', new.ref));
  return new;
end;
$$;

create trigger project_offices_emit_created
  after insert on public.project_offices
  for each row execute function public.trg_emit_project_created();
