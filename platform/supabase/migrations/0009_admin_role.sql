-- AORMS Platform — a platform-staff administrator role. Nothing in this
-- schema has ever had a notion of "AORMS staff" before this migration —
-- every RLS policy so far is scoped to "the caller is a member/owner of
-- this one studio" (is_studio_owner()). This is the foundation the admin
-- back office (licences override, payments, activity log — see
-- 0010-0012) is gated behind.
--
-- Deliberately no policy grants `is_admin` write access to `authenticated`
-- — it is settable only via direct DB access (the Supabase Management API,
-- same as every migration in this project) for now, matching the explicit
-- decision made when this was planned: no self-service "grant admin" UI in
-- this pass. To make an account an admin:
--   update public.accounts set is_admin = true where public_id = 'AORMS-U-XXXX';
-- run via the Management API, by someone who already has DB access —
-- there is no other path, intentionally.
alter table public.accounts add column is_admin boolean not null default false;

-- Same shape as the existing is_studio_owner() (0001_core.sql) — security
-- definer so it can be used inside RLS policies on other tables (payments,
-- licences, platform_activity_log) without those policies needing their
-- own copy of this check, and without recursive-RLS issues reading
-- accounts from inside another table's policy.
create function public.is_platform_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.accounts
    where id = auth.uid()
      and is_admin = true
  );
$$;
