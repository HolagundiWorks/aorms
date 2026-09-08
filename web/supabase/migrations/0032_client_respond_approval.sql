-- respondApproval — the client-writable half of the Client Portal's own
-- flagged gap ("client writes that would mutate approvals/portal_
-- submissions status columns directly — needs a business-rule-guarded
-- RPC, not a broad RLS update policy"), deferred when migration 0020
-- shipped the read-only side (`approvals: own portal read`, status !=
-- DRAFT). Only the write half lands here — portal_submissions' own
-- writes (change requests etc.) were already a normal insert-only path
-- from day one, nothing to add there.
--
-- A single-purpose security-definer function, same shape as migration
-- 0031's update_my_full_name and for the same reason: `approvals` RLS is
-- currently staff-only for UPDATE ("approvals: staff write") — a bare
-- CLIENT-scoped UPDATE policy would let a client rewrite ANY column on
-- their own project's approval rows (title, entity_type, recipient,
-- status to something not actually a valid client response, response_date
-- backdated, etc.), the same class of gap this repo's own memberships
-- privilege-escalation fix already taught it to watch for. This function
-- is the only door: it re-verifies CLIENT role + ownership of the
-- specific approval's project (via profiles.client_id), only accepts a
-- real terminal client response, only lets a SENT approval be responded
-- to (never DRAFT, and never twice — an already-APPROVED/REJECTED/
-- REVISIONS/SUPERSEDED row is immutable through this path), and only
-- ever touches status/response_date/remarks/updated_at.
--
-- Also writes its own audit_log row directly (security definer, so it
-- bypasses "audit_log: staff insert" cleanly) — the normal write_audit()
-- RPC is `security invoker` and a CLIENT caller has no audit_log INSERT
-- policy of their own, so calling it from a client Server Action would
-- fail RLS.

create or replace function public.respond_to_approval(p_approval_id uuid, p_status text, p_remarks text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
  v_project_id uuid;
  v_owner_client_id uuid;
  v_caller_client_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if public.current_app_role() <> 'CLIENT' then
    raise exception 'Only a client can respond to an approval';
  end if;
  if p_status not in ('APPROVED', 'REVISIONS', 'REJECTED') then
    raise exception 'Invalid response — must be APPROVED, REVISIONS, or REJECTED';
  end if;
  if p_remarks is not null and length(p_remarks) > 4000 then
    raise exception 'Remarks are too long (4000 characters max)';
  end if;

  select a.status, a.project_id, po.client_id
  into v_current_status, v_project_id, v_owner_client_id
  from public.approvals a
  join public.project_offices po on po.id = a.project_id
  where a.id = p_approval_id;

  if v_project_id is null then
    raise exception 'Approval not found';
  end if;

  select client_id into v_caller_client_id from public.profiles where id = auth.uid();
  if v_caller_client_id is null or v_owner_client_id is distinct from v_caller_client_id then
    raise exception 'Not your approval to respond to';
  end if;

  if v_current_status is distinct from 'SENT' then
    raise exception 'This item is % and cannot be responded to.', lower(coalesce(v_current_status, 'unknown'));
  end if;

  update public.approvals
  set status = p_status,
      response_date = current_date,
      remarks = coalesce(p_remarks, remarks),
      updated_at = now()
  where id = p_approval_id;

  insert into public.audit_log (entity, entity_id, action, actor_id, before, after)
  values (
    'approval', p_approval_id, 'CLIENT_RESPOND', auth.uid(),
    jsonb_build_object('status', v_current_status),
    jsonb_build_object('status', p_status, 'remarks', p_remarks)
  );
end;
$$;

comment on function public.respond_to_approval(uuid, text, text) is
  'Client Portal write path for approvals — the one this repo flagged as needing a business-rule-guarded RPC rather than a broad RLS update policy when the Client Portal first shipped (2026-09-06). Only accepts SENT -> APPROVED/REVISIONS/REJECTED, only for the caller''s own project, never touches any other column.';

grant execute on function public.respond_to_approval(uuid, text, text) to authenticated;
