-- AORMS Platform — Studio plans renamed/repriced from the single
-- AORMS_FIRM tier (0017, ₹1,999/yr base + ₹199/user/month) to two flat
-- annual tiers: PRO (₹1,999/yr) and ENTERPRISE (₹14,999/yr, for studios
-- with 20+ team members, includes a custom subdomain — see the
-- subdomain_slug column below). Confirmed with the user: Pro/Enterprise
-- are flat, no per-seat billing component at all (the earlier AORMS_FIRM
-- per-seat-monthly model is fully retired, not kept alongside this).
--
-- Naming collision, flagged not silently ignored: `accounts.level` (an
-- individual's free, studio-granted usage status, migration 0018) is
-- ALSO "BASIC"/"PRO" — a Studio's paid "Pro" plan and an individual's
-- free "PRO" level are two different concepts that happen to share a
-- word. Kept apart by convention everywhere in code/UI: "the Pro plan"
-- (Studio-scoped, this migration) vs. "PRO level"/"PRO status"
-- (individual-scoped, accounts.level, unrelated table).
--
-- Confirmed live before writing this: 1 existing `licences` row (TRIAL),
-- 0 `payments` rows — no AORMS_FIRM data to migrate.

-- ── plan_pricing: AORMS_FIRM -> PRO + ENTERPRISE ──────────────────────────
delete from public.plan_pricing where plan = 'AORMS_FIRM';
alter table public.plan_pricing drop constraint plan_pricing_plan_check;
alter table public.plan_pricing add constraint plan_pricing_plan_check
  check (plan in ('AORMS_IDENTITY', 'PRO', 'ENTERPRISE'));

-- Both flat annual fees, price_per_seat_monthly_paise=0 (no per-seat
-- component for either) — paise: ₹1,999 -> 199900, ₹14,999 -> 1499900.
insert into public.plan_pricing (plan, base_price_paise, price_per_seat_monthly_paise) values
  ('PRO', 199900, 0),
  ('ENTERPRISE', 1499900, 0);

-- ── licences: AORMS_FIRM -> PRO ────────────────────────────────────────────
update public.licences set plan = 'PRO' where plan = 'AORMS_FIRM';
alter table public.licences drop constraint licences_plan_check;
alter table public.licences add constraint licences_plan_check
  check (plan in ('TRIAL', 'PRO', 'ENTERPRISE'));
-- handle_new_studio_licence() (0004_licences.sql) still inserts
-- ('TRIAL', 1, now() + 30 days) on new-studio creation, untouched.

-- ── payments: AORMS_FIRM -> PRO ─────────────────────────────────────────────
update public.payments set plan = 'PRO' where plan = 'AORMS_FIRM';
alter table public.payments drop constraint payments_plan_check;
alter table public.payments add constraint payments_plan_check
  check (plan in ('PRO', 'ENTERPRISE'));

-- ── studios: custom subdomain reservation (Enterprise perk) ───────────────
-- Schema + slug reservation only this pass (confirmed with the user) —
-- the wildcard-DNS + edge Host-header->studio routing needed to make
-- <slug>.aorms.in actually resolve is a disclosed follow-up (see
-- docs/esti/ROADMAP.md's dated entry), not built here. Nullable: only an
-- Enterprise-tier studio ever sets one (enforced in the Server Action,
-- not this constraint — a studio can downgrade later and the reservation
-- simply stops being usable, not retroactively deleted).
-- Shape only (lowercase/digits/hyphens, 3-63 chars, matching a real DNS
-- label) — the reserved-word blocklist (identity/connectdex/sysdex/www/
-- admin/api/app/support) is app-level policy, enforced in
-- setStudioSubdomain, not a DB rule.
alter table public.studios add column subdomain_slug text unique
  check (subdomain_slug is null or subdomain_slug ~ '^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$');
