"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type SpecSheetActionState = { error: string } | null;

export async function createSpecSheetRecord(
  _prev: SpecSheetActionState,
  formData: FormData,
): Promise<SpecSheetActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!projectId) return { error: "Project is required." };
  if (!title) return { error: "Title is required." };

  const supabase = await createClient();

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "specsheet",
    p_default_prefix: "SPC",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("spec_sheets")
    .insert({ ref: refData, project_id: projectId, title })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "spec_sheet",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, projectId, title },
  });

  revalidatePath("/spec-sheets");
  return null;
}

export type SpecItemActionState = { error: string } | null;

export async function createSpecItemRecord(
  _prev: SpecItemActionState,
  formData: FormData,
): Promise<SpecItemActionState> {
  const specSheetId = String(formData.get("specSheetId") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const item = String(formData.get("item") ?? "").trim();
  const make = String(formData.get("make") ?? "").trim() || null;
  const specification = String(formData.get("specification") ?? "").trim() || null;
  const finish = String(formData.get("finish") ?? "").trim() || null;

  if (!specSheetId) return { error: "Missing spec sheet." };
  if (!item) return { error: "Item is required." };

  const supabase = await createClient();

  const { data: inserted, error } = await supabase
    .from("spec_items")
    .insert({ spec_sheet_id: specSheetId, category, item, make, specification, finish })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "spec_item",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { specSheetId, category, item, make },
  });

  revalidatePath(`/spec-sheets/${specSheetId}`);
  return null;
}
