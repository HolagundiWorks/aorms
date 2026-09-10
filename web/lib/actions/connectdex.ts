"use server";

/**
 * ConnectDeX Partners — gated onboarding pipeline (2026-09-10), replacing
 * Company's instant self-serve creation entirely. See
 * platform/supabase/migrations/0013_connectdex_onboarding.sql for the
 * full schema/design account. Flow: a public connect form
 * (submitConnectDexApplication) → an admin reviews and invites
 * (adminInviteConnectDexApplication — Supabase's own inviteUserByEmail,
 * same pattern as web/lib/actions/portal-invites.ts) → the invitee logs
 * in and fills a fuller onboarding form (submitConnectDexOnboardingForm)
 * → an admin manually verifies (adminVerifyConnectDexCompany) → the
 * company pays a flat Razorpay fee (createConnectDexOnboardingOrder +
 * confirmConnectDexPaymentClientSide, mirroring lib/actions/
 * platform-payments.ts's Studio licence flow almost exactly) → ACTIVE.
 *
 * Same house style as platform.ts/company.ts/platform-payments.ts
 * throughout: errors as {error}, revalidatePath before a successful
 * return.
 */
import { revalidatePath } from "next/cache";
import { createClient as createPlatformClient } from "../platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../platform/account";
import { createOrder, verifyPaymentSignature } from "../platform/razorpay";
import { applyCapturedConnectDexPayment } from "../platform/connectdex-payment";

export type ConnectDexActionState = { error: string; success?: undefined } | { success: string; error?: undefined } | null;

// ══ Public: the connect form ═══════════════════════════════════════════

/**
 * No auth — a prospective partner has no account yet. Inserts via the
 * platform service-role client; connectdex_applications grants zero
 * authenticated write policies (there's no session to scope one to
 * anyway), matching payments' own "service-role only" precedent.
 *
 * No anti-spam/rate-limiting in this pass — an explicit scope boundary,
 * not silently gold-plated; every submission lands as PENDING for an
 * admin to triage either way.
 */
export async function submitConnectDexApplication(_prev: ConnectDexActionState, formData: FormData): Promise<ConnectDexActionState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!companyName) return { error: "Company name is required." };
  if (!contactName) return { error: "Contact name is required." };
  if (!email || !email.includes("@")) return { error: "Enter a valid email address." };
  if (!["BUILDING_MATERIAL", "INTERIOR_MATERIAL", "FINISH", "OTHER"].includes(category)) return { error: "Pick a category." };

  const platformService = createPlatformServiceRoleClient();
  const { error } = await platformService.from("connectdex_applications").insert({
    company_name: companyName,
    contact_name: contactName,
    email,
    phone: phone || null,
    city: city || null,
    state: state || null,
    category,
    message: message || null,
  });
  if (error) return { error: error.message };

  return { success: "Thanks — we'll review your application and be in touch." };
}

// ══ Platform-admin-only: review applications, verify, set the fee ═══════

async function requirePlatformAdmin(): Promise<{ error: string } | null> {
  const account = await getCurrentPlatformSessionAccount();
  if (!account) return { error: "Sign in to the AORMS Platform first." };
  if (!isSuperAdmin(account)) return { error: "Admin access required." };
  return null;
}

/**
 * Invites the applicant (Supabase's own inviteUserByEmail — creates the
 * auth.users row, firing handle_new_platform_account()'s trigger which
 * mints an AORMS-U- handle immediately; emails a link to set a password)
 * and creates the companies row directly — before_company_insert/
 * after_company_insert (platform/supabase/migrations/0001_core.sql,
 * 0007_supplier_companies.sql) still mint the AORMS-C- handle and
 * founding OWNER membership automatically, unchanged, just triggered by
 * this admin action's insert instead of a user's own.
 */
