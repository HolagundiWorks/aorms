"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type ProjectActionState = { error: string } | null;

/**
 * Temporary ref scheme — esti_projectoffice.ref is normally issued by the
 * gap-free per-scope-per-FY sequence table (esti_sequence), not yet ported
 * (flagged in NEXTJS-MIGRATION-PHASE2-AUDIT.md as a cross-cutting piece with
 * no owning phase yet). Replace this with the real sequence once that lands.
 */
function draftRef(): string {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PRJ-${suffix}`;
}

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

  const { data: inserted, error } = await supabase
    .from("project_offices")
    .insert({
      ref: draftRef(),
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
