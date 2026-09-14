"use server";

/**
 * AORMS Platform — Company (material supplier) Server Actions. Phase B of
 * the Studio/Company split + Material Catalogue plan: a Company is a
 * genuinely new entity from the architecture-firm "Studio" (see
 * web/lib/actions/platform.ts).
 *
 * **2026-09-14 update — Company/ConnectDeX identity split (platform
 * migration 0024):** the "same underlying accounts/auth.users, one person
 * can belong to Studios *and* Companies" note this comment used to carry is
 * no longer true, by explicit user direction ("Split Company users too,
 * accept the tradeoff"). Company members now live in their own
 * `company_accounts` table (AORMS-CU- handles), separate from `accounts`
 * (AORMS-U-, Studio/Identity) — a person needs a genuinely separate login
 * for each. `company_memberships.account_id` still references `auth.uid()`
 * values identically (RLS policies below are unaffected), it's just the FK
 * target and the handle namespace that changed.
 *
 * **2026-09-14, same day — ConnectDeX/Company schema split (platform
 * migration 0025):** every table this file touches now lives in its own
 * `connectdex` Postgres schema, not `public` — a namespace-only move (see
 * the migration's own header comment) preparing for a future physical
 * split into a separate Supabase project. Every call below goes through
 * `.schema("connectdex")` first.
 *
 * Same house style as platform.ts throughout: errors as {error} objects,
 * never thrown; revalidatePath before a successful return; no write_audit
 * (platform-side, no audit_log table there).
 */
import { revalidatePath } from "next/cache";
import { createClient as createPlatformClient } from "../platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";
import type { PlatformActionState } from "./platform";
import { toSafeErrorMessage } from "../security/safe-error";

// Instant self-serve company creation (createCompany) was removed here
// 2026-09-10 when the ConnectDeX Partners gated onboarding pipeline
// replaced it entirely — platform/supabase/migrations/
// 0013_connectdex_onboarding.sql dropped the RLS policy this action
// relied on ("companies: self insert"). Replaced by
// web/lib/actions/connectdex.ts's submitConnectDexApplication (public
// connect form) → adminInviteConnectDexApplication (the only remaining
// path that creates a companies row).

/**
 * Self-serve join by AORMS-C- handle — same upsert-not-insert reasoning
 * as joinStudio (web/lib/actions/platform.ts): `(account_id, company_id)`
 * is unique, so re-joining after leaving needs an upsert to resurrect the
 * row instead of hitting a duplicate-key error.
 *
 * 2026-09-14 (Company/ConnectDeX identity split): `company_memberships.
 * account_id` now references `company_accounts`, not `accounts` — the
 * caller's session must already be a Company identity (minted only via
 * adminInviteConnectDexApplication) or the upsert below fails on the FK.
 * Checked explicitly first so an AORMS Identity/Studio user gets a clear
 * explanation instead of a raw constraint-violation error.
 */
export async function joinCompany(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const handle = String(formData.get("handle") ?? "").trim().toUpperCase();
  if (!handle) return { error: "Enter the company's AORMS-C- handle." };

  const supabase = await createPlatformClient();
  const cx = supabase.schema("connectdex");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to the AORMS Platform first." };

  const { data: companyAccount } = await cx.from("company_accounts").select("id").eq("id", user.id).maybeSingle();
  if (!companyAccount) {
    return {
      error:
        "This login is an AORMS Identity account, not a Company account. Company (ConnectDeX) membership needs a separate account — ask an AORMS admin to invite your company email.",
    };
  }

  const { data: company, error: lookupError } = await cx
    .from("companies")
    .select("id")
    .eq("public_id", handle)
    .maybeSingle();
  if (lookupError) return { error: toSafeErrorMessage(lookupError) };
  if (!company) return { error: `No company found with handle ${handle}.` };

  const { error } = await cx.from("company_memberships").upsert(
    {
      account_id: user.id,
      company_id: company.id,
      role: "MEMBER",
      status: "ACTIVE",
      activated_at: new Date().toISOString(),
      left_at: null,
    },
    { onConflict: "account_id,company_id" },
  );
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath("/identity");
  return null;
}

/**
 * 2026-09-14 (Company/ConnectDeX identity split): looks up an AORMS-CU-
 * handle in `company_accounts` now, not an AORMS-U- handle in `accounts` —
 * the person being invited must already hold a Company identity (there's
 * no self-serve Company signup; see adminInviteConnectDexApplication for
 * the one path that mints one).
 */
export async function inviteCompanyMember(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const companyId = String(formData.get("companyId") ?? "");
  const handle = String(formData.get("handle") ?? "").trim().toUpperCase();
  if (!companyId || !handle) return { error: "Missing company or handle." };

  const platformService = createPlatformServiceRoleClient();
  const { data: account, error: lookupError } = await platformService
    .schema("connectdex")
    .from("company_accounts")
    .select("id")
    .eq("public_id", handle)
    .maybeSingle();
  if (lookupError) return { error: toSafeErrorMessage(lookupError) };
  if (!account) return { error: `No AORMS Company account found with handle ${handle}.` };

  const supabase = await createPlatformClient();
  const { error } = await supabase.schema("connectdex").from("company_memberships").upsert(
    {
      account_id: account.id,
      company_id: companyId,
      role: "MEMBER",
      status: "ACTIVE",
      activated_at: new Date().toISOString(),
      left_at: null,
    },
    { onConflict: "account_id,company_id" },
  );
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath(`/companies/${companyId}`);
  return null;
}

