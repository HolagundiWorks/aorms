-- Platform audit R2 (docs/esti/PLATFORMS-AUDIT-2026-10-01.md): the login/signup/reset
-- rate limiter was an in-memory Map — reset on every deploy and not shared across
-- instances. This is the shared store: fixed-window counters keyed by
-- "<action>:<identifier>", incremented atomically by one RPC (service-role only).
-- APPLIED 2026-10-01 to the live `aorms-platform` project.
create table if not exists public.rate_limit_buckets (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null
);
alter table public.rate_limit_buckets enable row level security;
-- No policies at all: only the service role (which bypasses RLS) can touch it.

create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_start timestamptz;
  v_hits integer;
begin
  insert into public.rate_limit_buckets as b (key, window_start, hits)
  values (p_key, v_now, 1)
  on conflict (key) do update set
    window_start = case when b.window_start + make_interval(secs => p_window_seconds) <= v_now then v_now else b.window_start end,
    hits = case when b.window_start + make_interval(secs => p_window_seconds) <= v_now then 1 else b.hits + 1 end
  returning b.window_start, b.hits into v_start, v_hits;

  -- Opportunistic cleanup (~1% of calls) so the table stays small.
  if random() < 0.01 then
    delete from public.rate_limit_buckets where window_start < v_now - interval '1 day';
  end if;

  if v_hits > p_max then
    return query select false, greatest(1, ceil(extract(epoch from (v_start + make_interval(secs => p_window_seconds) - v_now)))::integer);
  end if;
  return query select true, 0;
end;
$$;

revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
