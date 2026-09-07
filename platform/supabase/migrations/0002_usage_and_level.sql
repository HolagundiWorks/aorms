-- AORMS Platform — usage heartbeats + automatic Basic -> Pro promotion.
-- web/'s UsageHeartbeat component (mounted in the authenticated app shell)
-- calls recordHeartbeat() roughly every 60s while the tab is visible;
-- that Server Action inserts one row here per beat via the platform's
-- service-role client (see web/lib/actions/platform.ts) — no platform
-- session needs to be open in that browser tab, only a one-time identity
-- link (web/supabase/migrations/0029_platform_link.sql).
--
-- 100 hours = 360000 seconds. Confirmed with the user: the level flips
-- automatically at that threshold, no application/approval step.
create table public.usage_heartbeats (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  seconds int not null check (seconds > 0 and seconds <= 120),
  created_at timestamptz not null default now()
);

alter table public.usage_heartbeats enable row level security;

create policy "usage_heartbeats: self insert" on public.usage_heartbeats
  for insert with check (account_id = auth.uid());
create policy "usage_heartbeats: self read" on public.usage_heartbeats
  for select using (account_id = auth.uid());

-- Runs the increment + threshold check as one atomic UPDATE (not an
-- app-layer read-then-write) so concurrent heartbeats can't race past the
-- threshold or double-count.
create function public.apply_heartbeat()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.accounts
  set
    total_active_seconds = total_active_seconds + new.seconds,
    level = case
      when level = 'BASIC' and total_active_seconds + new.seconds >= 360000 then 'PRO'
      else level
    end
  where id = new.account_id;
  return new;
end;
$$;

create trigger after_heartbeat_insert
  after insert on public.usage_heartbeats
  for each row execute function public.apply_heartbeat();
