"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type ProjectActionState = { error: string } | null;

export async function createProjectRecord(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const projectType = String(formData.get("projectType") ?? "").trim();
  const workType = String(formData.get("workType") ?? "ARCHITECTURE");
  const clientId = String(formData.get("clientId") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;

  if (!title) return { error: "Title is required." };
  if (!projectType) return { error: "Project type is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Was a random placeholder (draftRef()) before Phase 10 — next_ref() existed
  // since migration 0003 but this action predated it and was never switched
  // over. Fixed here rather than knowingly introducing the same inconsistency
  // for Phase 10's lead-conversion path, which creates project_offices rows too.
  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "projectoffice",
    p_default_prefix: "PRJ",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("project_offices")
    .insert({
      ref: refData,
      title,
      project_type: projectType,
      work_type: workType,
      client_id: clientId,
      city,
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_office",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { title, projectType, workType, clientId, city },
  });

  revalidatePath("/projects");
  return null;
}
