-- Platform audit (docs/esti/PLATFORMS-AUDIT-2026-10-01.md) item 6, second half: the
-- activity-log triggers record what changed but writes made with the service role have
-- no auth.uid(), so the actor was lost. Admin Server Actions now call this RPC after a
-- successful write (web/lib/platform/staff-audit.ts) to append a STAFF_ACTION row that
-- carries the staff account id in `actor_auth_id` (added in 0042). Service-role only.
-- APPLIED 2026-10-01 to the live `aorms-platform` project.
create or replace function public.log_staff_action(p_actor uuid, p_action text, p_target jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.platform_activity_log (event_type, detail, actor_auth_id)
  values ('STAFF_ACTION', jsonb_build_object('action', p_action) || coalesce(p_target, '{}'::jsonb), p_actor);
end;
$$;
revoke execute on function public.log_staff_action(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.log_staff_action(uuid, text, jsonb) to service_role;
