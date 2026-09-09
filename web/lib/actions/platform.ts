"use server";

/**
 * AORMS Platform integration — Server Actions bridging web/'s own
 * single-tenant app to the separate central identity/licensing Supabase
 * project (platform/supabase/). See the AORMS Platform plan, the Studio/
 * Company split + Material Catalogue plan, and docs/esti/AORMS-IDENTITY.md
 * for the design.
 *
 * Naming: "Studio" = an architecture firm (was "Company" until the
 * 2026-09-07 rename — platform/supabase/migrations/0006_rename_
 * companies_to_studios.sql); "Company" now means a material-supplier
 * business (Phase B of that same plan). Every Studio-side action below is
 * named accordingly so it can't collide with the real Company actions
 * that follow it in this same file.
 *
 * House style matches web/lib/actions/clients.ts and auth.ts exactly:
 * errors are returned as {error} objects, never thrown; revalidatePath
 * runs right before a successful return. The one deliberate deviation:
 * platform-side mutations (signup/studio create/join/leave) don't call
 * write_audit — that RPC only exists on web/'s own project, and the
 * platform project has no audit_log table of its own (out of scope for
 * this pass). linkPlatformIdentity DOES call it, since that mutation
 * writes to web/'s own profiles table.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createWebClient } from "../supabase/server";
import { createServiceRoleClient as createWebServiceRoleClient } from "../supabase/service";
import { createClient as createPlatformClient } from "../platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";

export type PlatformActionState = { error: string } | null;

// ── Platform auth (separate login from the firm app's own) ────────────────

export async function platformSignUp(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!fullName) return { error: "Full name is required." };
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createPlatformClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: error.message };

  redirect("/identity");
}

export async function platformSignIn(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createPlatformClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect("/identity");
}

export async function platformSignOut(): Promise<void> {
  const supabase = await createPlatformClient();
  await supabase.auth.signOut();
  redirect("/identity");
}

// ── Linking a firm login to a portable AORMS-U- identity ───────────────────

/**
 * Verifies `handle` exists on the platform project (service-role lookup —
 * the web/ user isn't necessarily signed into the platform in this browser
 * tab), then stores it on the current web/ user's own profile row.
 *
 * Uses web/'s service-role client for the profiles update, not the regular
 * RLS-scoped one: migration 0001's "profiles: owner manages" policy only
 * lets an OWNER update ANY profile row (including their own) — there's no
 * "update own profile" policy for other roles. Linking your own identity
 * should work for every role, not just OWNER, and the row being updated is
 * always the caller's own (resolved from their session, never from client
 * input), so bypassing RLS here carries no privilege-escalation risk —
 * same justification web/lib/supabase/service.ts's existing use documents.
 */
export async function linkPlatformIdentity(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const handle = String(formData.get("handle") ?? "").trim().toUpperCase();
  if (!handle) return { error: "Enter your AORMS-U- handle." };

  const webSupabase = await createWebClient();
  const {
    data: { user },
  } = await webSupabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const platformService = createPlatformServiceRoleClient();
  const { data: account, error: lookupError } = await platformService
    .from("accounts")
    .select("public_id")
    .eq("public_id", handle)
    .maybeSingle();
  if (lookupError) return { error: lookupError.message };
  if (!account) return { error: `No AORMS Platform account found with handle ${handle}.` };

  const webService = createWebServiceRoleClient();
  const { error: updateError } = await webService
    .from("profiles")
    .update({ platform_public_id: account.public_id })
    .eq("id", user.id);
  if (updateError) return { error: updateError.message };

  await webSupabase.rpc("write_audit", {
    p_entity: "profile",
    p_entity_id: user.id,
    p_action: "UPDATE",
    p_before: null,
    p_after: { platform_public_id: account.public_id },
  });

  revalidatePath("/identity");
  return null;
}

// ══ STUDIOS (architecture firms) ═══════════════════════════════════════

export async function createStudio(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Studio name is required." };

  const supabase = await createPlatformClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to the AORMS Platform first." };

  // owner_id = auth.uid() satisfies "studios: self insert"; the
  // before_studio_insert/after_studio_insert triggers mint the AORMS-S-
  // handle and the founding OWNER membership automatically.
  const { error } = await supabase.from("studios").insert({ name, owner_id: user.id });
  if (error) return { error: error.message };

  revalidatePath("/identity");
  return null;
}

/**
 * Self-serve join by AORMS-S- handle, landing straight at ACTIVE — no
 * INVITED/owner-approval step in this pass (docs/esti/AORMS-IDENTITY.md's
 * domain-match-vs-pending-approval nuance is a deliberate simplification
 * left for later, matching how web/lib/actions/users.ts already flags the
 * "invite a new staff member" gap as a known follow-up rather than a bug).
 *
 * upsert, not insert: `(account_id, studio_id)` is unique, so a plain
 * insert fails with a duplicate-key error for anyone who previously left
 * this studio (their row still exists, status LEFT) — found live while
 * testing the leave flow. onConflict resurrects that row back to ACTIVE
 * instead of erroring; "studio_memberships: self insert"/"self update
 * (leave)" RLS covers the insert and the ON CONFLICT DO UPDATE path
 * respectively.
 */