export async function adminInviteConnectDexApplication(applicationId: string): Promise<ConnectDexActionState> {
  const gate = await requirePlatformAdmin();
  if (gate) return gate;

  const platformService = createPlatformServiceRoleClient();
  const { data: application, error: fetchError } = await platformService
    .from("connectdex_applications")
    .select("company_name, contact_name, email, status")
    .eq("id", applicationId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!application) return { error: "Application not found." };
  if (application.status !== "PENDING") return { error: "This application has already been actioned." };

  const { data: invited, error: inviteError } = await platformService.auth.admin.inviteUserByEmail(application.email, {
    data: { full_name: application.contact_name },
  });
  if (inviteError) return { error: inviteError.message };

  const { data: company, error: companyError } = await platformService
    .from("companies")
    .insert({ name: application.company_name, owner_id: invited.user.id, status: "PENDING_ONBOARDING" })
    .select("id")
    .single();
  if (companyError) return { error: companyError.message };

  const account = await getCurrentPlatformSessionAccount();
  const { error: updateError } = await platformService
    .from("connectdex_applications")
    .update({ status: "INVITED", invited_account_id: invited.user.id, reviewed_at: new Date().toISOString(), reviewed_by_id: account?.id })
    .eq("id", applicationId);
  if (updateError) return { error: updateError.message };

  revalidatePath("/admin/connectdex");
  return { success: `Invited — Company ${company.id} created, pending onboarding.` };
}

export async function adminRejectConnectDexApplication(applicationId: string): Promise<ConnectDexActionState> {
  const gate = await requirePlatformAdmin();
  if (gate) return gate;

  const platformService = createPlatformServiceRoleClient();
  const account = await getCurrentPlatformSessionAccount();
  const { error } = await platformService
    .from("connectdex_applications")
    .update({ status: "REJECTED", reviewed_at: new Date().toISOString(), reviewed_by_id: account?.id })
    .eq("id", applicationId)
    .eq("status", "PENDING");
  if (error) return { error: error.message };

  revalidatePath("/admin/connectdex");
  return null;
}

/**
 * A manual judgment call, not an automated check — an admin looks at what
 * the onboarding form captured and flips the flag themselves.
 */
export async function adminVerifyConnectDexCompany(companyId: string): Promise<ConnectDexActionState> {
  const gate = await requirePlatformAdmin();
  if (gate) return gate;

  const account = await getCurrentPlatformSessionAccount();
  const platformService = createPlatformServiceRoleClient();
  const { error } = await platformService
    .from("companies")
    .update({ verified_at: new Date().toISOString(), verified_by_id: account?.id, status: "PENDING_PAYMENT" })
    .eq("id", companyId)
    .eq("status", "PENDING_VERIFICATION");
  if (error) return { error: error.message };

  revalidatePath("/admin/connectdex");
  return null;
}

