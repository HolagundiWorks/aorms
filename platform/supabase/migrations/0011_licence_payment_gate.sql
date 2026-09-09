-- AORMS Platform — close the self-serve licence bypass now that real
-- Razorpay payments exist (0010_payments.sql). Before this migration, any
-- studio owner could UPDATE their own licences row directly — plan,
-- seats, expires_at, no payment involved at all (0004_licences.sql's own
-- header comment disclosed this plainly: "No billing/payment integration
-- exists in this stack — the owner self-serves ... directly"). Leaving
-- that policy in place after adding payment processing would make
-- Razorpay decorative — an owner could just PATCH their own row to
-- PREMIUM for free via a raw PostgREST call, bypassing checkout entirely.
drop policy "licences: owner update" on public.licences;

-- The one authenticated write path left: a platform admin overriding a
-- licence directly (comps, manual/offline payment reconciliation, support
-- cases) via the new /admin/licences page.
create policy "licences: admin update" on public.licences
  for update using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Every other licence mutation (a captured Razorpay payment) goes through
-- the platform service-role client from web/app/api/razorpay/webhook/
-- route.ts, which bypasses RLS entirely — same trust model as payments'
-- own writes.
--
-- Deliberately not adding a narrower self-service policy (e.g. "owner can
-- reduce seats but not raise plan") in this pass: v1 keeps this simple and
-- fully closed rather than trying to carve out a safe self-service subset
-- that some future change could accidentally widen. A studio owner
-- wanting to reduce seats or plan contacts support for now — safe to
-- relax later since a downgrade doesn't move money.
