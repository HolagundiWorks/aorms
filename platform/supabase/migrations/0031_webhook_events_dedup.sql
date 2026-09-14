-- 2026-09-14 — enterprise-grade security pass: replay defense-in-depth
-- for the Razorpay webhook (web/app/api/razorpay/webhook/route.ts). The
-- handler already has business-state idempotency (skips re-applying a
-- payment whose row is already status='CAPTURED'), which is the real
-- protection against double-crediting — this table is an additional,
-- cheap layer: a straight insert-or-skip on a dedup key, so a replayed
-- webhook never even reaches the business logic a second time, rather
-- than relying solely on every future payment-status branch remembering
-- to check first.
--
-- Keyed on `event_type:payment_id`, not a Razorpay-supplied event id —
-- Razorpay's webhook payload has no stable top-level event id in its
-- documented shape (unlike, say, Stripe's `evt_...`); `payment.entity.id`
-- (a real, stable, unique-per-payment Razorpay id, e.g. `pay_...`) is
-- already present on both `payment.captured` and `payment.failed`
-- payloads and is what this handler already extracts. Scoped by event
-- type too so a genuine captured-then-later-failed sequence for the same
-- payment id (not expected in practice, but not impossible) isn't
-- mistaken for a replay of the first event.
create table public.razorpay_webhook_events (
  dedup_key text primary key,
  received_at timestamptz not null default now()
);

-- Service-role only (the webhook route's own client) — no authenticated
-- session is ever involved in this table at all, same shape as every
-- other service-role-only table in this project.
alter table public.razorpay_webhook_events enable row level security;
