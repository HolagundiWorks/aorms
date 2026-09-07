"use server";

/**
 * AORMS Platform integration — Server Actions bridging web/'s own
 * single-tenant app to the separate central identity/licensing Supabase
 * project (platform/supabase/). See the AORMS Platform plan and
 * docs/esti/AORMS-IDENTITY.md for the design.
 *
 * House style matches web/lib/actions/clients.ts and auth.ts exactly:
 * errors are returned as {error} objects, never thrown; revalidatePath
 * runs right before a successful return. The one deliberate deviation:
 * platform-side mutations (signup/company create/join/leave) don't call
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

// ── Companies + memberships ─────────────────────────────────────────────

export async function createCompany(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Company name is required." };

  const supabase = await createPlatformClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to the AORMS Platform first." };

  // owner_id = auth.uid() satisfies "companies: self insert"; the
  // before_company_insert/after_company_insert triggers mint the
  // AORMS-C- handle and the founding OWNER membership automatically.
  const { error } = await supabase.from("companies").insert({ name, owner_id: user.id });
  if (error) return { error: error.message };

  revalidatePath("/identity");
  return null;
}

/**
 * Self-serve join by AORMS-C- handle, landing straight at ACTIVE — no
 * INVITED/owner-approval step in this pass (docs/esti/AORMS-IDENTITY.md's
 * domain-match-vs-pending-approval nuance is a deliberate simplification
 * left for later, matching how web/lib/actions/users.ts already flags the
 * "invite a new staff member" gap as a known follow-up rather than a bug).
 */
export async function joinCompany(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const handle = String(formData.get("handle") ?? "").trim().toUpperCase();
  if (!handle) return { error: "Enter the company's AORMS-C- handle." };

  const supabase = await createPlatformClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to the AORMS Platform first." };

  const { data: company, error: lookupError } = await supabase
    .from("companies")
    .select("id")
    .eq("public_id", handle)
    .maybeSingle();
  if (lookupError) return { error: lookupError.message };
  if (!company) return { error: `No company found with handle ${handle}.` };

  const { error } = await supabase.from("memberships").insert({
    account_id: user.id,
    company_id: company.id,
    role: "MEMBER",
    status: "ACTIVE",
    activated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath("/identity");
  return null;
}

/**
 * OWNER-only (enforced by "memberships: owner insert (invite)" RLS, not
 * app code). Looks the invitee up by handle via the service-role client —
 * "accounts: self read" only lets someone read their own row, so an owner
 * can't resolve another handle to an id through the RLS-scoped client —
 * then inserts the membership through the caller's own RLS-scoped client
 * so the actual authorization check (is this caller really this company's
 * owner?) is the database's, not this function's. Lands straight at
 * ACTIVE, same simplification as joinCompany — no separate accept-invite
 * step in this pass.
 */
export async function inviteMember(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const companyId = String(formData.get("companyId") ?? "");
  const handle = String(formData.get("handle") ?? "").trim().toUpperCase();
  if (!companyId || !handle) return { error: "Missing company or handle." };

  const platformService = createPlatformServiceRoleClient();
  const { data: account, error: lookupError } = await platformService
    .from("accounts")
    .select("id")
    .eq("public_id", handle)
    .maybeSingle();
  if (lookupError) return { error: lookupError.message };
  if (!account) return { error: `No AORMS Platform account found with handle ${handle}.` };

  const supabase = await createPlatformClient();
  const { error } = await supabase.from("memberships").insert({
    account_id: account.id,
    company_id: companyId,
    role: "MEMBER",
    status: "ACTIVE",
    activated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath(`/companies/${companyId}`);
  return null;
}

export async function updateMembershipRole(membershipId: string, role: "OWNER" | "MEMBER"): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { data: membership, error } = await supabase
    .from("memberships")
    .update({ role })
    .eq("id", membershipId)
    .select("company_id")
    .single();
  if (error) return { error: error.message };

  revalidatePath(`/companies/${membership.company_id}`);
  return {};
}

export async function leaveCompany(membershipId: string): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { error } = await supabase
    .from("memberships")
    .update({ status: "LEFT", left_at: new Date().toISOString() })
    .eq("id", membershipId);
  if (error) return { error: error.message };

  revalidatePath("/identity");
  return {};
}

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
