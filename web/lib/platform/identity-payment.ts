import type { createServiceRoleClient } from "./service";

// AORMS Identity is sold as a flat annual fee (₹599/year) — a purchase
// extends identity_licences.expires_at by a year, same "greatest(now,
// current expiry) + period" renewal logic as licence-payment.ts's
// LICENCE_PERIOD_DAYS, just its own constant since the two plans could
// diverge later.
const IDENTITY_PERIOD_DAYS = 365;

/**
 * Shared between lib/actions/platform-payments.ts's
 * confirmIdentityPaymentClientSide (the fast-path UX update) and
 * app/api/razorpay/webhook/route.ts (the durable source of truth) — marks
 * an identity_payments row CAPTURED and extends the buyer's own
 * identity_licences row, in that order. Exact mirror of
 * lib/platform/licence-payment.ts's applyCapturedPayment, individual-
 * scoped instead of studio-scoped (no seats — AORMS Identity has no seat
 * concept). Deliberately NOT in platform-payments.ts itself, same reason
 * as licence-payment.ts: that file is "use server", and this function's
 * first parameter (a Supabase client instance) isn't serializable.
 */
export async function applyCapturedIdentityPayment(
  platformService: ReturnType<typeof createServiceRoleClient>,
  payment: { id: string; account_id: string; razorpay_payment_id: string },
): Promise<void> {
  await platformService
    .from("identity_payments")
    .update({ status: "CAPTURED", razorpay_payment_id: payment.razorpay_payment_id, updated_at: new Date().toISOString() })
    .eq("id", payment.id);

  const { data: licence } = await platformService
    .from("identity_licences")
    .select("expires_at")
    .eq("account_id", payment.account_id)
    .maybeSingle();
  const currentExpiry = licence?.expires_at ? new Date(licence.expires_at) : null;
  const base = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();
  const newExpiry = new Date(base.getTime() + IDENTITY_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  await platformService
    .from("identity_licences")
    .update({ plan: "AORMS_IDENTITY", expires_at: newExpiry.toISOString() })
    .eq("account_id", payment.account_id);
}
