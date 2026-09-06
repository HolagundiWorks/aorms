"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

/**
 * Office Templates — reusable letter/scope/COA/contract/MOM boilerplate.
 * Port of backend/src/modules/document/router.ts's listTemplates/
 * createTemplate (+ update/delete, not named procedures in the old router
 * but the obvious CRUD completion). Phase 4's own flagged gap
 * ("office_templates" not built) — the table existed with RLS the whole
 * time, no UI at all until now.
 */

const KINDS = ["LETTER", "SCOPE", "COA", "CONTRACT", "MOM"];

export type OfficeTemplateActionState = { error: string } | null;

export async function createOfficeTemplate(
  _prev: OfficeTemplateActionState,
  formData: FormData,
): Promise<OfficeTemplateActionState> {
  const kind = String(formData.get("kind") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const tags = String(formData.get("tags") ?? "").trim() || null;

  if (!KINDS.includes(kind)) return { error: "Select a valid template kind." };
  if (!title) return { error: "Title is required." };
  if (!body) return { error: "Body is required." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("office_templates")
    .insert({ kind, title, body, tags })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "office_template",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { kind, title },
  });

  revalidatePath("/office-templates");
  return null;
}

export async function updateOfficeTemplate(
  _prev: OfficeTemplateActionState,
  formData: FormData,
): Promise<OfficeTemplateActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const tags = String(formData.get("tags") ?? "").trim() || null;

  if (!id) return { error: "Missing template." };
  if (!KINDS.includes(kind)) return { error: "Select a valid template kind." };
  if (!title) return { error: "Title is required." };
  if (!body) return { error: "Body is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("office_templates")
    .update({ kind, title, body, tags, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "office_template",
    p_entity_id: id,
    p_action: "UPDATE",
    p_before: null,
    p_after: { kind, title },
  });

  revalidatePath("/office-templates");
  revalidatePath(`/office-templates/${id}`);
  return null;
}

export async function deleteOfficeTemplate(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("office_templates").delete().eq("id", id);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "office_template",
    p_entity_id: id,
    p_action: "DELETE",
    p_before: null,
    p_after: null,
  });

  revalidatePath("/office-templates");
  return {};
}
