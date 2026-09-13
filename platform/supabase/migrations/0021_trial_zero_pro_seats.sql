-- 2026-09-14 SysDeX audit — real bug found and fixed: every new studio's
-- auto-provisioned TRIAL licence (handle_new_studio_licence(), migration
-- 0006) was minted with `seats = 1`, meaning a completely free, never-
-- paid-for studio could still assign one member PRO status via
-- assignProSeat (lib/actions/platform.ts) — directly contradicting the
-- documented model everywhere else in this app: "PRO is granted by a
-- studio you belong to (from its own paid seats), not automatic"
-- (app/(platform)/identity/page.tsx's own copy). A free tier with a free
-- PRO seat isn't a free tier's seat allotment at all.
--
-- Confirmed safe before writing this: zero studio_memberships anywhere
-- on the live project currently have pro_assigned_at set (checked via
-- the Management API before this migration), so setting existing TRIAL
-- licences to 0 seats revokes nothing anyone is actually using.
--
-- PRO/ENTERPRISE seat allotments (20 / 9999 — lib/actions/platform-
-- payments.ts's PLAN_SEAT_ALLOTMENT) are untouched; this only changes
-- the free tier's own starting point.

-- The existing `licences_seats_check: CHECK (seats > 0)` (migration
-- 0004) blocks 0 outright — found while writing this migration, before
-- it could fail live. 0 is now a legitimate value (a free-tier studio
-- with no PRO seat capacity at all), so this widens the constraint to
-- `>= 0` rather than dropping it — still blocks a negative seat count,
-- which was never a defensible value either.
alter table public.licences drop constraint licences_seats_check;
alter table public.licences add constraint licences_seats_check check (seats >= 0);

update public.licences set seats = 0 where plan = 'TRIAL';

create or replace function public.handle_new_studio_licence()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.licences (studio_id, plan, seats, expires_at)
  values (new.id, 'TRIAL', 0, now() + interval '30 days');
  return new;
end;
$$;
