"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { generatePdfForTarget } from "../jobs/generate-pdf";
import { logAutoDocumentIssue } from "../document-issues-log";
import { toSafeErrorMessage } from "../security/safe-error";

export type SpecSheetActionState = { error: string } | null;

/**
 * Roles with `has_capability('write')` (rank >= 40, or an explicit
 * allow-list role) — same set web/lib/actions/clients.ts's WRITE_TIER_ROLES
 * uses, mirrored here as an explicit, friendly-error check in the Server
 * Action (defense in depth): the real authorization boundary is RLS
 * (`spec_sheets`/`spec_items: staff write`, migration
 * 0085_write_policies_require_capability.sql). Added 2026-09-21 in the
 * same sweep that found the matching UI gap on `/spec-sheets`' "Add spec
 * sheet" trigger.
 */
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export async function createSpecSheetRecord(
  _prev: SpecSheetActionState,
  formData: FormData,
): Promise<SpecSheetActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!projectId) return { error: "Project is required." };
  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const { data: authProfile } = authUser
    ? await supabase.from("profiles").select("role").eq("id", authUser.id).maybeSingle()
    : { data: null };
  if (!authProfile || !WRITE_TIER_ROLES.has(authProfile.role)) {
    return { error: "You don't have permission to add spec sheets — contact a firm owner or partner." };
  }

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "specsheet",
    p_default_prefix: "SPC",
  });
  if (refError) return { error: `Could not mint a reference: ${toSafeErrorMessage(refError)}` };

  const { data: inserted, error } = await supabase
    .from("spec_sheets")
    .insert({ ref: refData, project_id: projectId, title })
    .select("id")
    .single();

  if (error) return { error: toSafeErrorMessage(error) };

  await supabase.rpc("write_audit", {
    p_entity: "spec_sheet",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, projectId, title },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logAutoDocumentIssue(supabase, {
    entityType: "SPEC_SHEET",
    entityId: inserted.id,
    projectId,
    ref: refData,
    issuedById: user?.id ?? null,
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
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const { data: authProfile } = authUser
    ? await supabase.from("profiles").select("role").eq("id", authUser.id).maybeSingle()
    : { data: null };
  if (!authProfile || !WRITE_TIER_ROLES.has(authProfile.role)) {
    return { error: "You don't have permission to add spec items — contact a firm owner or partner." };
  }

  const { data: inserted, error } = await supabase
    .from("spec_items")
    .insert({ spec_sheet_id: specSheetId, category, item, make, specification, finish })
    .select("id")
    .single();

  if (error) return { error: toSafeErrorMessage(error) };

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

/** Phase 6 enqueue boundary (docs/esti/NEXTJS-MIGRATION-PHASE6-AUDIT.md). */
export async function generateSpecSheetPdf(specSheetId: string): Promise<{ error: string } | null> {
  const supabase = await createClient();
  return generatePdfForTarget({
    supabase,
    table: "spec_sheets",
    target: "specsheet",
    id: specSheetId,
    revalidate: `/spec-sheets/${specSheetId}`,
  });
}
