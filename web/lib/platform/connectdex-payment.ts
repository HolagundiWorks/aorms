import type { createServiceRoleClient } from "./service";

/**
 * Shared between lib/actions/connectdex.ts's confirmConnectDexPaymentClientSide
 * (the fast-path UX update) and app/api/razorpay/webhook/route.ts (the
 * durable source of truth) — marks a connectdex_payments row CAPTURED and
 * flips the target company's status to ACTIVE. Same "plain module, no
 * `use server`" reasoning as lib/platform/licence-payment.ts: this
 * function's first parameter is a Supabase client instance, not
 * serializable, and keeping it out of a "use server" file avoids any
 * ambiguity about Next's Server Actions bundling treating it as
 * client-callable just because it shares a file with functions that are.
 *
 * Unlike the Studio licence flow, there's no period/expiry to extend —
 * ConnectDeX onboarding is a one-time flat fee, not a renewing licence.
 * Paying simply moves the company from PENDING_PAYMENT to ACTIVE.
 */
export async function applyCapturedConnectDexPayment(
  platformService: ReturnType<typeof createServiceRoleClient>,
  payment: { id: string; company_id: string; razorpay_payment_id: string },
): Promise<void> {
  await platformService
    .from("connectdex_payments")
    .update({ status: "CAPTURED", razorpay_payment_id: payment.razorpay_payment_id, updated_at: new Date().toISOString() })
    .eq("id", payment.id);

  await platformService.from("companies").update({ status: "ACTIVE" }).eq("id", payment.company_id).eq("status", "PENDING_PAYMENT");
}
