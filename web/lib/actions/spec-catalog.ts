"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

/**
 * Spec Catalog (Library → Specification) — port of backend/src/modules/
 * knowledgebank/specCatalog.ts. Migration 0025 built the schema; this is
 * the CRUD + the "exactly one active version" business rule (a DB-level
 * partial unique index backs this up, but the two-step update below is
 * still needed to actually flip the previous active row off first).
 */

export type SpecCatalogActionState = { error: string } | null;

export async function createSpecCatalogVersion(
  _prev: SpecCatalogActionState,
  formData: FormData,
): Promise<SpecCatalogActionState> {
  const label = String(formData.get("label") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!label) return { error: "Label is required." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("spec_catalog_versions")
    .insert({ label, description })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "spec_catalog_version",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { label },
  });

  revalidatePath("/spec-catalog");
  return null;
}

export async function setActiveSpecCatalogVersion(versionId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Two-step: clear every active flag, then set the target — the partial
  // unique index (migration 0025) rejects two rows active at once, but
  // can't itself "swap" which one is; this ordering is what makes the swap
  // safe (setting a second row active before clearing the first would hit
  // the same constraint).
  const { error: clearError } = await supabase.from("spec_catalog_versions").update({ active: false }).eq("active", true);
  if (clearError) return { error: clearError.message };

  const { error } = await supabase.from("spec_catalog_versions").update({ active: true }).eq("id", versionId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "spec_catalog_version",
    p_entity_id: versionId,
    p_action: "ACTIVATE",
    p_before: null,
    p_after: { active: true },
  });

  revalidatePath("/spec-catalog");
  return {};
}

export async function addSpecCatalogItem(
  _prev: SpecCatalogActionState,
  formData: FormData,
): Promise<SpecCatalogActionState> {
  const versionId = String(formData.get("versionId") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const item = String(formData.get("item") ?? "").trim();
  const make = String(formData.get("make") ?? "").trim() || null;
  const specification = String(formData.get("specification") ?? "").trim() || null;
  const finish = String(formData.get("finish") ?? "").trim() || null;
  const remarks = String(formData.get("remarks") ?? "").trim() || null;

  if (!versionId) return { error: "Missing catalogue version." };
  if (!item) return { error: "Item is required." };

  const supabase = await createClient();

  const { data: last } = await supabase
    .from("spec_catalog_items")
    .select("sort_order")
    .eq("version_id", versionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (last?.sort_order ?? 0) + 10;

  const { data: inserted, error } = await supabase
    .from("spec_catalog_items")
    .insert({ version_id: versionId, category, item, make, specification, finish, remarks, sort_order: sortOrder })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "spec_catalog_item",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { versionId, item },
  });

  revalidatePath(`/spec-catalog/${versionId}`);
  return null;
}

export async function removeSpecCatalogItem(itemId: string, versionId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("spec_catalog_items").delete().eq("id", itemId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "spec_catalog_item",
    p_entity_id: itemId,
    p_action: "DELETE",
    p_before: null,
    p_after: null,
  });

  revalidatePath(`/spec-catalog/${versionId}`);
  return {};
}
