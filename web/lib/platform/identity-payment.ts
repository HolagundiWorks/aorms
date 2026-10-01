import type { createServiceRoleClient } from "./service";

/**
 * Shared between lib/actions/platform-payments.ts's
 * confirmIdentityPaymentClientSide (the fast-path UX update) and
 * app/api/razorpay/webhook/route.ts (the durable source of truth) — marks
 * an identity_payments row CAPTURED and permanently verifies the buyer's
 * own identity_licences row, in that order.
 *
 * 2026-09-13: this is now a ONE-TIME, non-renewing purchase (was an
 * annual plan extended by `greatest(now, expiry) + 365 days`, mirroring
 * lib/platform/licence-payment.ts's applyCapturedPayment) — corrected per
 * the user's own "user accounts remain free" direction (see migration
 * 0018's header for the full account: AORMS Identity is now a ₹199
 * one-time fee, gated on 100 usage-hours, buying a PERMANENT verified
 * identity that never expires and never re-charges). `expires_at` is set
 * to null and stays null forever — there's no renewal math here at all
 * anymore, deliberately, not an oversight.
 *
 * Deliberately NOT in platform-payments.ts itself, same reason as
 * licence-payment.ts: that file is "use server", and this function's
 * first parameter (a Supabase client instance) isn't serializable.
 */
export async function applyCapturedIdentityPayment(
  platformService: ReturnType<typeof createServiceRoleClient>,
  payment: { id: string; account_id: string; razorpay_payment_id: string },
): Promise<boolean> {
  // Claim, then verify; release the claim on failure (2026-10-01 audit, see licence-payment.ts).
  const { data: claimed, error: claimError } = await platformService
    .from("identity_payments")
    .update({ status: "CAPTURED", razorpay_payment_id: payment.razorpay_payment_id, updated_at: new Date().toISOString() })
    .eq("id", payment.id)
    .neq("status", "CAPTURED")
    .select("id");
  if (claimError) throw new Error(`payment claim failed: ${claimError.message}`);
  if (!claimed || claimed.length === 0) return false;

  const { error } = await platformService.from("identity_licences").update({ plan: "AORMS_IDENTITY", expires_at: null }).eq("account_id", payment.account_id);
  if (error) {
    await platformService.from("identity_payments").update({ status: "AUTHORIZED", updated_at: new Date().toISOString() }).eq("id", payment.id);
    throw new Error(`identity not verified, payment released for retry: ${error.message}`);
  }
  return true;
}
