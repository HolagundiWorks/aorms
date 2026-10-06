"use server";

/**
 * AORMS Platform — Studio (architecture firm) actions: create/join/invite/leave, seats, ownership, subdomain, profile, board members, contacts (split from platform.ts, 2026-10-06).
 * Original design notes: see the history of lib/actions/platform.ts and docs/esti/AORMS-IDENTITY.md.
 */

import { revalidatePath } from "next/cache";
import { createClient as createPlatformClient } from "../platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";
import { toSafeErrorMessage } from "../security/safe-error";
import type { PlatformActionState } from "./platform-types";

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
  if (error) return { error: toSafeErrorMessage(error) };

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
/**
 * 2026-09-14 — real pricing restructure (platform migration 0033, see
 * docs/esti/ROADMAP.md's dated entry). Per-tier team-member caps,
 * replacing the old flat "3 on TRIAL, unlimited otherwise" shape now
 * that Studio/Professional have their own real member caps too — the
 * same numbers `PLAN_SEAT_ALLOTMENT` (platform-payments.ts) already uses
 * for the separate individual-PRO-status-grant feature, reused here
 * rather than maintaining two parallel per-plan numbers that could
 * drift. `null` = unlimited (Enterprise's 9999 seat allotment is treated
 * as unlimited for membership purposes, not a literal 9999-person cap).
 */
const STUDIO_MEMBER_CAP: Record<string, number | null> = { FREE: 1, STUDIO: 10, PROFESSIONAL: 25, ENTERPRISE: null };

/**
 * Checked before both ways a studio gains a member — self-serve join
 * (joinStudio) and owner invite (inviteStudioMember) — so neither path
 * can silently exceed the caller's plan cap. Skips the check for someone
 * already an ACTIVE member of this studio (re-inviting/rejoining isn't a
 * net-new seat).
 */
async function checkStudioMemberCap(studioId: string, accountId: string): Promise<{ error: string } | null> {
  const platformService = createPlatformServiceRoleClient();

  const { data: existing } = await platformService
    .from("studio_memberships")
    .select("status")
    .eq("studio_id", studioId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (existing?.status === "ACTIVE") return null;

  const { data: licence } = await platformService.from("licences").select("plan").eq("studio_id", studioId).maybeSingle();
  const cap = STUDIO_MEMBER_CAP[licence?.plan ?? "FREE"];
  if (cap == null) return null;

  const { count } = await platformService
    .from("studio_memberships")
    .select("id", { count: "exact", head: true })
    .eq("studio_id", studioId)
    .eq("status", "ACTIVE");

  if ((count ?? 0) >= cap) {
    const nextTier = licence?.plan === "FREE" || !licence ? "Studio" : licence.plan === "STUDIO" ? "Professional" : "a higher tier";
    return { error: `This studio's current plan is limited to ${cap} team member${cap === 1 ? "" : "s"}. Upgrade to ${nextTier} to add more.` };
  }
  return null;
}

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
  if (lookupError) return { error: toSafeErrorMessage(lookupError) };
  if (!studio) return { error: `No studio found with handle ${handle}.` };

  const capError = await checkStudioMemberCap(studio.id, user.id);
  if (capError) return capError;

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
  if (error) return { error: toSafeErrorMessage(error) };

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
  if (lookupError) return { error: toSafeErrorMessage(lookupError) };
  if (!account) return { error: `No AORMS Platform account found with handle ${handle}.` };

  const capError = await checkStudioMemberCap(studioId, account.id);
  if (capError) return capError;

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
  if (error) return { error: toSafeErrorMessage(error) };

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
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath(`/studios/${membership.studio_id}`);
  return {};
}

export async function leaveStudio(membershipId: string): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { error } = await supabase
    .from("studio_memberships")
    .update({ status: "LEFT", left_at: new Date().toISOString() })
    .eq("id", membershipId);
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath("/identity");
  return {};
}

