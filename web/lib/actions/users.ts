"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

/**
 * Staff user management — closes a gap this repo's own module map calls out
 * (`Users.tsx | User management (firm:admin)`) that `web/` never had any
 * page for at all. RLS (`profiles: owner manages`, UPDATE only, OWNER role
 * only) is the real gate here — matches exactly, no new migration needed.
 * Inviting a brand-new staff member isn't ported: that needs Supabase Auth
 * admin's `inviteUserByEmail` (a service-role operation, materially
 * different from this table's own CRUD), flagged as a follow-up rather than
 * built here.
 */

const ROLES = ["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE", "VIEWER", "SITE_SUPERVISOR"];

export async function updateUserRole(userId: string, role: string): Promise<{ error?: string }> {
  if (!ROLES.includes(role)) return { error: "Invalid role." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "profile",
    p_entity_id: userId,
    p_action: "UPDATE",
    p_before: null,
    p_after: { role },
  });

  revalidatePath("/users");
  return {};
}

export async function toggleUserDisabled(userId: string, disabled: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ disabled }).eq("id", userId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "profile",
    p_entity_id: userId,
    p_action: "UPDATE",
    p_before: null,
    p_after: { disabled },
  });

  revalidatePath("/users");
  return {};
}
