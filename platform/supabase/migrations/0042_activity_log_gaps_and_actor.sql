-- Platform audit item 6 (docs/esti/PLATFORMS-AUDIT-2026-10-01.md): the activity log
-- (0012, trigger-based by design) had no events for company tier changes, account
-- level changes, plan pricing edits or platform_staff changes, and recorded no actor.
--
-- 1. `actor_auth_id` — auth.uid() at the time of the write. Filled for writes made
--    through a user session (RLS-path writes); NULL for service-role writes (the
--    admin Server Actions), which carry no end-user JWT. Closing that last gap
--    needs the actions to pass the verified staff id explicitly — tracked in ROADMAP.
-- 2. Triggers: COMPANY_TIER_CHANGED, ACCOUNT_LEVEL_CHANGED, PRICING_CHANGED,
--    STAFF_CHANGED. Trigger functions are not callable as RPC (default privileges,
--    0041, plus explicit revoke below).
alter table public.platform_activity_log add column if not exists actor_auth_id uuid;

create or replace function public.log_platform_activity(
  p_event_type text,
  p_account_id uuid,
  p_studio_id uuid,
  p_detail jsonb,
  p_company_id uuid default null,
  p_company_account_id uuid default null
)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.platform_activity_log (event_type, account_id, studio_id, detail, company_id, company_account_id, actor_auth_id)
  values (p_event_type, p_account_id, p_studio_id, p_detail, p_company_id, p_company_account_id, auth.uid());
end;
$$;

create or replace function connectdex.log_company_tier_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tier is distinct from old.tier then
    perform public.log_platform_activity('COMPANY_TIER_CHANGED', null, null,
      jsonb_build_object('company', new.name, 'from', old.tier, 'to', new.tier), new.id, null);
  end if;
  return new;
end; $$;
create trigger after_company_tier_change_log after update of tier on connectdex.companies
  for each row execute function connectdex.log_company_tier_change();

create or replace function public.log_account_level_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.level is distinct from old.level then
    perform public.log_platform_activity('ACCOUNT_LEVEL_CHANGED', new.id, null,
      jsonb_build_object('public_id', new.public_id, 'from', old.level, 'to', new.level));
  end if;
  return new;
end; $$;
create trigger after_account_level_change_log after update of level on public.accounts
  for each row execute function public.log_account_level_change();

create or replace function public.log_pricing_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.log_platform_activity('PRICING_CHANGED', null, null,
    jsonb_build_object('plan', new.plan,
      'base_price_paise', jsonb_build_object('from', old.base_price_paise, 'to', new.base_price_paise),
      'per_seat_monthly_paise', jsonb_build_object('from', old.price_per_seat_monthly_paise, 'to', new.price_per_seat_monthly_paise)));
  return new;
end; $$;
create trigger after_plan_pricing_update_log after update on public.plan_pricing
  for each row when (old.base_price_paise is distinct from new.base_price_paise
    or old.price_per_seat_monthly_paise is distinct from new.price_per_seat_monthly_paise)
  execute function public.log_pricing_change();

create or replace function public.log_staff_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old text;
  v_new text;
  v_id uuid;
begin
  -- OLD is unassigned on INSERT and NEW on DELETE, so read each only on its own op.
  if tg_op in ('UPDATE', 'DELETE') then v_old := old.admin_role; v_id := old.id; end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := new.admin_role; v_id := new.id; end if;
  perform public.log_platform_activity('STAFF_CHANGED', null, null,
    jsonb_build_object('op', tg_op, 'staff_id', v_id, 'role', jsonb_build_object('from', v_old, 'to', v_new)));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
create trigger after_platform_staff_change_log after insert or update or delete on public.platform_staff
  for each row execute function public.log_staff_change();

revoke execute on function connectdex.log_company_tier_change() from public, anon, authenticated;
revoke execute on function public.log_account_level_change() from public, anon, authenticated;
revoke execute on function public.log_pricing_change() from public, anon, authenticated;
revoke execute on function public.log_staff_change() from public, anon, authenticated;
