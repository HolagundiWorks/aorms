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

/**
 * Self-service "edit my own name" — migration 0031's `update_my_full_name`
 * security-definer function, the one column `profiles` RLS never let
 * anyone touch for their own row (even OWNER, since "profiles: owner
 * manages" is an UPDATE-any-row policy, not a self-service one). No
 * write_audit call here, unlike updateUserRole/toggleUserDisabled above —
 * this is a person editing their own display name, not an admin action on
 * someone else's account.
 */
export async function updateMyName(fullName: string): Promise<{ error?: string }> {
  const trimmed = fullName.trim();
  if (!trimmed) return { error: "Name cannot be empty." };
  if (trimmed.length > 200) return { error: "Name is too long (200 characters max)." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_full_name", { p_full_name: trimmed });
  if (error) return { error: error.message };

  revalidatePath("/users");
  return {};
}

/**
 * Calendar feed token issuance — migration 0033's `ensure_my_calendar_
 * feed_token`/`rotate_my_calendar_feed_token`, the same self-service RLS
 * gap as `updateMyName` above, for the columns migration 0009 added and
 * left unused ("the `.ics` calendar-feed Route Handler... deliberately
 * deferred" — Phase 5's own flagged gap, closed here). Returns the raw
 * token; the caller builds the actual subscription URL client-side from
 * `window.location.origin` (no server-side host detection needed).
 */
export async function getMyCalendarFeedToken(): Promise<{ token?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ensure_my_calendar_feed_token");
  if (error) return { error: error.message };
  return { token: data as string };
}

export async function rotateMyCalendarFeedToken(): Promise<{ token?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rotate_my_calendar_feed_token");
  if (error) return { error: error.message };
  return { token: data as string };
}
