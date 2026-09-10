-- SysDeX role split (2026-09-10): before this, `accounts.is_admin` was a
-- flat boolean — any admin could reach every /admin/* page and action.
-- Support staff triaging HelpDeX tickets don't need Licences/Payments/
-- Pricing/Accounts(password reset)/ConnectDeX-review/Logs access too —
-- confirmed via explicit direction to scope support staff down to
-- HelpDeX only.
--
-- `admin_role` is the new application-layer fine-grained gate
-- (SUPER_ADMIN vs SUPPORT_STAFF), consumed by every /admin/* page and
-- Server Action — see web/lib/platform/account.ts. `is_admin` KEEPS its
-- existing meaning ("any platform staff at all") and every existing RLS
-- policy that reads it is untouched — this is a page/action-layer
-- restriction, not an RLS one. Disclosed scope boundary: a support-staff
-- account can still technically read (not write) Licence/Payment/Account
-- rows via a direct PostgREST call, same as any is_admin=true account
-- always could — narrowing the RLS "admin read" policies themselves to
-- be role-aware too is a real follow-up, not attempted here (the pages
-- and every write action, which is what actually matters, are covered).
alter table public.accounts add column admin_role text check (admin_role in ('SUPER_ADMIN', 'SUPPORT_STAFF'));

-- Backfill: any existing is_admin=true account becomes SUPER_ADMIN (none
-- exist live on this project today, but keeps the migration correct
-- anywhere one does).
update public.accounts set admin_role = 'SUPER_ADMIN' where is_admin = true and admin_role is null;

-- Keep is_admin in sync with admin_role automatically so the two columns
-- can never drift out of step with each other.
create function public.sync_account_is_admin()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  new.is_admin := (new.admin_role is not null);
  return new;
end;
$$;

create trigger before_account_admin_role_sync
  before insert or update of admin_role on public.accounts
  for each row execute function public.sync_account_is_admin();
