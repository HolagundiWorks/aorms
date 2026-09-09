import type { createServiceRoleClient } from "./service";

const LICENCE_PERIOD_DAYS = 30;

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
 * extends the remaining period rather than resetting the clock to 30 days
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