export async function updateCompanyMembershipRole(membershipId: string, role: "OWNER" | "MEMBER"): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { data: membership, error } = await supabase
    .schema("connectdex")
    .from("company_memberships")
    .update({ role })
    .eq("id", membershipId)
    .select("company_id")
    .single();
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath(`/companies/${membership.company_id}`);
  return {};
}

export async function leaveCompany(membershipId: string): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { error } = await supabase
    .schema("connectdex")
    .from("company_memberships")
    .update({ status: "LEFT", left_at: new Date().toISOString() })
    .eq("id", membershipId);
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath("/identity");
  return {};
}

// ── Company profile (GST/tax/address) ────────────────────────────────────

export async function updateCompanyProfile(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const companyId = String(formData.get("companyId") ?? "");
  if (!companyId) return { error: "Missing company." };

  const supabase = await createPlatformClient();
  const { error } = await supabase
    .schema("connectdex")
    .from("companies")
    .update({
      gstin: String(formData.get("gstin") ?? "").trim() || null,
      pan: String(formData.get("pan") ?? "").trim() || null,
      cin: String(formData.get("cin") ?? "").trim() || null,
      gst_type: String(formData.get("gstType") ?? "REGULAR"),
      tds_applicable_default: formData.get("tdsApplicableDefault") === "on",
      address_line1: String(formData.get("addressLine1") ?? "").trim() || null,
      address_line2: String(formData.get("addressLine2") ?? "").trim() || null,
      city: String(formData.get("city") ?? "").trim() || null,
      district: String(formData.get("district") ?? "").trim() || null,
      state: String(formData.get("state") ?? "").trim() || null,
      pincode: String(formData.get("pincode") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
    })
    .eq("id", companyId);
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath(`/companies/${companyId}`);
  return null;
}

// ── Board of directors ───────────────────────────────────────────────────

export async function addCompanyBoardMember(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const companyId = String(formData.get("companyId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!companyId || !fullName) return { error: "Name is required." };

  const supabase = await createPlatformClient();
  const { error } = await supabase.schema("connectdex").from("company_board_members").insert({
    company_id: companyId,
    full_name: fullName,
    din: String(formData.get("din") ?? "").trim() || null,
    designation: String(formData.get("designation") ?? "").trim() || null,
    appointed_at: String(formData.get("appointedAt") ?? "").trim() || null,
  });
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath(`/companies/${companyId}`);
  return null;
}

export async function updateCompanyBoardMember(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const boardMemberId = String(formData.get("boardMemberId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!boardMemberId || !companyId || !fullName) return { error: "Name is required." };

  const supabase = await createPlatformClient();
  const { error } = await supabase
    .schema("connectdex")
    .from("company_board_members")
    .update({
      full_name: fullName,
      din: String(formData.get("din") ?? "").trim() || null,
      designation: String(formData.get("designation") ?? "").trim() || null,
      appointed_at: String(formData.get("appointedAt") ?? "").trim() || null,
    })
    .eq("id", boardMemberId);
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath(`/companies/${companyId}`);
  return null;
}

export async function removeCompanyBoardMember(boardMemberId: string, companyId: string): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { error } = await supabase.schema("connectdex").from("company_board_members").delete().eq("id", boardMemberId);
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath(`/companies/${companyId}`);
  return {};
}

// ── "Who's who" — key contacts ───────────────────────────────────────────

export async function addCompanyContact(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const companyId = String(formData.get("companyId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!companyId || !fullName) return { error: "Name is required." };

  const supabase = await createPlatformClient();
  const { error } = await supabase.schema("connectdex").from("company_contacts").insert({
    company_id: companyId,
    full_name: fullName,
    role_title: String(formData.get("roleTitle") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    is_primary: formData.get("isPrimary") === "on",
  });
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath(`/companies/${companyId}`);
  return null;
}

export async function updateCompanyContact(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const contactId = String(formData.get("contactId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!contactId || !companyId || !fullName) return { error: "Name is required." };

  const supabase = await createPlatformClient();
  const { error } = await supabase
    .schema("connectdex")
    .from("company_contacts")
    .update({
      full_name: fullName,
      role_title: String(formData.get("roleTitle") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      is_primary: formData.get("isPrimary") === "on",
    })
    .eq("id", contactId);
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath(`/companies/${companyId}`);
  return null;
}

export async function removeCompanyContact(contactId: string, companyId: string): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { error } = await supabase.schema("connectdex").from("company_contacts").delete().eq("id", contactId);
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath(`/companies/${companyId}`);
  return {};
}