export async function joinStudio(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const handle = String(formData.get("handle") ?? "").trim().toUpperCase();
  if (!handle) return { error: "Enter the studio's AORMS-S- handle." };

  const supabase = await createPlatformClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to the AORMS Platform first." };

  const { data: studio, error: lookupError } = await supabase
    .from("studios")
    .select("id")
    .eq("public_id", handle)
    .maybeSingle();
  if (lookupError) return { error: lookupError.message };
  if (!studio) return { error: `No studio found with handle ${handle}.` };

  const { error } = await supabase.from("studio_memberships").upsert(
    {
      account_id: user.id,
      studio_id: studio.id,
      role: "MEMBER",
      status: "ACTIVE",
      activated_at: new Date().toISOString(),
      left_at: null,
    },
    { onConflict: "account_id,studio_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/identity");
  return null;
}

/**
 * OWNER-only (enforced by "studio_memberships: owner insert (invite)"
 * RLS, not app code). Looks the invitee up by handle via the service-role
 * client — "accounts: self read" only lets someone read their own row, so
 * an owner can't resolve another handle to an id through the RLS-scoped
 * client — then inserts the membership through the caller's own
 * RLS-scoped client so the actual authorization check (is this caller
 * really this studio's owner?) is the database's, not this function's.
 * Lands straight at ACTIVE, same simplification as joinStudio — no
 * separate accept-invite step in this pass.
 *
 * upsert, not insert — same reason as joinStudio: re-inviting someone who
 * previously left hits the `(account_id, studio_id)` unique constraint on
 * a plain insert. "studio_memberships: owner insert (invite)"/"owner
 * update" RLS covers the insert and ON CONFLICT DO UPDATE paths.
 */
export async function inviteStudioMember(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const studioId = String(formData.get("studioId") ?? "");
  const handle = String(formData.get("handle") ?? "").trim().toUpperCase();
  if (!studioId || !handle) return { error: "Missing studio or handle." };

  const platformService = createPlatformServiceRoleClient();
  const { data: account, error: lookupError } = await platformService
    .from("accounts")
    .select("id")
    .eq("public_id", handle)
    .maybeSingle();
  if (lookupError) return { error: lookupError.message };
  if (!account) return { error: `No AORMS Platform account found with handle ${handle}.` };

  const supabase = await createPlatformClient();
  const { error } = await supabase.from("studio_memberships").upsert(
    {
      account_id: account.id,
      studio_id: studioId,
      role: "MEMBER",
      status: "ACTIVE",
      activated_at: new Date().toISOString(),
      left_at: null,
    },
    { onConflict: "account_id,studio_id" },
  );
  if (error) return { error: error.message };

  revalidatePath(`/studios/${studioId}`);
  return null;
}

export async function updateStudioMembershipRole(membershipId: string, role: "OWNER" | "MEMBER"): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { data: membership, error } = await supabase
    .from("studio_memberships")
    .update({ role })
    .eq("id", membershipId)
    .select("studio_id")
    .single();
  if (error) return { error: error.message };

  revalidatePath(`/studios/${membership.studio_id}`);
  return {};
}

export async function leaveStudio(membershipId: string): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { error } = await supabase
    .from("studio_memberships")
    .update({ status: "LEFT", left_at: new Date().toISOString() })
    .eq("id", membershipId);
  if (error) return { error: error.message };

  revalidatePath("/identity");
  return {};
}

// ── Studio profile (COA/GST/tax/address) ────────────────────────────────

/**
 * Owner-only (enforced by the "studios: owner update" RLS policy added in
 * migration 0003_company_profile.sql, since renamed in 0006). This is the
 * data that used to live only in web/'s own `firm` table — Firm Settings
 * now mirrors it read-only and links here to actually edit it.
 */
