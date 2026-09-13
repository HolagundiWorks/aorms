-- AORMS Platform — real pricing: "AORMS Identity" (individual, ₹599/year)
-- and "AORMS Firm" (Studio, ₹1,999/year base + ₹199/user/month, billed as
-- one annual lump sum — see below) replacing the placeholder
-- STANDARD/PREMIUM per-seat model from 0010_payments.sql. Confirmed live
-- before writing this: 1 existing `licences` row (TRIAL), 0 `payments`
-- rows — safe to widen/narrow the plan check constraints outright, no
-- STANDARD/PREMIUM data to migrate in place.
--
-- Billing-mechanics scope note (explicit, matching 0010_payments.sql's own
-- disclosure style): "₹199/user/month" is a DISPLAYED unit rate, not real
-- recurring auto-debit. A Firm licence purchase still charges one
-- Razorpay Order, once — amount = base_price_paise +
-- price_per_seat_monthly_paise * 12 * seats — extending expires_at by 365
-- days, same one-time-purchase model 0010 established, just an annual
-- period instead of 30 days and a base+per-seat formula instead of pure
-- per-seat. Real Razorpay Subscriptions (mandates, auto-debit, dunning)
-- remains out of scope, same as before this migration.

-- ── plan_pricing: replace the per-seat-only shape with base + per-seat/mo ──
-- No FK references plan_pricing (it's a lookup table keyed by `plan` text,
-- checked against independently by licences.plan/payments.plan, never
-- joined by foreign key) — safe to drop and recreate rather than ALTER.
drop table public.plan_pricing;

create table public.plan_pricing (
  plan text primary key check (plan in ('AORMS_IDENTITY', 'AORMS_FIRM')),
  -- Flat annual fee. AORMS Identity: ₹599/yr, no seats at all. AORMS Firm:
  -- ₹1,999/yr base, on top of which the per-seat-monthly rate below adds up.
  base_price_paise bigint not null check (base_price_paise >= 0),
  -- Displayed as "₹X/user/month" but billed annually as part of the same
  -- lump sum as base_price_paise (see the file header) — 0 for
  -- AORMS_IDENTITY (no seat concept for an individual).
  price_per_seat_monthly_paise bigint not null default 0 check (price_per_seat_monthly_paise >= 0),
  updated_at timestamptz not null default now()
);

alter table public.plan_pricing enable row level security;

create policy "plan_pricing: authenticated read" on public.plan_pricing
  for select to authenticated using (true);
create policy "plan_pricing: admin write" on public.plan_pricing
  for update using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Real prices (paise): ₹599 -> 59900, ₹1,999 -> 199900, ₹199 -> 19900.
insert into public.plan_pricing (plan, base_price_paise, price_per_seat_monthly_paise) values
  ('AORMS_IDENTITY', 59900, 0),
  ('AORMS_FIRM', 199900, 19900);

-- ── licences: STANDARD/PREMIUM -> the one AORMS_FIRM plan ─────────────────
-- Pre-step is a no-op today (confirmed 0 STANDARD/PREMIUM rows live) but
-- kept so this migration is safe to run against any environment, not just
-- the one it was written against.
update public.licences set plan = 'AORMS_FIRM' where plan in ('STANDARD', 'PREMIUM');
alter table public.licences drop constraint licences_plan_check;
alter table public.licences add constraint licences_plan_check check (plan in ('TRIAL', 'AORMS_FIRM'));
-- handle_new_studio_licence() (0004_licences.sql) still inserts
-- ('TRIAL', 1, now() + 30 days) on new-studio creation, untouched — the
-- free trial period is a separate mechanism from the paid-purchase period
-- changed below.

-- ── payments: a studio payment only ever buys AORMS_FIRM now ──────────────
update public.payments set plan = 'AORMS_FIRM' where plan in ('STANDARD', 'PREMIUM');
alter table public.payments drop constraint payments_plan_check;
alter table public.payments add constraint payments_plan_check check (plan in ('AORMS_FIRM'));

