-- Roadmap P2: HelpDeX replies + licence-expiry reminders. APPLIED 2026-10-01 to the live
-- `aorms-platform` project. Both tables are service-role only (RLS on, no policies).
--  * support_ticket_replies — every staff reply is stored; `emailed` records whether the
--    SMTP send actually succeeded (the UI reports it, never assumes).
--  * licence_reminders — one row per (licence, stage T30/T7/T0, expiry date), written only
--    after the email is sent, so the daily cron can re-run safely without double-sending.
create table if not exists public.support_ticket_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid references public.accounts (id) on delete set null,
  message text not null check (char_length(message) between 1 and 5000),
  emailed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists support_ticket_replies_ticket_idx on public.support_ticket_replies (ticket_id, created_at);
create index if not exists support_ticket_replies_author_idx on public.support_ticket_replies (author_id);
alter table public.support_ticket_replies enable row level security;

create table if not exists public.licence_reminders (
  id uuid primary key default gen_random_uuid(),
  licence_id uuid not null references public.licences (id) on delete cascade,
  kind text not null check (kind in ('T30', 'T7', 'T0')),
  expires_at timestamptz not null,
  sent_at timestamptz not null default now(),
  unique (licence_id, kind, expires_at)
);
alter table public.licence_reminders enable row level security;
