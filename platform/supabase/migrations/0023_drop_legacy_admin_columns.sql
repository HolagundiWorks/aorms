-- 2026-09-14 — Identity/Admin separation, step 5 (final step) of the
-- sequenced plan in docs/esti/SYSDEX-PORTAL-AUDIT-2026-09-14.md § 5.3.
-- `platform_staff` (migration 0022) has been the sole source of truth
-- for admin status in every app-level read path since the same-day
-- commit that introduced it — lib/platform/account.ts's
-- resolveAdminRole() no longer has a fallback to these columns at all
-- (that fallback was removed in the same change that added this
-- migration, specifically so it wouldn't be left querying a column that
-- no longer exists). Verified before writing this migration: grepped
-- the whole web/ app for every remaining reference to `is_admin`/
-- `admin_role` — the only raw reads of `accounts.is_admin`/
-- `admin_role` were in that one now-removed fallback; every other
-- reference reads the derived field on `CurrentPlatformAccount`
-- (itself populated from `platform_staff`), not the raw column.
--
-- is_platform_admin() also drops its "OR accounts.is_admin" fallback
-- here, in the same migration — platform_staff is now the only thing
-- either RLS or app code consult for staff status.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.platform_staff where id = auth.uid());
$$;

-- Found live, applying this migration: `before_account_admin_role_sync`
-- (sync_account_is_admin(), a BEFORE trigger keeping `is_admin` derived
-- from `admin_role` on every write) depends on `admin_role` and blocks
-- the column drop otherwise. It's a pure consistency helper for the
-- two-column model this migration retires — nothing to preserve, since
-- neither column it touches will exist after this statement. Confirmed
-- it's the only dependent trigger on `accounts` before dropping it (the
-- other two triggers on this table are unrelated insert-time hooks for
-- identity_licences/platform_activity_log, not admin-role).
drop trigger before_account_admin_role_sync on public.accounts;
drop function public.sync_account_is_admin();

alter table public.accounts drop column is_admin;
alter table public.accounts drop column admin_role;
