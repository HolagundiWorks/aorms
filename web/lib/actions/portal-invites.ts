"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { createServiceRoleClient } from "../supabase/service";

/**
 * Portal login provisioning — the "createLogin" gap flagged on /contractors
 * and /consultants when each first shipped ("Supabase Auth admin operation,
 * not built"). The old backend (backend/src/modules/consultant/router.ts's
 * createLogin) took an owner-supplied password directly; that's exactly
 * the "handle a password in plain text" pattern this app avoids elsewhere
 * (see the invite-only accept flow already used for platform company
 * membership). The Supabase-native equivalent is Auth Admin's
 * inviteUserByEmail — it creates the auth.users row (firing
 * handle_new_user()'s trigger, which inserts a default `profiles` row
 * immediately, synchronously) and emails the person a link to set their
 * own password; this app only ever updates the resulting profile's role/
 * FK/name, never sees or sets a password itself.
 *
 * OWNER-only, matching the old backend's `ownerProcedure` gate — re-checked
 * here at the app layer since RLS on `profiles` already restricts updates
 * to OWNER ("profiles: owner manages"), but the invite call itself
 * (service-role, bypasses RLS entirely) has no RLS backstop, so the role
 * check has to happen before it, not be inferred from the later UPDATE
 * succeeding or failing.
 */

async function requireOwner(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "OWNER") return { error: "Only the firm owner can provision a portal login." };
  return { userId: user.id };
}

export async function inviteContractorLogin(contractorId: string, email: string): Promise<{ error?: string }> {
  const gate = await requireOwner();
  if ("error" in gate) return gate;

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes("@")) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const { data: contractor } = await supabase.from("contractors").select("name").eq("id", contractorId).maybeSingle();
  if (!contractor) return { error: "Contractor not found." };

  const admin = createServiceRoleClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(trimmedEmail, {
    data: { full_name: contractor.name },
  });
  if (inviteError) return { error: inviteError.message };

  const { error: profileError } = await admin
    .from("profiles")
    .update({ role: "CONTRACTOR", contractor_id: contractorId, full_name: contractor.name })
    .eq("id", invited.user.id);
  if (profileError) return { error: profileError.message };

  await supabase.rpc("write_audit", {
    p_entity: "contractor",
    p_entity_id: contractorId,
    p_action: "PORTAL_INVITE",
    p_before: null,
    p_after: { email: trimmedEmail },
  });

  revalidatePath("/contractors");
  return {};
}

export async function inviteConsultantLogin(consultantId: string, email: string): Promise<{ error?: string }> {
  const gate = await requireOwner();
  if ("error" in gate) return gate;

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes("@")) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const { data: consultant } = await supabase.from("consultants").select("name").eq("id", consultantId).maybeSingle();
  if (!consultant) return { error: "Consultant not found." };

  const admin = createServiceRoleClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(trimmedEmail, {
    data: { full_name: consultant.name },
  });
  if (inviteError) return { error: inviteError.message };

  const { error: profileError } = await admin
    .from("profiles")
    .update({ role: "CONSULTANT", consultant_id: consultantId, full_name: consultant.name })
    .eq("id", invited.user.id);
  if (profileError) return { error: profileError.message };

  await supabase.rpc("write_audit", {
    p_entity: "consultant",
    p_entity_id: consultantId,
    p_action: "PORTAL_INVITE",
    p_before: null,
    p_after: { email: trimmedEmail },
  });

  revalidatePath("/consultants");
  revalidatePath(`/consultants/${consultantId}`);
  return {};
}

const STAFF_ROLES = ["PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE", "VIEWER", "SITE_SUPERVISOR"];

/** Invite a brand-new staff member — the other half of /users' own
 * flagged gap ("Inviting a brand-new staff member isn't built here"). Not
 * OWNER as a choosable role — matches /users' own ASSIGNABLE_STAFF_ROLES
 * convention (an owner account is provisioned outside this flow). */
export async function inviteStaffMember(_prev: { error: string } | null, formData: FormData): Promise<{ error: string } | null> {
  const gate = await requireOwner();
  if ("error" in gate) return { error: gate.error };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  if (!email || !email.includes("@")) return { error: "Enter a valid email address." };
  if (!fullName) return { error: "Enter a name." };
  if (!STAFF_ROLES.includes(role)) return { error: "Pick a valid role." };

  const admin = createServiceRoleClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });
  if (inviteError) return { error: inviteError.message };

  const { error: profileError } = await admin.from("profiles").update({ role, full_name: fullName }).eq("id", invited.user.id);
  if (profileError) return { error: profileError.message };

  const supabase = await createClient();
  await supabase.rpc("write_audit", {
    p_entity: "profile",
    p_entity_id: invited.user.id,
    p_action: "INVITE",
    p_before: null,
    p_after: { email, role },
  });

  revalidatePath("/users");
  return null;
}
