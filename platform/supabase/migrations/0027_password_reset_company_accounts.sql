-- 2026-09-14 — Same class of regression as migration 0026, found while
-- building the SysDeX admin UI's new Company Accounts section (portal-
-- completion audit, "detailed testing of every item"): `password_reset_
-- requests.account_id` has a hard FK to `accounts(id)`, but SysDeX's
-- admin-triggered password reset (`adminTriggerPasswordReset`, web/lib/
-- actions/admin-accounts.ts) is about to be offered for Company Accounts
-- too — which have no `accounts` row at all post-migration-0024. Fixed
-- proactively, before shipping the UI that would have hit it, using the
-- exact same established pattern as 0026: `account_id` becomes nullable,
-- a sibling `company_account_id` column is added, and exactly one of the
-- two must be set (a check constraint, not silent "both null is fine").

alter table public.password_reset_requests
  alter column account_id drop not null;

alter table public.password_reset_requests
  add column company_account_id uuid references connectdex.company_accounts (id) on delete cascade;

alter table public.password_reset_requests
  add constraint password_reset_requests_exactly_one_actor check (
    (account_id is not null)::int + (company_account_id is not null)::int = 1
  );

create or replace function public.log_password_reset_insert()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.log_platform_activity(
    'PLATFORM_PASSWORD_RESET_TRIGGERED', new.account_id, null,
    jsonb_build_object('triggered_by_id', new.triggered_by_id, 'email_sent_to', new.email_sent_to),
    null, new.company_account_id
  );
  return new;
end;
$$;
