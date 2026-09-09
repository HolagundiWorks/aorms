-- AORMS Platform — Razorpay payments + admin-editable plan pricing.
-- Money is stored in integer paise, matching this codebase's existing
-- convention (see CLAUDE.md § Conventions) — same unit web/'s own
-- invoicing already uses, just in this separate platform database.
--
-- One-time purchases only in this pass, not recurring subscriptions: a
-- captured payment extends a studio's licences.expires_at by a fixed
-- period (30 days — see 0011's webhook-facing policy and
-- web/app/api/razorpay/webhook/route.ts). Razorpay Subscriptions
-- (mandates, auto-debit, dunning) is a materially bigger scope, explicitly
-- not built here.

-- ── plan_pricing ─────────────────────────────────────────────────────────
-- Admin-editable, not hardcoded in application code or env vars, so a
-- price change doesn't need a redeploy. Seeded with PLACEHOLDER values —
-- review and set real prices on /admin/pricing before accepting real
-- payments; these numbers are not a business decision this migration is
-- making, just a non-null starting point so checkout has something to
-- read on day one.
create table public.plan_pricing (
  plan text primary key check (plan in ('STANDARD', 'PREMIUM')),
  price_per_seat_paise bigint not null check (price_per_seat_paise > 0),
  updated_at timestamptz not null default now()
);

alter table public.plan_pricing enable row level security;

-- PLACEHOLDER: ₹999/seat (STANDARD), ₹2,499/seat (PREMIUM) per 30-day
-- period. Change via /admin/pricing, not by editing this migration.
insert into public.plan_pricing (plan, price_per_seat_paise) values
  ('STANDARD', 99900),
  ('PREMIUM', 249900);

-- Any authenticated user can read pricing (needed to show the price before
-- checkout, on the licences page of a studio they may not own yet).
create policy "plan_pricing: authenticated read" on public.plan_pricing
  for select to authenticated using (true);
create policy "plan_pricing: admin write" on public.plan_pricing
  for update using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ── payments ─────────────────────────────────────────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios (id) on delete cascade,
  account_id uuid not null references public.accounts (id),
  plan text not null check (plan in ('STANDARD', 'PREMIUM')),
  seats int not null check (seats > 0),
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR',
  razorpay_order_id text unique not null,
  razorpay_payment_id text,
  status text not null default 'CREATED' check (status in ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments enable row level security;

-- Studio members can see their own studio's payment history (mirrors
-- "licences: studio members read").
create policy "payments: studio members read" on public.payments
  for select using (
    exists (
      select 1 from public.studio_memberships
      where studio_id = payments.studio_id
        and account_id = auth.uid()
        and status = 'ACTIVE'
    )
  );
create policy "payments: admin read" on public.payments
  for select using (public.is_platform_admin());

-- Deliberately zero insert/update policies for `authenticated` — every
-- write (order creation, webhook-driven status updates) goes through the
-- platform service-role client from a Server Action / Route Handler, never
-- directly from a browser session. This is the same "no policy = default
-- deny, service-role only" pattern already used for accounts'
-- total_active_seconds/level (0001_core.sql) — a payment record must stay
-- an accurate mirror of what Razorpay actually reports, not something a
-- client session can influence even indirectly.
