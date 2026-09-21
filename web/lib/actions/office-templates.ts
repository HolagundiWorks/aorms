"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { toSafeErrorMessage } from "../security/safe-error";

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

/**
 * Roles with `has_capability('write')` (rank >= 40, or an explicit
 * allow-list role) — same set web/lib/actions/clients.ts's WRITE_TIER_ROLES
 * uses, mirrored here as an explicit, friendly-error check in the Server
 * Action (defense in depth): the real authorization boundary is RLS
 * (`office_templates: staff write`, migration
 * 0085_write_policies_require_capability.sql). Added 2026-09-21 in the
 * same sweep that found the matching UI gap on `/office-templates`' "Add
 * template" trigger.
 */
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: authProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  if (!authProfile || !WRITE_TIER_ROLES.has(authProfile.role)) {
    return { error: "You don't have permission to add office templates — contact a firm owner or partner." };
  }

  const { data: inserted, error } = await supabase
    .from("office_templates")
    .insert({ kind, title, body, tags })
    .select("id")
    .single();
  if (error) return { error: toSafeErrorMessage(error) };

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
  if (error) return { error: toSafeErrorMessage(error) };

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
  if (error) return { error: toSafeErrorMessage(error) };

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
