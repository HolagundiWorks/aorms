-- SysDeX admin operations (2026-09-10): admin-triggered password reset,
-- and HelpDeX — the platform's support-ticket area. See
-- docs/esti/AORMS-PLATFORM-ARCHITECTURE.md § Three portals for the
-- naming/audience rationale (Identity Portal / ConnectDeX Portal /
-- SysDeX, HelpDeX nested inside SysDeX same as ESTI inside AORMS).

-- ── password_reset_requests — audit trail for admin-triggered resets ────
-- The reset itself is a Supabase Auth API call (resetPasswordForEmail),
-- not a table write on any Platform table, so there's nothing else to
-- hang a trigger off of — this table exists specifically so the
-- "activity log only ever populated by triggers" discipline
-- (0012_activity_log.sql) still holds even for an action with no natural
-- table write to log.
create table public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  triggered_by_id uuid not null references public.accounts (id),
  email_sent_to text not null,
  created_at timestamptz not null default now()
);

alter table public.password_reset_requests enable row level security;

create policy "password_reset_requests: admin read" on public.password_reset_requests
  for select using (public.is_platform_admin());
-- Zero write policies — service-role only (lib/actions/admin-accounts.ts),
-- same "no policy" precedent as payments/connectdex_applications.

create function public.log_password_reset_insert()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.log_platform_activity(
    'PLATFORM_PASSWORD_RESET_TRIGGERED', new.account_id, null,
    jsonb_build_object('triggered_by_id', new.triggered_by_id, 'email_sent_to', new.email_sent_to)
  );
  return new;
end;
$$;

create trigger after_password_reset_request_insert_log
  after insert on public.password_reset_requests
  for each row execute function public.log_password_reset_insert();

-- ── support_tickets — HelpDeX ─────────────────────────────────────────────
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  account_id uuid references public.accounts (id) on delete set null,
  category text not null check (category in ('ACCOUNT', 'BILLING', 'TECHNICAL', 'OTHER')),
  subject text not null,
  message text not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  admin_note text,
  resolved_at timestamptz,
  resolved_by_id uuid references public.accounts (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

create policy "support_tickets: admin read" on public.support_tickets
  for select using (public.is_platform_admin());
-- A signed-in submitter can check their own ticket's status — mirrors
-- connectdex_payments' "company members read own" shape. Optional: a
-- ticket submitted while signed out (account_id null) simply isn't
-- readable this way, same as any anonymous submission.
create policy "support_tickets: submitter read own" on public.support_tickets
  for select using (account_id = auth.uid());
-- Zero write policies — public submit + every admin action go through
-- service-role (lib/actions/support.ts), same connectdex_applications
-- precedent: no session necessarily exists at submission time to scope a
-- policy to anyway.

create function public.log_support_ticket_insert()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.log_platform_activity(
    'HELPDEX_TICKET_SUBMITTED', new.account_id, null,
    jsonb_build_object('ticket_id', new.id, 'category', new.category, 'subject', new.subject)
  );
  return new;
end;
$$;

create trigger after_support_ticket_insert_log
  after insert on public.support_tickets
  for each row execute function public.log_support_ticket_insert();

create function public.log_support_ticket_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status <> old.status then
    perform public.log_platform_activity(
      case new.status
        when 'IN_PROGRESS' then 'HELPDEX_TICKET_IN_PROGRESS'
        when 'RESOLVED' then 'HELPDEX_TICKET_RESOLVED'
        when 'CLOSED' then 'HELPDEX_TICKET_CLOSED'
        else 'HELPDEX_TICKET_STATUS_CHANGED'
      end,
      new.resolved_by_id, null,
      jsonb_build_object('ticket_id', new.id, 'from_status', old.status, 'to_status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger after_support_ticket_update_log
  after update on public.support_tickets
  for each row execute function public.log_support_ticket_update();