/**
 * PRO seat assignment (2026-09-13) — see platform/supabase/migrations/
 * 0018_identity_verification_pro_seats_connectdex_tiers.sql's header:
 * `level` no longer flips to PRO for free/automatically at 100 hours. A
 * Studio's own paid licence seats (Pro/Enterprise — renamed from the
 * single AORMS_FIRM tier by migration 0019, seats now a fixed allotment
 * per plan rather than a purchased quantity) are what a member's PRO
 * status is now capped by — this is the first thing `licences.seats`
 * actually does; it was previously just a billing number.
 *
 * `studio_memberships.pro_assigned_at` is written through the RLS-scoped
 * client — "studio_memberships: owner update" (is_studio_owner(studio_id),
 * no with_check) already covers it, same reliance-on-RLS pattern
 * updateStudioMembershipRole above uses. But `accounts.level` has no
 * self-serve/owner-update RLS policy at all (accounts only grants "self
 * read") — a studio owner setting a *different* account's level
 * necessarily goes through the service-role client, since there's no
 * "owner of a studio this account belongs to" RLS policy on `accounts`
 * itself. The seat-cap check below is an app-level guard for a clean
 * error message, not the real authorization boundary (that's still
 * is_studio_owner(studio_id) on the studio_memberships write which must
 * succeed first) — but it IS the only thing standing between "assign" and
 * silently exceeding a Studio's paid seat count, so it's checked before
 * either write, not just for cosmetics.
 */
export async function assignProSeat(studioId: string, membershipId: string, accountId: string): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();

  const [{ data: licence }, { count: assignedCount }] = await Promise.all([
    supabase.from("licences").select("seats").eq("studio_id", studioId).maybeSingle(),
    supabase
      .from("studio_memberships")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", studioId)
      .not("pro_assigned_at", "is", null),
  ]);
  const seats = licence?.seats ?? 0;
  if ((assignedCount ?? 0) >= seats) {
    return { error: `All ${seats} PRO seat${seats === 1 ? "" : "s"} on this studio's licence are already assigned.` };
  }

  const { error: membershipError } = await supabase
    .from("studio_memberships")
    .update({ pro_assigned_at: new Date().toISOString() })
    .eq("id", membershipId);
  if (membershipError) return { error: toSafeErrorMessage(membershipError) };

  const platformService = createPlatformServiceRoleClient();
  const { error: levelError } = await platformService.from("accounts").update({ level: "PRO" }).eq("id", accountId);
  if (levelError) return { error: toSafeErrorMessage(levelError) };

  revalidatePath(`/studios/${studioId}`);
  return {};
}

/** Reverses assignProSeat — frees the seat back up and drops the member
 * back to BASIC ("basic will be free" is the true fallback state, not an
 * edge case). */
export async function revokeProSeat(studioId: string, membershipId: string, accountId: string): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { error: membershipError } = await supabase.from("studio_memberships").update({ pro_assigned_at: null }).eq("id", membershipId);
  if (membershipError) return { error: toSafeErrorMessage(membershipError) };

  const platformService = createPlatformServiceRoleClient();
  const { error: levelError } = await platformService.from("accounts").update({ level: "BASIC" }).eq("id", accountId);
  if (levelError) return { error: toSafeErrorMessage(levelError) };

  revalidatePath(`/studios/${studioId}`);
  return {};
}

/**
 * Studio ownership transfer (2026-09-14) — a real, validated write path
 * for `studios.owner_id`, which today has none at all: "studios: owner
 * update" RLS lets any current owner PATCH `owner_id` to literally any
 * UUID (it's never been touched by anything since studio creation, and
 * `is_studio_owner()` itself checks `studio_memberships.role`, not this
 * column — found while exploring for this feature). A clean single-owner
 * handoff, not just adding a co-owner: the target becomes OWNER, the
 * caller steps down to MEMBER, `owner_id` moves to the target.
 */