export async function updateStudioProfile(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const studioId = String(formData.get("studioId") ?? "");
  if (!studioId) return { error: "Missing studio." };

  const supabase = await createPlatformClient();
  const { error } = await supabase
    .from("studios")
    .update({
      coa_registration_no: String(formData.get("coaRegistrationNo") ?? "").trim() || null,
      gstin: String(formData.get("gstin") ?? "").trim() || null,
      pan: String(formData.get("pan") ?? "").trim() || null,
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
    .eq("id", studioId);
  if (error) return { error: error.message };

  revalidatePath(`/studios/${studioId}`);
  return null;
}

// ── Board of directors ───────────────────────────────────────────────────

export async function addStudioBoardMember(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const studioId = String(formData.get("studioId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!studioId || !fullName) return { error: "Name is required." };

  const supabase = await createPlatformClient();
  const { error } = await supabase.from("studio_board_members").insert({
    studio_id: studioId,
    full_name: fullName,
    din: String(formData.get("din") ?? "").trim() || null,
    designation: String(formData.get("designation") ?? "").trim() || null,
    appointed_at: String(formData.get("appointedAt") ?? "").trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/studios/${studioId}`);
  return null;
}

export async function updateStudioBoardMember(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const boardMemberId = String(formData.get("boardMemberId") ?? "");
  const studioId = String(formData.get("studioId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!boardMemberId || !studioId || !fullName) return { error: "Name is required." };

  const supabase = await createPlatformClient();
  const { error } = await supabase
    .from("studio_board_members")
    .update({
      full_name: fullName,
      din: String(formData.get("din") ?? "").trim() || null,
      designation: String(formData.get("designation") ?? "").trim() || null,
      appointed_at: String(formData.get("appointedAt") ?? "").trim() || null,
    })
    .eq("id", boardMemberId);
  if (error) return { error: error.message };

  revalidatePath(`/studios/${studioId}`);
  return null;
}

export async function removeStudioBoardMember(boardMemberId: string, studioId: string): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { error } = await supabase.from("studio_board_members").delete().eq("id", boardMemberId);
  if (error) return { error: error.message };

  revalidatePath(`/studios/${studioId}`);
  return {};
}

// ── "Who's who" — key contacts ───────────────────────────────────────────

export async function addStudioContact(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const studioId = String(formData.get("studioId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!studioId || !fullName) return { error: "Name is required." };

  const supabase = await createPlatformClient();
  const { error } = await supabase.from("studio_contacts").insert({
    studio_id: studioId,
    full_name: fullName,
    role_title: String(formData.get("roleTitle") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    is_primary: formData.get("isPrimary") === "on",
  });
  if (error) return { error: error.message };

  revalidatePath(`/studios/${studioId}`);
  return null;
}

export async function updateStudioContact(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const contactId = String(formData.get("contactId") ?? "");
  const studioId = String(formData.get("studioId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!contactId || !studioId || !fullName) return { error: "Name is required." };

  const supabase = await createPlatformClient();
  const { error } = await supabase
    .from("studio_contacts")
    .update({
      full_name: fullName,
      role_title: String(formData.get("roleTitle") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      is_primary: formData.get("isPrimary") === "on",
    })
    .eq("id", contactId);
  if (error) return { error: error.message };

  revalidatePath(`/studios/${studioId}`);
  return null;
}

export async function removeStudioContact(contactId: string, studioId: string): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { error } = await supabase.from("studio_contacts").delete().eq("id", contactId);
  if (error) return { error: error.message };

  revalidatePath(`/studios/${studioId}`);
  return {};
}

// ── Licence management (Studio-scoped only in this pass — Companies/
// suppliers don't get licence management here, an explicit, disclosed
// scope boundary, not an oversight) ─────────────────────────────────────

/**
 * Owner-only (enforced by "licences: owner update" RLS). No billing/
 * payment integration exists in this stack — the owner self-serves
 * plan/seats/expiry directly, same trust model as every other owner-only
 * mutation in this system so far.
 */
// Self-serve licence editing (owner could set plan/seats/expires_at
// directly, no payment involved) was removed here 2026-09-09 when real
// Razorpay payments landed — platform/supabase/migrations/
// 0011_licence_payment_gate.sql dropped the RLS policy this action relied
// on. Replaced by lib/actions/platform-payments.ts's createLicenceOrder
// (owner-facing, via Razorpay Checkout) and adminUpdateLicence
// (platform-admin override) — see that file's header comment.

// ── Usage heartbeat ──────────────────────────────────────────────────────

/**
 * No-ops (returns {ok:false} silently, not an error) when the current web/
 * user hasn't linked a platform identity yet — hours only ever accrue
 * after a one-time link, matching the AORMS Platform plan's "link, don't
 * merge" design. Runs entirely server-side via the platform's service-role
 * client, so it works with no platform session cookie present in this
 * browser tab. `seconds` is clamped to the same [1,120] range the
 * usage_heartbeats CHECK constraint enforces, so a misbehaving client
 * can't claim an outsized beat.
 */
export async function recordHeartbeat(seconds: number = 60): Promise<{ ok: boolean; error?: string }> {
  const clamped = Math.max(1, Math.min(120, Math.round(seconds)));

  const webSupabase = await createWebClient();
  const {
    data: { user },
  } = await webSupabase.auth.getUser();
  if (!user) return { ok: false };

  const { data: profile } = await webSupabase
    .from("profiles")
    .select("platform_public_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.platform_public_id) return { ok: false };

  const platformService = createPlatformServiceRoleClient();
  const { data: account, error: lookupError } = await platformService
    .from("accounts")
    .select("id")
    .eq("public_id", profile.platform_public_id)
    .maybeSingle();
  if (lookupError || !account) return { ok: false, error: lookupError?.message };

  const { error } = await platformService
    .from("usage_heartbeats")
    .insert({ account_id: account.id, seconds: clamped });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