export async function adminSetConnectDexFee(_prev: ConnectDexActionState, formData: FormData): Promise<ConnectDexActionState> {
  const gate = await requirePlatformAdmin();
  if (gate) return gate;

  const feeRaw = String(formData.get("feeRupees") ?? "");
  const feeRupees = Number(feeRaw);
  if (!Number.isFinite(feeRupees) || feeRupees <= 0) return { error: "Enter a fee greater than zero." };

  const platform = await createPlatformClient();
  const { error } = await platform
    .from("connectdex_settings")
    .update({ onboarding_fee_paise: Math.round(feeRupees * 100), updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return { error: error.message };

  revalidatePath("/admin/connectdex");
  return null;
}

// ══ Company-owner-facing: the onboarding form ════════════════════════════

/**
 * Uses the RLS-scoped platform client — "companies: owner update" (untouched
 * by 0013's migration, only "self insert" was dropped) is the real
 * enforcement here.
 */
export async function submitConnectDexOnboardingForm(_prev: ConnectDexActionState, formData: FormData): Promise<ConnectDexActionState> {
  const companyId = String(formData.get("companyId") ?? "");
  const gstin = String(formData.get("gstin") ?? "").trim();
  const pan = String(formData.get("pan") ?? "").trim();
  const addressLine1 = String(formData.get("addressLine1") ?? "").trim();
  const addressLine2 = String(formData.get("addressLine2") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!companyId) return { error: "Missing company." };
  if (!addressLine1 || !city || !state) return { error: "Address, city, and state are required." };

  const platform = await createPlatformClient();
  const { error } = await platform
    .from("companies")
    .update({
      gstin: gstin || null,
      pan: pan || null,
      address_line1: addressLine1,
      address_line2: addressLine2 || null,
      city,
      district: district || null,
      state,
      pincode: pincode || null,
      email: email || null,
      phone: phone || null,
      status: "PENDING_VERIFICATION",
    })
    .eq("id", companyId)
    .eq("status", "PENDING_ONBOARDING");
  if (error) return { error: error.message };

  revalidatePath(`/companies/${companyId}`);
  return null;
}

// ══ Company-owner-facing: pay the flat onboarding fee via Razorpay ══════

export type CreateConnectDexOrderResult =
  | { error: string }
  | { orderId: string; amountPaise: number; currency: string; keyId: string };

export async function createConnectDexOnboardingOrder(companyId: string): Promise<CreateConnectDexOrderResult> {
  const platform = await createPlatformClient();
  const {
    data: { user },
  } = await platform.auth.getUser();
  if (!user) return { error: "Sign in to the AORMS Platform first." };

  const { data: company } = await platform.from("companies").select("status").eq("id", companyId).maybeSingle();
  if (!company || company.status !== "PENDING_PAYMENT") return { error: "This company isn't ready for payment yet." };

  const { data: membership } = await platform
    .from("company_memberships")
    .select("role, status")
    .eq("company_id", companyId)
    .eq("account_id", user.id)
    .maybeSingle();
  if (!membership || membership.role !== "OWNER" || membership.status !== "ACTIVE") {
    return { error: "Only the company's owner can pay the onboarding fee." };
  }

  const { data: settings, error: settingsError } = await platform.from("connectdex_settings").select("onboarding_fee_paise").eq("id", true).maybeSingle();
  if (settingsError) return { error: settingsError.message };
  if (!settings) return { error: "Onboarding fee isn't configured yet — contact support." };

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId) return { error: "Payments aren't configured yet." };

  let order;
  try {
    order = await createOrder({ amountPaise: settings.onboarding_fee_paise, receipt: `connectdex_${companyId}_${Date.now()}` });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't reach the payment gateway." };
  }

  const platformService = createPlatformServiceRoleClient();
  const { error: insertError } = await platformService.from("connectdex_payments").insert({
    company_id: companyId,
    account_id: user.id,
    amount_paise: settings.onboarding_fee_paise,
    currency: "INR",
    razorpay_order_id: order.id,
    status: "CREATED",
  });
  if (insertError) return { error: insertError.message };

  return { orderId: order.id, amountPaise: settings.onboarding_fee_paise, currency: "INR", keyId };
}

/**
 * Fast-path UX only, same idempotency principle as
 * lib/actions/platform-payments.ts's confirmPaymentClientSide — the
 * webhook (app/api/razorpay/webhook/route.ts) is the durable source of
 * truth; whichever of the two applies the update first wins.
 */
export async function confirmConnectDexPaymentClientSide(orderId: string, paymentId: string, signature: string): Promise<ConnectDexActionState> {
  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    return { error: "Payment signature didn't verify." };
  }

  const platformService = createPlatformServiceRoleClient();
  const { data: payment, error: fetchError } = await platformService
    .from("connectdex_payments")
    .select("id, company_id, status")
    .eq("razorpay_order_id", orderId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!payment) return { error: "No matching order found." };

  if (payment.status === "CAPTURED") {
    revalidatePath(`/companies/${payment.company_id}`);
    return null;
  }

  await applyCapturedConnectDexPayment(platformService, { ...payment, razorpay_payment_id: paymentId });
  revalidatePath(`/companies/${payment.company_id}`);
  return null;
}
