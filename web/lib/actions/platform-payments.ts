"use server";

/**
 * AORMS Platform — Razorpay licence payments + admin overrides. Split out
 * from lib/actions/platform.ts (already 500+ lines) rather than grown
 * in-place, since this is a cohesive, separately-reviewable surface: real
 * money (payments) and the platform-admin-only actions that go with it
 * (licence override, pricing). Same house style as platform.ts: errors
 * returned as {error}, revalidatePath right before a successful return.
 *
 * See docs/esti/ROADMAP-CLOUD.md's dated entry for the full design —
 * short version: licences.plan/seats/expires_at can no longer be
 * self-served by a studio owner (platform/supabase/migrations/
 * 0011_licence_payment_gate.sql dropped that RLS policy) — every change
 * now goes through either a verified Razorpay payment (this file's
 * createLicenceOrder + confirmPaymentClientSide, and the webhook at
 * app/api/razorpay/webhook/route.ts) or a platform admin override (this
 * file's adminUpdateLicence/adminSetPricing).
 */
import { revalidatePath } from "next/cache";
import { createClient as createPlatformClient } from "../platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";
import { getCurrentPlatformAccount } from "../platform/account";
import { createOrder, verifyPaymentSignature } from "../platform/razorpay";
import { applyCapturedPayment } from "../platform/licence-payment";

export type PaymentActionState = { error: string } | null;

// ══ Studio-owner-facing: buy/renew a licence via Razorpay ═════════════════

export type CreateOrderResult =
  | { error: string }
  | { orderId: string; amountPaise: number; currency: string; keyId: string };

/**
 * Called from the client (UpgradeLicenceButton) before opening Razorpay
 * Checkout. Verifies the caller is really an ACTIVE OWNER of `studioId`
 * via the RLS-scoped client (studio_memberships' own "self read" policy
 * only ever returns the caller's real membership row — this can't be
 * spoofed by client-supplied data), since the `payments` table itself
 * grants no authenticated insert policy to lean on instead (see
 * 0010_payments.sql's header comment).
 */
export async function createLicenceOrder(studioId: string, plan: "STANDARD" | "PREMIUM", seats: number): Promise<CreateOrderResult> {
  if (!Number.isInteger(seats) || seats < 1) return { error: "Seats must be a positive whole number." };

  const platform = await createPlatformClient();
  const {
    data: { user },
  } = await platform.auth.getUser();
  if (!user) return { error: "Sign in to the AORMS Platform first." };

  const { data: membership } = await platform
    .from("studio_memberships")
    .select("role, status")
    .eq("studio_id", studioId)
    .eq("account_id", user.id)
    .maybeSingle();
  if (!membership || membership.role !== "OWNER" || membership.status !== "ACTIVE") {
    return { error: "Only a studio's owner can purchase a licence for it." };
  }

  const { data: pricing, error: pricingError } = await platform
    .from("plan_pricing")
    .select("price_per_seat_paise")
    .eq("plan", plan)
    .maybeSingle();
  if (pricingError) return { error: pricingError.message };
  if (!pricing) return { error: `No pricing configured for ${plan} yet — contact support.` };

  const amountPaise = pricing.price_per_seat_paise * seats;
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId) return { error: "Payments aren't configured yet." };

  let order;
  try {
    order = await createOrder({ amountPaise, receipt: `studio_${studioId}_${Date.now()}` });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't reach the payment gateway." };
  }

  const platformService = createPlatformServiceRoleClient();
  const { error: insertError } = await platformService.from("payments").insert({
    studio_id: studioId,
    account_id: user.id,
    plan,
    seats,
    amount_paise: amountPaise,
    currency: "INR",
    razorpay_order_id: order.id,
    status: "CREATED",
  });
  if (insertError) return { error: insertError.message };

  return { orderId: order.id, amountPaise, currency: "INR", keyId };
}

