"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

/**
 * Document Issues register — Phase 4's own flagged gap: "the cross-entity
 * register — audit's own landing order puts it last, fans in across every
 * other domain." The table (`document_issues`) already exists with a
 * staff-insert-only RLS shape (no update/delete policy — append-only, like
 * `audit_log`). No automatic wiring from every issuing action across the
 * app (drawings, transmittals, invoices, …) is attempted here — that's a
 * genuinely cross-cutting change touching every domain's own action, not a
 * side effect of this pass. This ships the register itself plus a manual
 * "log an issue" entry point, matching the same scoping discipline BBS's
 * manual bar-line entry and the portals' deferred activity feed used.
 */

export type DocumentIssueActionState = { error: string } | null;

/**
 * The table's own check constraint (confirmed live against Supabase) only
 * allows these nine — caught during verification when a "drawing" test
 * insert failed (drawings/invoices deliberately aren't covered, see
 * NewDocumentIssueForm.tsx's comment for why). Re-validated here too, not
 * just left to the DB error, so a bad value gets a clear message.
 */
const ENTITY_TYPES = [
  "LETTER",
  "CONTRACT",
  "PROPOSAL",
  "TRANSMITTAL",
  "INSPECTION",
  "SPEC_SHEET",
  "MOOD_BOARD",
  "MOM",
  "FEE_PROPOSAL",
];

export async function logDocumentIssue(
  _prev: DocumentIssueActionState,
  formData: FormData,
): Promise<DocumentIssueActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const entityType = String(formData.get("entityType") ?? "").trim();
  const ref = String(formData.get("ref") ?? "").trim();
  const versionRaw = String(formData.get("versionNo") ?? "1").trim();
  const revisionNote = String(formData.get("revisionNote") ?? "").trim() || null;
  const impactNote = String(formData.get("impactNote") ?? "").trim() || null;

  if (!projectId) return { error: "Project is required." };
  if (!ENTITY_TYPES.includes(entityType)) return { error: "Select a valid document type." };
  if (!ref) return { error: "Reference is required." };

  const versionNo = versionRaw ? Number(versionRaw) : 1;
  if (!Number.isInteger(versionNo) || versionNo < 1) return { error: "Version must be a whole number ≥ 1." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("document_issues").insert({
    project_id: projectId,
    entity_type: entityType,
    ref,
    version_no: versionNo,
    revision_note: revisionNote,
    impact_note: impactNote,
    issued_at: new Date().toISOString(),
    issued_by_id: user?.id ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath("/document-issues");
  return null;
}
