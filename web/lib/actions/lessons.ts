"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { toSafeErrorMessage } from "../security/safe-error";

export type LessonActionState = { error: string } | null;

/**
 * Roles with `has_capability('write')` (rank >= 40, or an explicit
 * allow-list role) — same set web/lib/actions/clients.ts's WRITE_TIER_ROLES
 * uses, mirrored here as an explicit, friendly-error check in the Server
 * Action (defense in depth): the real authorization boundary is RLS
 * (`lessons_learned: staff write`, migration
 * 0085_write_policies_require_capability.sql). Added 2026-09-21 in the
 * same sweep that found the matching UI gap on `/lessons`' "Add lesson"
 * trigger.
 */
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export async function createLesson(
  _prev: LessonActionState,
  formData: FormData,
): Promise<LessonActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || "OTHER";
  const body = String(formData.get("body") ?? "").trim();
  const recommendations = String(formData.get("recommendations") ?? "").trim();

  if (!projectId) return { error: "Project is required." };
  if (!title) return { error: "Title is required." };
  if (!body) return { error: "Body is required." };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle()
    : { data: null };
  if (!profile || !WRITE_TIER_ROLES.has(profile.role)) {
    return { error: "You don't have permission to add lessons — contact a firm owner or partner." };
  }

  const { data: inserted, error } = await supabase
    .from("lessons_learned")
    .insert({
      project_id: projectId,
      title,
      category,
      body,
      recommendations,
      author_id: user?.id ?? null,
      author_name: profile?.full_name ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: toSafeErrorMessage(error) };

  await supabase.rpc("write_audit", {
    p_entity: "lessons_learned",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, title, category },
  });

  revalidatePath("/lessons");
  return null;
}
