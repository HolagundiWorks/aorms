-- 2026-09-14 — real pricing restructure per the "AORMS Landing Page &
-- Pricing" developer spec, explicit user direction after being asked
-- (real restructure vs. landing-copy-only): rename/reprice the live
-- Studio tiers from TRIAL/PRO/ENTERPRISE to a real, permanent
-- FREE/STUDIO/PROFESSIONAL/ENTERPRISE model.
--
-- Confirmed safe before writing this (read-only query against the live
-- project): zero studios currently hold a real PRO/ENTERPRISE licence and
-- zero CAPTURED payments exist for either plan — nobody has ever actually
-- paid under today's names/prices, so this is a clean rename, not a
-- migration of paying customers. No grandfathering logic needed.
--
-- FREE stops being a 30-day countdown and becomes a real, permanent,
-- capped-free tier (matching the spec's actual Free/Studio/Professional/
-- Enterprise framing — Free is one of four standing tiers, not a trial
-- that expires into nothing). `isLicenceActive()`
-- (web/app/(platform)/licences/page.tsx) already treats a null
-- `expires_at` as "active" — no separate app change needed for that part.

-- plan_pricing: drop PRO/ENTERPRISE, add the four real tiers.
delete from public.plan_pricing where plan in ('PRO', 'ENTERPRISE');

alter table public.plan_pricing drop constraint plan_pricing_plan_check;
alter table public.plan_pricing add constraint plan_pricing_plan_check
  check (plan in ('AORMS_IDENTITY', 'FREE', 'STUDIO', 'PROFESSIONAL', 'ENTERPRISE'));

insert into public.plan_pricing (plan, base_price_paise, price_per_seat_monthly_paise) values
  ('FREE', 0, 0),
  ('STUDIO', 2499000, 0),        -- ₹24,990/year
  ('PROFESSIONAL', 4999000, 0),  -- ₹49,990/year
  -- Enterprise's ₹1,00,000 is a reference/"starting at" figure, not a
  -- self-serve checkout amount (see lib/actions/platform-payments.ts —
  -- Enterprise moves to a "Talk to AORMS" contact flow, not Razorpay
  -- Checkout) — stored anyway so /admin/pricing has one place to keep
  -- the publicly-quoted starting price current.
  ('ENTERPRISE', 10000000, 0)
on conflict (plan) do update set base_price_paise = excluded.base_price_paise;

-- licences: a genuine two-step widen needed here, not one — caught live
-- across two failed apply attempts before this final shape. First
-- attempt (rename-then-widen) failed: the old TRIAL/PRO/ENTERPRISE-only
-- constraint was still in force at the moment of the UPDATE. Second
-- attempt (widen-straight-to-the-final-4-then-rename) also failed: ADD
-- CONSTRAINT validates every EXISTING row against the new definition
-- immediately, and existing rows are still 'TRIAL' at that point — which
-- isn't in the final 4 either. The constraint has to widen to a
-- superset covering BOTH old and new values first, then the renames run,
-- then it narrows to just the final 4.
alter table public.licences drop constraint licences_plan_check;
alter table public.licences add constraint licences_plan_check
  check (plan in ('TRIAL', 'PRO', 'ENTERPRISE', 'FREE', 'STUDIO', 'PROFESSIONAL'));

-- Rename existing rows (no-op today, zero PRO/ENTERPRISE rows — kept for
-- correctness/safety, matching this session's migration discipline of
-- never assuming a table is empty without checking first).
update public.licences set plan = 'STUDIO' where plan = 'PRO';
update public.licences set plan = 'FREE' where plan = 'TRIAL';
update public.licences set expires_at = null where plan = 'FREE';

-- Now narrow to the final 4 — every row has already been renamed above.
alter table public.licences drop constraint licences_plan_check;
alter table public.licences add constraint licences_plan_check
  check (plan in ('FREE', 'STUDIO', 'PROFESSIONAL', 'ENTERPRISE'));

-- New studios provision as a real, non-expiring FREE licence (0 PRO-status
-- seats, same as TRIAL always had — see migration 0021's own reasoning,
-- unchanged) instead of a 30-day countdown.
create or replace function public.handle_new_studio_licence()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.licences (studio_id, plan, seats, expires_at)
  values (new.id, 'FREE', 0, null);
  return new;
end;
$$;