/**
 * Fast-path UX only, called from Checkout.js's client-side success
 * handler — NOT the durable source of truth. Verifies the signature, then
 * applies the licence update only if the webhook (app/api/razorpay/
 * webhook/route.ts) hasn't already done so — idempotent either way, so
 * whichever of the two paths runs first "wins" and the other is a no-op.
 * Never trust the browser alone to confirm a payment happened; this
 * exists purely so the UI can say "activated" without waiting on webhook
 * delivery latency.
 */
export async function confirmPaymentClientSide(orderId: string, paymentId: string, signature: string): Promise<PaymentActionState> {
  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    return { error: "Payment signature didn't verify." };
  }

  const platformService = createPlatformServiceRoleClient();
  const { data: payment, error: fetchError } = await platformService
    .from("payments")
    .select("id, studio_id, plan, seats, status")
    .eq("razorpay_order_id", orderId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!payment) return { error: "No matching order found." };

  // Already applied by the webhook (or a prior call to this same action) —
  // a no-op, not an error.
  if (payment.status === "CAPTURED") {
    revalidatePath("/licences");
    return null;
  }

  await applyCapturedPayment(platformService, { ...payment, razorpay_payment_id: paymentId });
  revalidatePath("/licences");
  return null;
}

// ══ Platform-admin-only: override a licence, edit pricing ═════════════════

async function requirePlatformAdmin(): Promise<{ error: string } | null> {
  const account = await getCurrentPlatformAccount();
  if (!account) return { error: "Sign in to the AORMS Platform first." };
  if (!account.is_admin) return { error: "Admin access required." };
  return null;
}

/**
 * Replaces the old self-serve updateLicence (removed from
 * lib/actions/platform.ts alongside 0011's RLS change). Uses the
 * RLS-scoped platform client, not service-role: the new "licences: admin
 * update" policy (is_platform_admin()) is the real enforcement here,
 * matching how every other owner-gated mutation in this codebase already
 * relies on its RLS policy rather than an app-level bypass — the
 * requirePlatformAdmin() check above exists only to return a clean error
 * message instead of a raw Postgres RLS-denial for a non-admin caller.
 */
export async function adminUpdateLicence(_prev: PaymentActionState, formData: FormData): Promise<PaymentActionState> {
  const gate = await requirePlatformAdmin();
  if (gate) return gate;

  const studioId = String(formData.get("studioId") ?? "");
  const plan = String(formData.get("plan") ?? "");
  const seatsRaw = String(formData.get("seats") ?? "");
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
  if (!studioId) return { error: "Missing studio." };
  if (!["TRIAL", "STANDARD", "PREMIUM"].includes(plan)) return { error: "Invalid plan." };
  const seats = Number(seatsRaw);
  if (!Number.isInteger(seats) || seats < 1) return { error: "Seats must be a positive whole number." };

  const platform = await createPlatformClient();
  const { error } = await platform
    .from("licences")
    .update({ plan, seats, expires_at: expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null })
    .eq("studio_id", studioId);
  if (error) return { error: error.message };

  revalidatePath("/admin/licences");
  return null;
}

export async function adminSetPricing(_prev: PaymentActionState, formData: FormData): Promise<PaymentActionState> {
  const gate = await requirePlatformAdmin();
  if (gate) return gate;

  const plan = String(formData.get("plan") ?? "");
  const priceRaw = String(formData.get("pricePerSeatRupees") ?? "");
  if (!["STANDARD", "PREMIUM"].includes(plan)) return { error: "Invalid plan." };
  const priceRupees = Number(priceRaw);
  if (!Number.isFinite(priceRupees) || priceRupees <= 0) return { error: "Enter a price greater than zero." };

  const platform = await createPlatformClient();
  const { error } = await platform
    .from("plan_pricing")
    .update({ price_per_seat_paise: Math.round(priceRupees * 100), updated_at: new Date().toISOString() })
    .eq("plan", plan);
  if (error) return { error: error.message };

  revalidatePath("/admin/pricing");
  return null;
}