export async function transferStudioOwnership(studioId: string, newOwnerAccountId: string): Promise<{ error?: string }> {
  const platform = await createPlatformClient();
  const {
    data: { user },
  } = await platform.auth.getUser();
  if (!user) return { error: "Sign in to the AORMS Platform first." };

  const { data: callerMembership } = await platform
    .from("studio_memberships")
    .select("id, role, status")
    .eq("studio_id", studioId)
    .eq("account_id", user.id)
    .maybeSingle();
  if (!callerMembership || callerMembership.role !== "OWNER" || callerMembership.status !== "ACTIVE") {
    return { error: "Only the studio's current owner can transfer ownership." };
  }
  if (newOwnerAccountId === user.id) return { error: "Already the owner." };

  const { data: targetMembership } = await platform
    .from("studio_memberships")
    .select("id, status")
    .eq("studio_id", studioId)
    .eq("account_id", newOwnerAccountId)
    .maybeSingle();
  if (!targetMembership || targetMembership.status !== "ACTIVE") {
    return { error: "The new owner must be an active member of this studio first." };
  }

  // studios.owner_id has no self-serve-safe RLS story (see the doc
  // comment above) — the service-role client is the deliberate,
  // considered writer here, not a bypass of a real policy this action
  // could otherwise satisfy.
  const platformService = createPlatformServiceRoleClient();
  const { error: studioError } = await platformService.from("studios").update({ owner_id: newOwnerAccountId }).eq("id", studioId);
  if (studioError) return { error: toSafeErrorMessage(studioError) };

  const { error: promoteError } = await platformService
    .from("studio_memberships")
    .update({ role: "OWNER" })
    .eq("id", targetMembership.id);
  if (promoteError) return { error: toSafeErrorMessage(promoteError) };

  const { error: demoteError } = await platformService
    .from("studio_memberships")
    .update({ role: "MEMBER" })
    .eq("id", callerMembership.id);
  if (demoteError) return { error: toSafeErrorMessage(demoteError) };

  revalidatePath(`/studios/${studioId}`);
  return {};
}

const SUBDOMAIN_RESERVED_WORDS = new Set(["identity", "connectdex", "sysdex", "www", "admin", "api", "app", "support"]);

/**
 * Custom subdomain reservation (2026-09-14) — Enterprise-only perk.
 * Schema + slug reservation this pass, confirmed with the user: this
 * validates and stores `studios.subdomain_slug`, it does NOT make
 * `<slug>.aorms.in` actually resolve anywhere — that needs wildcard DNS
 * plus a dynamic Host-header->studio lookup in proxy.ts/subdomains.ts
 * (today's PortalKey union is a fixed 3-value set, not a per-studio
 * lookup), disclosed as a follow-up in docs/esti/ROADMAP.md, not built
 * here.
 */
export async function setStudioSubdomain(studioId: string, slug: string): Promise<{ error?: string }> {
  const normalized = slug.trim().toLowerCase();
  if (!/^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/.test(normalized)) {
    return { error: "Use 3-63 lowercase letters, digits, or hyphens — no leading/trailing hyphen." };
  }
  if (SUBDOMAIN_RESERVED_WORDS.has(normalized)) return { error: `"${normalized}" is reserved and can't be used.` };

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
    return { error: "Only the studio's owner can set its subdomain." };
  }

  const { data: licence } = await platform.from("licences").select("plan, expires_at").eq("studio_id", studioId).maybeSingle();
  const licenceActive = !licence?.expires_at || new Date(licence.expires_at) > new Date();
  if (licence?.plan !== "ENTERPRISE" || !licenceActive) {
    return { error: "A custom subdomain is an Enterprise-plan perk — this studio isn't on an active Enterprise licence." };
  }

  const { error } = await platform.from("studios").update({ subdomain_slug: normalized }).eq("id", studioId);
  if (error) {
    // Postgres unique_violation — surface a clean message instead of the
    // raw constraint-violation text.
    if (error.code === "23505") return { error: `"${normalized}" is already taken.` };
    return { error: toSafeErrorMessage(error) };
  }

  revalidatePath(`/studios/${studioId}`);
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
  if (error) return { error: toSafeErrorMessage(error) };

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
  if (error) return { error: toSafeErrorMessage(error) };

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
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath(`/studios/${studioId}`);
  return null;
}

export async function removeStudioBoardMember(boardMemberId: string, studioId: string): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { error } = await supabase.from("studio_board_members").delete().eq("id", boardMemberId);
  if (error) return { error: toSafeErrorMessage(error) };

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
  if (error) return { error: toSafeErrorMessage(error) };

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
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath(`/studios/${studioId}`);
  return null;
}

export async function removeStudioContact(contactId: string, studioId: string): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { error } = await supabase.from("studio_contacts").delete().eq("id", contactId);
  if (error) return { error: toSafeErrorMessage(error) };

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
