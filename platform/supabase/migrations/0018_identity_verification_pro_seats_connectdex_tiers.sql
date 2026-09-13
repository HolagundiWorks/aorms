-- AORMS Platform — correction pass after 0017, per the user's fuller
-- pricing spec (2026-09-13):
--
-- 1. Individual accounts stay free, always. The AORMS_IDENTITY plan
--    (0017) is REPRICED and RE-MEANT here, not replaced by a new table:
--    ₹599/year -> a ONE-TIME ₹199 fee, available only after 100 usage
--    hours, buying a PERMANENT verified identity (no renewal, ever). The
--    handle (accounts.public_id) itself is untouched — it keeps minting
--    free and immediate at signup exactly as before; this fee buys an
--    additive "verified" flag on top of it, confirmed with the user after
--    finding the alternative (gating the handle itself) would be
--    circular, since heartbeat recording — the very mechanism that counts
--    toward 100 hours — depends on that handle already existing as the
--    Office-Hub-session join key.
-- 2. PRO is no longer free/automatic. Removed from apply_heartbeat()
--    entirely (total_active_seconds still accumulates — needed for the
--    100hr gate above). PRO becomes something a Studio grants to one of
--    its own members, capped at that Studio's own paid AORMS_FIRM
--    licences.seats count — the first real use for `seats`, which today
--    is purely a billing number with no functional consequence. No new
--    price: this reuses AORMS_FIRM's own already-built, already-priced
--    seat purchase (0017) rather than inventing a second, unpriced
--    "pay for a member" flow (confirmed: no such pattern existed anywhere
--    in this codebase before this migration).
-- 3. ConnectDeX onboarding fee -> real ₹5,999 (was a ₹4,999 placeholder).
-- 4. Company tiers (renamed, unpriced): BASE_LINE (was Silver) / PRO (was
--    Gold) / PRO_PLUS (was Platinum). Interactive catalogue/SKU detail/
--    direct PO generation/lead generation are the eventual Pro/Pro Plus
--    differentiators per the user's own framing but have zero existing
--    schema anywhere and no price yet — disclosed as a real follow-up,
--    not built here. Only the tier field + Base Line's catalogue-category
--    cap land in this migration.

-- ── 1. Identity verification: reprice, don't re-model ─────────────────────
update public.plan_pricing set base_price_paise = 19900, updated_at = now() where plan = 'AORMS_IDENTITY';

-- ── 2. Remove the free automatic PRO flip ──────────────────────────────────
-- total_active_seconds still accumulates (needed for the 100hr identity-
-- verification gate in createIdentityOrder); `level` is no longer touched
-- here at all — it now only ever changes via the new PRO-seat assignment
-- Server Action below (accounts has no self-serve update RLS policy, so
-- that action necessarily goes through the service-role client).
create or replace function public.apply_heartbeat()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.accounts
  set total_active_seconds = total_active_seconds + new.seconds
  where id = new.account_id;
  return new;
end;
$$;

-- ── 3. PRO seat assignment ──────────────────────────────────────────────────
-- Not-null = this membership currently holds one of its Studio's paid PRO
-- seats. No DB-level cap trigger — every write goes through one Server
-- Action (assignProSeat/revokeProSeat) that checks the count against
-- licences.seats itself, same "app check for a clean error message, RLS
-- is still the real per-row authorization gate" pattern already used
-- throughout this codebase (e.g. createLicenceOrder's own-studio-owner
-- check before the payments insert).
alter table public.studio_memberships add column pro_assigned_at timestamptz;

-- Extend the existing membership-update logger (0012_activity_log.sql)
-- with a third branch rather than adding a whole new trigger — same
-- table, same event, same log_platform_activity() call underneath.
create or replace function public.log_studio_membership_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status <> old.status then
    perform public.log_platform_activity(
      case new.status
        when 'LEFT' then 'MEMBER_LEFT'
        when 'ACTIVE' then 'MEMBER_JOINED'
        else 'MEMBER_STATUS_CHANGED'
      end,
      new.account_id, new.studio_id,
      jsonb_build_object('from_status', old.status, 'to_status', new.status)
    );
  elsif new.role <> old.role then
    perform public.log_platform_activity(
      'MEMBER_ROLE_CHANGED', new.account_id, new.studio_id,
      jsonb_build_object('from_role', old.role, 'to_role', new.role)
    );
  elsif (new.pro_assigned_at is null) <> (old.pro_assigned_at is null) then
    perform public.log_platform_activity(
      case when new.pro_assigned_at is not null then 'MEMBER_PRO_SEAT_ASSIGNED' else 'MEMBER_PRO_SEAT_REVOKED' end,
      new.account_id, new.studio_id,
      jsonb_build_object('pro_assigned_at', new.pro_assigned_at)
    );
  end if;
  return new;
end;
$$;

-- ── 4. ConnectDeX onboarding fee -> real ₹5,999 ────────────────────────────
update public.connectdex_settings set onboarding_fee_paise = 599900, updated_at = now() where id = true;

-- ── 5. Company tiers ─────────────────────────────────────────────────────
alter table public.companies add column tier text not null default 'BASE_LINE'
  check (tier in ('BASE_LINE', 'PRO', 'PRO_PLUS'));