-- ── identity_licences: the individual counterpart to `licences` ──────────
-- Every account gets one row from creation (FREE, no expiry) via the
-- trigger below — mirrors handle_new_studio_licence()'s auto-provision on
-- studio creation, so "does this account have an Identity licence row" is
-- never a null-check callers need to handle specially.
create table public.identity_licences (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.accounts (id) on delete cascade,
  plan text not null default 'FREE' check (plan in ('FREE', 'AORMS_IDENTITY')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.identity_licences enable row level security;

create policy "identity_licences: self read" on public.identity_licences
  for select using (account_id = auth.uid());
create policy "identity_licences: admin read" on public.identity_licences
  for select using (public.is_platform_admin());
-- Payment-gated from day one (no self-serve free-edit stage this time —
-- 0011_licence_payment_gate.sql's own incident is the reason: a studio
-- owner could self-serve PATCH their own licences.plan for free until that
-- policy was closed after the fact). Every real update goes through either
-- a verified Razorpay payment (service-role, via applyCapturedIdentityPayment)
-- or this admin-only path.
create policy "identity_licences: admin update" on public.identity_licences
  for update using (public.is_platform_admin()) with check (public.is_platform_admin());

create function public.handle_new_account_identity_licence()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.identity_licences (account_id, plan, expires_at) values (new.id, 'FREE', null);
  return new;
end;
$$;

create trigger after_account_insert_identity_licence
  after insert on public.accounts
  for each row execute function public.handle_new_account_identity_licence();

-- Backfill: every account that already exists today gets its FREE row too
-- (the trigger above only fires for new inserts from here on).
insert into public.identity_licences (account_id, plan, expires_at)
select id, 'FREE', null from public.accounts
on conflict (account_id) do nothing;

-- ── identity_payments: the individual counterpart to `payments` ──────────
create table public.identity_payments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  plan text not null check (plan in ('AORMS_IDENTITY')),
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR',
  razorpay_order_id text unique not null,
  razorpay_payment_id text,
  status text not null default 'CREATED' check (status in ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.identity_payments enable row level security;

create policy "identity_payments: self read" on public.identity_payments
  for select using (account_id = auth.uid());
create policy "identity_payments: admin read" on public.identity_payments
  for select using (public.is_platform_admin());
-- Zero insert/update policy for `authenticated`, exact mirror of
-- `payments`' own reasoning (0010_payments.sql) — every write goes through
-- the service-role client from createIdentityOrder / the webhook /
-- confirmIdentityPaymentClientSide, never a direct client PATCH.

-- ── activity log — extend the existing platform_activity_log triggers ────
-- Same pattern as log_licence_update/log_payment_insert/log_payment_update
-- (0012_activity_log.sql) — studio_id is null for these (individual-scoped,
-- not studio-scoped), account_id carries the identity instead.
create function public.log_identity_licence_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.log_platform_activity(
    'IDENTITY_LICENCE_CHANGED', new.account_id, null,
    jsonb_build_object(
      'from_plan', old.plan, 'to_plan', new.plan,
      'from_expires_at', old.expires_at, 'to_expires_at', new.expires_at
    )
  );
  return new;
end;
$$;

create trigger after_identity_licence_update_log
  after update on public.identity_licences
  for each row execute function public.log_identity_licence_update();

create function public.log_identity_payment_insert()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform public.log_platform_activity(
    'IDENTITY_PAYMENT_CREATED', new.account_id, null,
    jsonb_build_object('plan', new.plan, 'amount_paise', new.amount_paise, 'razorpay_order_id', new.razorpay_order_id)
  );
  return new;
end;
$$;

create trigger after_identity_payment_insert_log
  after insert on public.identity_payments
  for each row execute function public.log_identity_payment_insert();

create function public.log_identity_payment_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status <> old.status then
    perform public.log_platform_activity(
      case new.status
        when 'CAPTURED' then 'IDENTITY_PAYMENT_CAPTURED'
        when 'FAILED' then 'IDENTITY_PAYMENT_FAILED'
        when 'REFUNDED' then 'IDENTITY_PAYMENT_REFUNDED'
        when 'AUTHORIZED' then 'IDENTITY_PAYMENT_AUTHORIZED'
        else 'IDENTITY_PAYMENT_STATUS_CHANGED'
      end,
      new.account_id, null,
      jsonb_build_object('from_status', old.status, 'to_status', new.status, 'razorpay_payment_id', new.razorpay_payment_id)
    );
  end if;
  return new;
end;
$$;

create trigger after_identity_payment_update_log
  after update on public.identity_payments
  for each row execute function public.log_identity_payment_update();
