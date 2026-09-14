-- 2026-09-14 — Third instance of the same regression class as migrations
-- 0026/0027 (portal-completion audit, "detailed testing of every item"),
-- found by proactively auditing every remaining FK to `accounts(id)`
-- platform-wide rather than waiting to trip over each one individually:
-- `submitSupportTicket` (web/lib/actions/support.ts) is the PUBLIC
-- HelpDeX form (`/support`, no auth required) — if the caller happens to
-- have an active Platform session of ANY kind, its `user.id` is attached
-- as `support_tickets.account_id`. A Company Account's session id is not
-- a row in `accounts` (post migration 0024), so a signed-in Company user
-- submitting a support ticket violates `support_tickets_account_id_fkey`
-- and the whole submission fails — verified live with a genuine
-- company-only identity before writing this migration, same discipline
-- as 0026/0027.
--
-- Unlike password_reset_requests (migration 0027), NEITHER being set is a
-- legitimate case here (an anonymous, not-signed-in submitter) — so the
-- constraint below is "at most one", not "exactly one".

alter table public.support_tickets
  add column company_account_id uuid references connectdex.company_accounts (id) on delete set null;

alter table public.support_tickets
  add constraint support_tickets_at_most_one_actor check (
    (account_id is not null)::int + (company_account_id is not null)::int <= 1
  );

-- The pre-existing "submitter read own" policy only ever checked
-- account_id = auth.uid() — a Company-submitted ticket (account_id null,
-- company_account_id set) would otherwise insert fine after the fix above
-- but be invisible to its own submitter afterward. Added, not widened in
-- place, so the original Identity-submitter policy's audit trail stays
-- legible.
create policy "support_tickets: company submitter read own" on public.support_tickets
  for select using (company_account_id = auth.uid());

create or replace function public.log_support_ticket_insert()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.log_platform_activity(
    'HELPDEX_TICKET_SUBMITTED', new.account_id, null,
    jsonb_build_object('ticket_id', new.id, 'category', new.category, 'subject', new.subject),
    null, new.company_account_id
  );
  return new;
end;
$$;
