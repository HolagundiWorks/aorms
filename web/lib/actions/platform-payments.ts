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
import { getCurrentPlatformAccount, getCurrentPlatformSessionAccount, isSuperAdmin } from "../platform/account";
import { createOrder, verifyPaymentSignature } from "../platform/razorpay";
import { applyCapturedPayment } from "../platform/licence-payment";
import { applyCapturedIdentityPayment } from "../platform/identity-payment";
import { toSafeErrorMessage } from "../security/safe-error";

export type PaymentActionState = { error: string } | null;

// ══ Studio-owner-facing: buy/renew a licence via Razorpay ═════════════════

export type CreateOrderResult =
  | { error: string }
  | { orderId: string; amountPaise: number; currency: string; keyId: string };

/** 2026-09-14 — real pricing restructure (platform migration 0033, see
 * docs/esti/ROADMAP.md's dated entry): Studio/Professional are flat
 * annual fees, self-serve via Razorpay Checkout; Enterprise moves to a
 * "Talk to AORMS" contact flow (a support-ticket submission, see
 * UpgradeLicenceButton.tsx) — no self-serve checkout amount, no
 * automatic minimum-member gate. Same seat-allotment reasoning as before
 * (`licences.seats`/`payments.seats` stay fixed-per-plan, not
 * buyer-chosen — assignProSeat/revokeProSeat still cap PRO-level grants
 * against this exact number): Studio includes 10 seats, Professional
 * 25 — the same team-member caps `STUDIO_MEMBER_CAP` (platform.ts)
 * enforces elsewhere, reused rather than duplicated. Enterprise's seat
 * allotment (9999, "effectively unlimited") is still set once a platform
 * admin grants it directly via adminUpdateLicence — unchanged. */
const PLAN_SEAT_ALLOTMENT: Record<"STUDIO" | "PROFESSIONAL", number> = { STUDIO: 10, PROFESSIONAL: 25 };

/**
 * Called from the client (UpgradeLicenceButton) before opening Razorpay
 * Checkout. Verifies the caller is really an ACTIVE OWNER of `studioId`
 * via the RLS-scoped client (studio_memberships' own "self read" policy
 * only ever returns the caller's real membership row — this can't be
 * spoofed by client-supplied data), since the `payments` table itself
 * grants no authenticated insert policy to lean on instead (see
 * 0010_payments.sql's header comment).
 */
export async function createLicenceOrder(studioId: string, plan: "STUDIO" | "PROFESSIONAL"): Promise<CreateOrderResult> {
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
    .select("base_price_paise")
    .eq("plan", plan)
    .maybeSingle();
  if (pricingError) return { error: toSafeErrorMessage(pricingError) };
  if (!pricing) return { error: `No pricing configured for ${plan} yet — contact support.` };

  const amountPaise = pricing.base_price_paise;
  const seats = PLAN_SEAT_ALLOTMENT[plan];
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
  if (insertError) return { error: toSafeErrorMessage(insertError) };

  return { orderId: order.id, amountPaise, currency: "INR", keyId };
}

/** 100 hours = 360000 seconds — matches the same threshold
 * apply_heartbeat() used to auto-flip level at (0002_usage_and_level.sql)
 * before 2026-09-13's correction removed that free flip; the number
 * itself is unchanged, only what it gates is different now. */
const IDENTITY_VERIFICATION_HOURS_REQUIRED = 100;
const IDENTITY_VERIFICATION_SECONDS_REQUIRED = IDENTITY_VERIFICATION_HOURS_REQUIRED * 60 * 60;

/**
 * The individual counterpart to createLicenceOrder — AORMS Identity, a
 * ONE-TIME ₹199 fee (2026-09-13: was a ₹599/year subscription; corrected
 * per the user's own "user accounts remain free" direction — see
 * platform/supabase/migrations/0018_identity_verification_pro_seats_
 * connectdex_tiers.sql's header for the full account), available only
 * once the account has logged 100 usage-hours, buying a PERMANENT
 * verified identity — never renews, never re-charges. No seats/studio-
 * ownership check at all. Resolves the caller's platform account via
 * getCurrentPlatformAccount() (the Office Hub session ->
 * profiles.platform_public_id -> platform accounts two-step, same one
 * /identity and /licences already use for their own read-only display)
 * rather than requiring a separate Platform sign-in the way
 * createLicenceOrder does — there's no studio_memberships RLS check to
 * satisfy here, so there's no reason to force a second sign-in just to
 * buy an individual plan the person can already see on /identity.
 */
