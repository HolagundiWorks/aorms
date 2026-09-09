-- Self-service calendar-feed token issuance — the same RLS gap
-- migration 0031's update_my_full_name() closed for `full_name`, now for
-- `calendar_feed_token`/`calendar_feed_token_at` (columns already existed
-- since migration 0009, unused until this pass built the actual feed —
-- see that migration's own comment on the column, which already
-- anticipated this exact function). "profiles: owner manages" only lets
-- OWNER UPDATE any row; nobody had a way to set their OWN token.
--
-- Single-purpose security-definer functions, same shape as 0031/0032 and
-- for the same reason: only ever touch calendar_feed_token/
-- calendar_feed_token_at, nothing else on the row.
--
-- Token generation avoids the pgcrypto extension (gen_random_bytes) on
-- purpose — two concatenated gen_random_uuid() calls (Postgres core,
-- already relied on everywhere in this schema for primary keys) give
-- 244 bits of randomness, comfortably more than the 192 bits the old
-- backend's `randomBytes(24)` produced, with no extension dependency.

create or replace function public.ensure_my_calendar_feed_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_issued_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select calendar_feed_token, calendar_feed_token_at
  into v_token, v_issued_at
  from public.profiles
  where id = auth.uid();

  -- 90-day TTL, matching CALENDAR_FEED_TOKEN_TTL_DAYS in the old backend.
  if v_token is not null and v_issued_at is not null and v_issued_at > now() - interval '90 days' then
    return v_token;
  end if;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  update public.profiles
  set calendar_feed_token = v_token, calendar_feed_token_at = now()
  where id = auth.uid();

  return v_token;
end;
$$;

create or replace function public.rotate_my_calendar_feed_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  update public.profiles
  set calendar_feed_token = v_token, calendar_feed_token_at = now()
  where id = auth.uid();

  return v_token;
end;
$$;

comment on function public.ensure_my_calendar_feed_token() is
  'Get-or-create the caller''s own calendar-feed token, reusing a live (< 90 day) one. Port of ensureCalendarFeedToken() (backend/src/lib/workloadCalendar.ts).';
comment on function public.rotate_my_calendar_feed_token() is
  'Force-issue a fresh calendar-feed token for the caller, invalidating any previous one. Port of rotateCalendarFeedToken().';

grant execute on function public.ensure_my_calendar_feed_token() to authenticated;
grant execute on function public.rotate_my_calendar_feed_token() to authenticated;
