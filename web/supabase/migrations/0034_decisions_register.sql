-- CRIF decision register — port of backend/src/modules/decision/router.ts +
-- backend/src/db/schema/project.ts's `esti_decision` table (packages/
-- contracts/src/schemas.ts's `DecisionState`/`DECISION_TRANSITIONS`/
-- `RevisionCategory`). This repo's own module map calls out "phases, tasks,
-- drawings, decisions, ..." on ProjectDetail.tsx, and CLAUDE.md's own
-- "Domain conventions" section documents the revisionCategory/revisionSource
-- vocabulary — neither had a home in web/ until now.
--
-- Legacy `approval`/`status` text columns the old table kept "for backwards
-- compat" are dropped here — web/ has no pre-`state`-machine history to stay
-- compatible with, so `state` is the only status column, matching this
-- repo's own preference for one source of truth over parallel legacy fields.
--
-- State machine (DECISION_TRANSITIONS): DRAFT -> OPEN -> CLIENT_REVIEW ->
-- ACCEPTED/REJECTED -> LOCKED (-> OPEN to reopen a locked decision). Staff
-- can drive every transition through plain RLS-gated UPDATEs (same as
-- `approvals: staff write`) since is_office_staff() covers the whole table;
-- only the CLIENT_REVIEW -> ACCEPTED/REJECTED leg needs a security-definer
-- RPC (`respond_to_decision`, same shape as migration 0032's
-- respond_to_approval) because that leg is the one a CLIENT caller can
-- reach, and a bare CLIENT-scoped UPDATE policy would be the same
-- privilege-escalation class of bug this repo's memberships incident
-- already taught it to watch for.

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project_offices (id) on delete cascade,
  title text not null,
  rationale text not null,
  state text not null default 'DRAFT'
    check (state in ('DRAFT', 'OPEN', 'CLIENT_REVIEW', 'ACCEPTED', 'REJECTED', 'LOCKED')),
  revision_category text check (revision_category in ('MINOR', 'MAJOR', 'CRITICAL')),
  revision_source text check (revision_source in ('CLIENT_DRIVEN', 'INTERNAL_ERROR', 'TECHNICAL_QUERY', 'SCOPE_CHANGE')),
  impact text not null default 'LOW' check (impact in ('LOW', 'MEDIUM', 'HIGH')),
  owner_name text,
  review_deadline date,
  locked_at timestamptz,
  created_by_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.decisions enable row level security;

create policy "decisions: staff read" on public.decisions
  for select using (public.is_office_staff());
create policy "decisions: staff write" on public.decisions
  for all using (public.is_office_staff()) with check (public.is_office_staff());

-- Client portal: only decisions actually sent for review or resolved —
-- DRAFT/OPEN stay internal, matching "approvals: own portal read"'s own
-- `status != 'DRAFT'` precedent (here: anything past OPEN).
create policy "decisions: own portal read" on public.decisions
  for select using (
    public.current_app_role() = 'CLIENT'
    and state in ('CLIENT_REVIEW', 'ACCEPTED', 'REJECTED', 'LOCKED')
    and project_id in (
      select po.id from public.project_offices po
      where po.client_id = (select client_id from public.profiles where id = auth.uid())
    )
  );

-- respond_to_decision — the client-writable half of the CLIENT_REVIEW leg,
-- same shape and reasoning as migration 0032's respond_to_approval: the
-- only door, re-verifies CLIENT role + project ownership, only accepts a
-- real terminal response, only from CLIENT_REVIEW, and only ever touches
-- state/updated_at.
create or replace function public.respond_to_decision(p_decision_id uuid, p_response text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_state text;
  v_project_id uuid;
  v_owner_client_id uuid;
  v_caller_client_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if public.current_app_role() <> 'CLIENT' then
    raise exception 'Only a client can respond to a decision';
  end if;
  if p_response not in ('ACCEPTED', 'REJECTED') then
    raise exception 'Invalid response — must be ACCEPTED or REJECTED';
  end if;

  select d.state, d.project_id, po.client_id
  into v_current_state, v_project_id, v_owner_client_id
  from public.decisions d
  join public.project_offices po on po.id = d.project_id
  where d.id = p_decision_id;

  if v_project_id is null then
    raise exception 'Decision not found';
  end if;

  select client_id into v_caller_client_id from public.profiles where id = auth.uid();
  if v_caller_client_id is null or v_owner_client_id is distinct from v_caller_client_id then
    raise exception 'Not your decision to respond to';
  end if;

  if v_current_state is distinct from 'CLIENT_REVIEW' then
    raise exception 'This item is % and cannot be responded to.', lower(coalesce(v_current_state, 'unknown'));
  end if;

  update public.decisions
  set state = p_response, updated_at = now()
  where id = p_decision_id;

  insert into public.audit_log (entity, entity_id, action, actor_id, before, after)
  values (
    'decision', p_decision_id, 'CLIENT_RESPOND', auth.uid(),
    jsonb_build_object('state', v_current_state),
    jsonb_build_object('state', p_response)
  );
end;
$$;

comment on function public.respond_to_decision(uuid, text) is
  'Client Portal write path for the decisions/CRIF register — same reasoning as respond_to_approval (migration 0032). Only accepts CLIENT_REVIEW -> ACCEPTED/REJECTED, only for the caller''s own project, never touches any other column.';

grant execute on function public.respond_to_decision(uuid, text) to authenticated;