export async function createIdentityOrder(): Promise<CreateOrderResult> {
  const account = await getCurrentPlatformAccount();
  if (!account) return { error: "Link your AORMS Identity first." };

  const platformService = createPlatformServiceRoleClient();

  const { data: accountUsage, error: usageError } = await platformService
    .from("accounts")
    .select("total_active_seconds")
    .eq("id", account.id)
    .maybeSingle();
  if (usageError) return { error: toSafeErrorMessage(usageError) };
  if (!accountUsage || accountUsage.total_active_seconds < IDENTITY_VERIFICATION_SECONDS_REQUIRED) {
    const hoursLogged = (accountUsage?.total_active_seconds ?? 0) / 3600;
    return {
      error: `Available once you've logged ${IDENTITY_VERIFICATION_HOURS_REQUIRED} hours — you're at ${hoursLogged.toFixed(1)}h.`,
    };
  }

  const { data: existingLicence, error: licenceError } = await platformService
    .from("identity_licences")
    .select("plan")
    .eq("account_id", account.id)
    .maybeSingle();
  if (licenceError) return { error: toSafeErrorMessage(licenceError) };
  if (existingLicence?.plan === "AORMS_IDENTITY") return { error: "Already verified — this is a one-time purchase." };

  const plan = "AORMS_IDENTITY" as const;
  const { data: pricing, error: pricingError } = await platformService
    .from("plan_pricing")
    .select("base_price_paise")
    .eq("plan", plan)
    .maybeSingle();
  if (pricingError) return { error: toSafeErrorMessage(pricingError) };
  if (!pricing) return { error: `No pricing configured for ${plan} yet — contact support.` };

  const amountPaise = pricing.base_price_paise;
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId) return { error: "Payments aren't configured yet." };

  let order;
  try {
    order = await createOrder({ amountPaise, receipt: `identity_${account.id}_${Date.now()}` });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't reach the payment gateway." };
  }

  const { error: insertError } = await platformService.from("identity_payments").insert({
    account_id: account.id,
    plan,
    amount_paise: amountPaise,
    currency: "INR",
    razorpay_order_id: order.id,
    status: "CREATED",
  });
  if (insertError) return { error: toSafeErrorMessage(insertError) };

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
  if (fetchError) return { error: toSafeErrorMessage(fetchError) };
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

/** Identity counterpart to confirmPaymentClientSide — same fast-path/
 * idempotent-against-the-webhook reasoning, calling
 * applyCapturedIdentityPayment instead. */
export async function confirmIdentityPaymentClientSide(orderId: string, paymentId: string, signature: string): Promise<PaymentActionState> {
  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    return { error: "Payment signature didn't verify." };
  }

  const platformService = createPlatformServiceRoleClient();
  const { data: payment, error: fetchError } = await platformService
    .from("identity_payments")
    .select("id, account_id, status")
    .eq("razorpay_order_id", orderId)
    .maybeSingle();
  if (fetchError) return { error: toSafeErrorMessage(fetchError) };
  if (!payment) return { error: "No matching order found." };

  if (payment.status === "CAPTURED") {
    revalidatePath("/identity");
    return null;
  }

  await applyCapturedIdentityPayment(platformService, { ...payment, razorpay_payment_id: paymentId });
  revalidatePath("/identity");
  return null;
}

// ══ Platform-admin-only: override a licence, edit pricing ═════════════════

async function requirePlatformAdmin(): Promise<{ error: string } | null> {
  const account = await getCurrentPlatformSessionAccount();
  if (!account) return { error: "Sign in to the AORMS Platform first." };
  if (!isSuperAdmin(account)) return { error: "Admin access required." };
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
  if (!["FREE", "STUDIO", "PROFESSIONAL", "ENTERPRISE"].includes(plan)) return { error: "Invalid plan." };
  const seats = Number(seatsRaw);
  // >= 0, not < 1 (2026-09-14 SysDeX audit fix) — a free-tier studio
  // legitimately has 0 PRO seats now (platform migration 0021); the
  // `licences_seats_check` constraint itself was widened to match.
  if (!Number.isInteger(seats) || seats < 0) return { error: "Seats must be zero or a positive whole number." };

  const platform = await createPlatformClient();
  const { error } = await platform
    .from("licences")
    .update({ plan, seats, expires_at: expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null })
    .eq("studio_id", studioId);
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath("/admin/licences");
  return null;
}

/**
 * 2026-09-13: sets two figures per plan — `basePriceRupees` (the flat
 * fee every plan has: annual for Studio/Professional/Enterprise, one-
 * time for Identity) and `pricePerSeatMonthlyRupees` (retained as a
 * field but always 0 for every plan as of 2026-09-14 — the per-seat-
 * monthly component was fully retired, migration 0019 — kept rather than
 * removed so a future per-seat plan doesn't need to re-litigate this
 * exact field). FREE is exempt from the "must be greater than zero"
 * check below — it's genuinely, permanently ₹0 (2026-09-14 pricing
 * restructure); this form still renders a row for it (SetPricingForm.tsx
 * disables its input) so an admin can see it listed, not edit it away
 * from zero.
 */
export async function adminSetPricing(_prev: PaymentActionState, formData: FormData): Promise<PaymentActionState> {
  const gate = await requirePlatformAdmin();
  if (gate) return gate;

  const plan = String(formData.get("plan") ?? "");
  const baseRaw = String(formData.get("basePriceRupees") ?? "");
  const perSeatRaw = String(formData.get("pricePerSeatMonthlyRupees") ?? "0");
  if (!["AORMS_IDENTITY", "FREE", "STUDIO", "PROFESSIONAL", "ENTERPRISE"].includes(plan)) return { error: "Invalid plan." };
  const baseRupees = Number(baseRaw);
  if (plan !== "FREE" && (!Number.isFinite(baseRupees) || baseRupees <= 0)) return { error: "Enter a base price greater than zero." };
  if (plan === "FREE" && baseRupees !== 0) return { error: "The Free plan's price is fixed at ₹0." };
  const perSeatRupees = Number(perSeatRaw || "0");
  if (!Number.isFinite(perSeatRupees) || perSeatRupees < 0) return { error: "Per-seat price can't be negative." };

  const platform = await createPlatformClient();
  const { error } = await platform
    .from("plan_pricing")
    .update({
      base_price_paise: Math.round(baseRupees * 100),
      price_per_seat_monthly_paise: Math.round(perSeatRupees * 100),
      updated_at: new Date().toISOString(),
    })
    .eq("plan", plan);
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath("/admin/pricing");
  return null;
}
