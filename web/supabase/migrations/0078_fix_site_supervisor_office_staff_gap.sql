-- Fixes a real access bug (found 2026-09-20 while answering a role-
-- hierarchy question): SITE_SUPERVISOR is a live value in the app_role
-- enum and has a ROLE_LABEL entry, but was never added to
-- is_office_staff()'s allowed-role list. Since nearly every RLS policy on
-- this schema (~90 tables) gates staff read/write through
-- is_office_staff(), a profile with role SITE_SUPERVISOR was excluded
-- from virtually all staff data access — not just UI-level rank checks.
-- has_capability() already has a correct, separate SITE_SUPERVISOR branch
-- (site_portal capability only) — this migration doesn't touch that,
-- only the broader staff-membership gate it was missing from.

create or replace function public.is_office_staff()
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select public.current_app_role() in (
    'OWNER', 'PARTNER', 'ACCOUNTANT', 'HR_MANAGER', 'SENIOR', 'ASSOCIATE', 'VIEWER', 'SITE_SUPERVISOR'
  );
$$;
