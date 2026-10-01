import type { createServiceRoleClient } from "./service";

// 2026-09-13: 30 -> 365. Both Studio plans (Pro/Enterprise, renamed from
// the single AORMS_FIRM tier by migration 0019 — see its header for the
// full account) are sold as flat annual fees — a purchase extends the
// licence by a year, not 30 days. The free `TRIAL` plan's own 30-day
// auto-provision (handle_new_studio_licence(), 0004_licences.sql) is a
// separate mechanism, untouched by this constant. `payment.seats` here is
// already the plan's own fixed allotment (PLAN_SEAT_ALLOTMENT in
// platform-payments.ts's createLicenceOrder — 20 for Pro, 9999 for
// Enterprise), not a buyer-chosen number — this function just propagates
// whatever the payments row already carries through to `licences`.
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
): Promise<boolean> {
  // Claim first (2026-10-01 audit): flip to CAPTURED only if it isn't already, so the
  // webhook and the client fast-path can't both extend the licence. If the entitlement
  // write then fails, release the claim and throw so the caller/Razorpay retries — the
  // old order marked CAPTURED, ignored errors, and could leave a paid licence unextended
  // with the payment already "done".
  const { data: claimed, error: claimError } = await platformService
    .from("payments")
    .update({ status: "CAPTURED", razorpay_payment_id: payment.razorpay_payment_id, updated_at: new Date().toISOString() })
    .eq("id", payment.id)
    .neq("status", "CAPTURED")
    .select("id");
  if (claimError) throw new Error(`payment claim failed: ${claimError.message}`);
  if (!claimed || claimed.length === 0) return false;

  try {
    const { data: licence, error: readError } = await platformService.from("licences").select("expires_at").eq("studio_id", payment.studio_id).maybeSingle();
    if (readError) throw new Error(readError.message);
    const currentExpiry = licence?.expires_at ? new Date(licence.expires_at) : null;
    const base = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();
    const newExpiry = new Date(base.getTime() + LICENCE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    const { error: updateError } = await platformService
      .from("licences")
      .update({ plan: payment.plan, seats: payment.seats, expires_at: newExpiry.toISOString() })
      .eq("studio_id", payment.studio_id);
    if (updateError) throw new Error(updateError.message);
    return true;
  } catch (e) {
    await platformService.from("payments").update({ status: "AUTHORIZED", updated_at: new Date().toISOString() }).eq("id", payment.id);
    throw new Error(`licence not extended, payment released for retry: ${e instanceof Error ? e.message : String(e)}`);
  }
}
