"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { toSafeErrorMessage } from "../security/safe-error";
import { deleteCoverImage, uploadCoverImage } from "../projects/covers";

export type CoverActionState = { error: string } | { ok: string } | null;

// Same write-tier set as lib/actions/projects.ts / clients.ts (mirrors RLS's
// has_capability('write')); the RLS update policy is the real gate, this gives
// a clear message and stops a read-only user from uploading to storage at all.
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

async function requireWriter() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  if (!user || !profile || !WRITE_TIER_ROLES.has(profile.role)) return { supabase, user: null as null };
  return { supabase, user };
}

/** Set or replace a project's cover image. */
export async function setProjectCover(projectId: string, formData: FormData): Promise<CoverActionState> {
  const file = formData.get("image");
  if (!(file instanceof File)) return { error: "Choose an image first." };
  const { supabase, user } = await requireWriter();
  if (!user) return { error: "You don't have permission to change project images — contact a firm owner or partner." };

  // RLS-scoped read: proves the project exists in the caller's firm before any storage write.
  const { data: project } = await supabase.from("project_offices").select("id, cover_image_key").eq("id", projectId).maybeSingle();
  if (!project) return { error: "Project not found." };

  const uploaded = await uploadCoverImage(projectId, file);
  if ("error" in uploaded) return uploaded;

  const { data: updated, error } = await supabase.from("project_offices").update({ cover_image_key: uploaded.key }).eq("id", projectId).select("id");
  if (error) return { error: toSafeErrorMessage(error) };
  if (!updated?.length) return { error: "You don't have permission to change this project." };

  if (project.cover_image_key && project.cover_image_key !== uploaded.key) await deleteCoverImage(project.cover_image_key);
  await supabase.rpc("write_audit", { p_entity: "project", p_entity_id: projectId, p_action: "UPDATE", p_before: null, p_after: { cover_image: true } });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { ok: "Cover image updated." };
}

export async function removeProjectCover(projectId: string): Promise<CoverActionState> {
  const { supabase, user } = await requireWriter();
  if (!user) return { error: "You don't have permission to change project images." };
  const { data: project } = await supabase.from("project_offices").select("cover_image_key").eq("id", projectId).maybeSingle();
  if (!project) return { error: "Project not found." };
  const { data: updated, error } = await supabase.from("project_offices").update({ cover_image_key: null }).eq("id", projectId).select("id");
  if (error) return { error: toSafeErrorMessage(error) };
  if (!updated?.length) return { error: "You don't have permission to change this project." };
  await deleteCoverImage(project.cover_image_key);
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { ok: "Cover image removed." };
}

/** Pin / unpin for the signed-in person only (personal preference; no write capability needed). */
export async function setProjectPinned(projectId: string, pinned: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again to pin projects." };
  const { error } = pinned
    ? await supabase.from("project_pins").upsert({ profile_id: user.id, project_id: projectId }, { onConflict: "profile_id,project_id", ignoreDuplicates: true })
    : await supabase.from("project_pins").delete().eq("profile_id", user.id).eq("project_id", projectId);
  if (error) return { error: toSafeErrorMessage(error) };
  revalidatePath("/projects");
  return {};
}
