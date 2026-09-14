-- 2026-09-14 — Identity/Admin separation, phase 1 of the sequenced plan
-- in docs/esti/SYSDEX-PORTAL-AUDIT-2026-09-14.md § 5.3 ("start the
-- identity/admin separation migration"). Additive only: creates the new
-- table, backfills the two real admin accounts into it, and repoints
-- is_platform_admin() to check BOTH the new table and the old
-- accounts.is_admin column — so every existing RLS policy that already
-- calls is_platform_admin() (payments, licences, activity log,
-- ConnectDeX admin review, AI connectors, identity_licences) keeps
-- working through the transition with zero policy-by-policy changes.
--
-- Deliberately NOT dropping accounts.is_admin/admin_role in this
-- migration — that's step 5 of the documented sequence, done only once
-- every app-level read path is confirmed working against this table
-- first (see the same session's app-code changes alongside this
-- migration: lib/platform/account.ts, lib/actions/platform.ts).
--
-- id is the same auth.users id `accounts.id` already is — a platform
-- staff member's row here doesn't replace their Identity account, it's
-- a separate fact about the same underlying login, same as how
-- studio_memberships is a separate fact from accounts today.
create table public.platform_staff (
  id uuid primary key references auth.users (id) on delete cascade,
  admin_role text not null check (admin_role in ('SUPER_ADMIN', 'SUPPORT_STAFF')),
  created_at timestamptz not null default now()
);

alter table public.platform_staff enable row level security;

-- Self-read: a staff member can see their own row (e.g. to know their
-- own role) without needing is_platform_admin() to already be true —
-- avoids a chicken-and-egg read gate on the one table that check itself
-- depends on part of. security definer functions bypass RLS internally
-- (same as every other use of is_platform_admin() elsewhere), so this
-- policy is about direct table reads, not the function's own logic.
create policy "platform_staff: self read" on public.platform_staff
  for select using (id = auth.uid());

-- Any platform staff member can see the full staff list (SysDeX's own
-- Accounts page needs this to render admin_role for every account, the
-- same way it already could read accounts.admin_role for everyone before
-- this table existed).
create policy "platform_staff: staff read all" on public.platform_staff
  for select using (public.is_platform_admin());

-- No insert/update/delete policy for the authenticated role at all —
-- writes go through the service-role client only (lib/actions/
-- platform.ts's adminSetAccountRole), matching the exact same
-- "grant/revoke admin is an app-code-gated, service-role write, not an
-- RLS-authorized one" shape accounts.is_admin already had (migration
-- 0009's own header comment: "settable only via direct DB access" then,
-- "via app code + service-role" now).

insert into public.platform_staff (id, admin_role)
select id, admin_role from public.accounts where is_admin = true and admin_role is not null;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.platform_staff where id = auth.uid())
      or exists (select 1 from public.accounts where id = auth.uid() and is_admin = true);
$$;
