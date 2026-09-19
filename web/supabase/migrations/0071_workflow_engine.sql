-- Workflow engine (2026-09-20, phase 4 of docs/esti/
-- LIGHTWEIGHT-ARCHITECTURE-PLAN.md) — events -> condition -> action, a
-- small dispatcher over the events table (0069), not a general rules
-- engine. Deliberately narrow: a fixed 4-operator condition set
-- (equals/gt/lt/contains on one payload key) and 2 actions
-- (create_followup_task, notify) — enough to prove the mechanism on
-- real workflows, not a templating/expression language.
--
-- run_due_workflows() is a background dispatcher, not a per-session
-- call: it reads and writes across every firm's PENDING events in one
-- pass (security definer, bypassing RLS on purpose, the same way
-- reset_demo_data() does). That makes it dangerous to expose over
-- PostgREST — EXECUTE is revoked from anon/authenticated immediately
-- below, same as reset_demo_data() already is. Nothing calls it yet;
-- wiring a scheduler (pg_cron or an external Route Handler ping) is
-- flagged as a separate remaining step in the plan doc, not done here.

create table public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) default public.current_firm_id(),
  name text not null,
  trigger_event_type text not null,
  enabled boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workflow_definitions_firm_id_idx on public.workflow_definitions (firm_id);
create index workflow_definitions_trigger_idx on public.workflow_definitions (trigger_event_type) where enabled = true;

alter table public.workflow_definitions enable row level security;

create policy "workflow_definitions: staff read"
  on public.workflow_definitions for select
  using (is_office_staff() and firm_id = current_firm_id());

create policy "workflow_definitions: write capability"
  on public.workflow_definitions for all
  using (has_capability('write') and firm_id = current_firm_id())
  with check (has_capability('write') and firm_id = current_firm_id());

create table public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) default public.current_firm_id(),
  workflow_id uuid not null references public.workflow_definitions(id) on delete cascade,
  step_order integer not null,
  step_type text not null check (step_type in ('condition', 'action', 'notification', 'delay')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workflow_id, step_order)
);

create index workflow_steps_workflow_id_idx on public.workflow_steps (workflow_id);

alter table public.workflow_steps enable row level security;

create policy "workflow_steps: staff read"
  on public.workflow_steps for select
  using (is_office_staff() and firm_id = current_firm_id());

-- Independent top-level firm_id check, same discipline as the
-- memberships RLS incident's fix (CLAUDE.md § Dev / verify loop): never
-- trust the workflow_id -> workflow_definitions.firm_id join alone to
-- imply correct scoping — verify it explicitly too, so a wrong join
-- elsewhere can't silently widen access.
create policy "workflow_steps: write capability"
  on public.workflow_steps for all
  using (
    has_capability('write') and firm_id = current_firm_id()
    and exists (select 1 from public.workflow_definitions wd where wd.id = workflow_id and wd.firm_id = current_firm_id())
  )
  with check (
    has_capability('write') and firm_id = current_firm_id()
    and exists (select 1 from public.workflow_definitions wd where wd.id = workflow_id and wd.firm_id = current_firm_id())
  );

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) default public.current_firm_id(),
  recipient_id uuid references public.profiles(id),
  message text not null,
  source_workflow_id uuid references public.workflow_definitions(id),
  source_event_id uuid references public.events(id),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notification_log_firm_id_idx on public.notification_log (firm_id);
create index notification_log_recipient_idx on public.notification_log (recipient_id, read_at);

alter table public.notification_log enable row level security;

-- No client-facing write policy — every row comes from run_due_workflows().
create policy "notification_log: staff read"
  on public.notification_log for select
  using (is_office_staff() and firm_id = current_firm_id());

create function public.run_due_workflows(p_limit integer default 50)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event record;
  v_workflow record;
  v_step record;
  v_processed integer := 0;
  v_condition_passed boolean;
  v_payload_value text;
  v_config_value text;
  v_project_id uuid;
begin
  for v_event in
    select * from public.events
    where status = 'PENDING'
    order by created_at
    limit p_limit
  loop
    for v_workflow in
      select * from public.workflow_definitions
      where enabled = true
        and trigger_event_type = v_event.event_type
        and firm_id = v_event.firm_id
    loop
      v_condition_passed := true;

      for v_step in
        select * from public.workflow_steps
        where workflow_id = v_workflow.id and step_type = 'condition'
        order by step_order
      loop
        v_payload_value := v_event.payload ->> (v_step.config ->> 'payload_key');
        v_config_value := v_step.config ->> 'value';

        if v_step.config ->> 'op' = 'equals' and v_payload_value is distinct from v_config_value then
          v_condition_passed := false;
        elsif v_step.config ->> 'op' = 'contains' and (v_payload_value is null or v_payload_value not ilike '%' || v_config_value || '%') then
          v_condition_passed := false;
        elsif v_step.config ->> 'op' = 'gt' and (v_payload_value is null or v_payload_value::numeric <= v_config_value::numeric) then
          v_condition_passed := false;
        elsif v_step.config ->> 'op' = 'lt' and (v_payload_value is null or v_payload_value::numeric >= v_config_value::numeric) then
          v_condition_passed := false;
        end if;

        exit when not v_condition_passed;
      end loop;

      if v_condition_passed then
        for v_step in
          select * from public.workflow_steps
          where workflow_id = v_workflow.id and step_type = 'action'
          order by step_order
        loop
          if v_step.config ->> 'action' = 'create_followup_task' then
            v_project_id := nullif(
              coalesce(v_event.payload ->> 'project_id', case when v_event.entity_type = 'project' then v_event.entity_id::text end),
              ''
            )::uuid;

            if v_project_id is not null then
              insert into public.tasks (title, project_id, firm_id, status, priority, due_date)
              values (
                coalesce(v_step.config ->> 'title', 'Follow-up'),
                v_project_id,
                v_event.firm_id,
                'OPEN',
                coalesce(v_step.config ->> 'priority', 'MEDIUM'),
                current_date + coalesce(v_step.config ->> 'due_in_days', '1')::integer
              );
            end if;
          elsif v_step.config ->> 'action' = 'notify' then
            insert into public.notification_log (firm_id, recipient_id, message, source_workflow_id, source_event_id)
            values (
              v_event.firm_id,
              nullif(v_step.config ->> 'recipient_id', '')::uuid,
              coalesce(v_step.config ->> 'message', 'Workflow notification'),
              v_workflow.id,
              v_event.id
            );
          end if;
        end loop;
      end if;
    end loop;

    update public.events set status = 'PROCESSED', processed_at = now() where id = v_event.id;
    v_processed := v_processed + 1;
  end loop;

  return v_processed;
end;
$$;

revoke execute on function public.run_due_workflows(integer) from anon, authenticated;
