"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type DrawingActionState = { error: string } | null;

/**
 * Metadata only — the actual DXF/PDF upload path (content-hash de-dup,
 * file-type sniffing, worker-driven takeoff) is a Route Handler per the
 * Phase 4 audit, not built here. file_hash/storage_key are placeholders
 * until that upload path exists; this creates a PENDING drawing register
 * row so the register itself is testable ahead of the real upload flow.
 */
export async function createDrawingRecord(
  _prev: DrawingActionState,
  formData: FormData,
): Promise<DrawingActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const fileName = String(formData.get("fileName") ?? "").trim();

  if (!projectId) return { error: "Project is required." };
  if (!title) return { error: "Title is required." };
  if (!fileName) return { error: "File name is required." };

  const supabase = await createClient();

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "drawing",
    p_default_prefix: "DRG",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  // Placeholder hash/key until the real upload Route Handler exists —
  // file_hash/storage_key are NOT NULL in the schema (content-addressed
  // storage), so a register-only row needs a value here.
  const placeholder = `pending-${refData}`;

  const { data: inserted, error } = await supabase
    .from("drawings")
    .insert({
      ref: refData,
      project_id: projectId,
      title,
      file_name: fileName,
      file_hash: placeholder,
      storage_key: placeholder,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "drawing",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, projectId, title, fileName },
  });

  revalidatePath("/drawings");
  return null;
}
