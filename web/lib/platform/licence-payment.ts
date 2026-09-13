import type { createServiceRoleClient } from "./service";

// 2026-09-13: 30 -> 365. AORMS Firm is priced and sold as an annual plan
// (₹1,999/year base + ₹199/user/month, billed as one annual lump sum — see
// platform/supabase/migrations/0017_identity_and_firm_plans.sql's own
// header for the full billing-mechanics disclosure) — a purchase now
// extends the licence by a year, not 30 days. The free `TRIAL` plan's own
// 30-day auto-provision (handle_new_studio_licence(), 0004_licences.sql)
// is a separate mechanism, untouched by this constant.
const LICENCE_PERIOD_DAYS = 365;

/**
 * Shared between lib/actions/platform-payments.ts's confirmPaymentClientSide
 * (the fast-path UX update) and app/api/razorpay/webhook/route.ts (the
 * durable source of truth) — marks a payment CAPTURED and extends the
 * target licence, in that order. Deliberately NOT in platform-payments.ts
 * itself despite being used there too: that file has a top-level "use
 * server" directive, and this function's first parameter (a Supabase
 * client instance) isn't serializable — keeping it in a plain module with
 * no "use server" directive avoids any ambiguity about whether Next's
 * Server Actions bundling would try to treat it as a client-callable
 * action just because it's exported from the same file as ones that are.
 *
 * `greatest(now, current expires_at)` so a renewal purchased before expiry
 * extends the remaining period rather than resetting the clock to a year
 * from today.
 */
export async function applyCapturedPayment(
  platformService: ReturnType<typeof createServiceRoleClient>,
  payment: { id: string; studio_id: string; plan: string; seats: number; razorpay_payment_id: string },
): Promise<void> {
  await platformService
    .from("payments")
    .update({ status: "CAPTURED", razorpay_payment_id: payment.razorpay_payment_id, updated_at: new Date().toISOString() })
    .eq("id", payment.id);

  const { data: licence } = await platformService.from("licences").select("expires_at").eq("studio_id", payment.studio_id).maybeSingle();
  const currentExpiry = licence?.expires_at ? new Date(licence.expires_at) : null;
  const base = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();
  const newExpiry = new Date(base.getTime() + LICENCE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  await platformService
    .from("licences")
    .update({ plan: payment.plan, seats: payment.seats, expires_at: newExpiry.toISOString() })
    .eq("studio_id", payment.studio_id);
}
