"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type StandardActionState = { error: string } | null;

export async function createStandard(
  _prev: StandardActionState,
  formData: FormData,
): Promise<StandardActionState> {
  const discipline = String(formData.get("discipline") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!discipline) return { error: "Discipline is required." };
  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("standards")
    .insert({ discipline, title, notes })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "standard",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { discipline, title },
  });

  revalidatePath("/standards");
  return null;
}

export type StandardFileActionState = { error: string } | null;

/**
 * Metadata only, same register-only pattern as drawings.ts/master-plans.ts
 * — no upload Route Handler exists in this app yet.
 */
export async function createStandardFile(
  standardId: string,
  _prev: StandardFileActionState,
  formData: FormData,
): Promise<StandardFileActionState> {
  const fileName = String(formData.get("fileName") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim() || "PDF";

  if (!fileName) return { error: "File name is required." };

  const supabase = await createClient();
  const placeholder = `pending-${Date.now()}`;

  const { data: inserted, error } = await supabase
    .from("standard_files")
    .insert({ standard_id: standardId, kind, file_key: placeholder, file_name: fileName })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "standard_file",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { standardId, fileName, kind },
  });

  revalidatePath(`/standards/${standardId}`);
  return null;
}
