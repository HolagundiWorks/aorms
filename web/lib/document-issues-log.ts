import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Automatic `document_issues` logging — the cross-cutting half of Phase 4's
 * own flagged gap that shipped a manual entry point only
 * (lib/actions/document-issues.ts): "No automatic wiring from every
 * issuing action across the app ... a genuinely cross-cutting change
 * touching every domain's own action, not a side effect of this pass."
 * This is that follow-up, scoped to the entity types that actually have a
 * clear, unambiguous "this document was just issued" moment in `web/`:
 *
 * - LETTER, CONTRACT, PROPOSAL, SPEC_SHEET: create *is* issue — these
 *   tables have no draft/issue lifecycle at all, the row exists the
 *   moment it's created (a real, ref-minted document).
 * - TRANSMITTAL: only logged when `date_issued` is actually set — a
 *   transmittal created with no issue date is legitimately still a draft
 *   (the client-portal RLS policy already keys off exactly this column).
 * - MOM: only logged from the new `issueMomRecord()` DRAFT → ISSUED
 *   transition (moms.ts) — `createMomRecord` always starts a MoM at its
 *   table default of `status = 'DRAFT'`, so create is NOT issue here,
 *   unlike the four above.
 *
 * Deliberately NOT wired: INSPECTION (no `inspections` table exists in
 * `web/` at all — confirmed via a schema sweep, not assumed) and
 * MOOD_BOARD (a project canvas with no issue/version concept — boards are
 * edited in place, never "issued" as a document). FEE_PROPOSAL isn't a
 * separate action either — `proposals` is this repo's own unified
 * fee-proposal + scope-agreement model (CLAUDE.md), so every proposal
 * insert logs as PROPOSAL, matching what the table actually is.
 *
 * Best-effort: a failed log insert is caught and reported to server logs,
 * never surfaced to the caller or allowed to fail the real action that
 * triggered it — the register is a secondary audit trail, not a
 * transactional requirement the user's actual save should depend on.
 */

export type DocumentIssueEntityType =
  | "LETTER"
  | "CONTRACT"
  | "PROPOSAL"
  | "TRANSMITTAL"
  | "SPEC_SHEET"
  | "MOM";

export async function logAutoDocumentIssue(
  supabase: SupabaseClient<any, any, any>,
  input: {
    entityType: DocumentIssueEntityType;
    entityId: string;
    projectId: string | null;
    ref: string;
    issuedById: string | null;
    versionNo?: number;
  },
): Promise<void> {
  try {
    const { error } = await supabase.from("document_issues").insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      project_id: input.projectId,
      ref: input.ref,
      version_no: input.versionNo ?? 1,
      issued_at: new Date().toISOString(),
      issued_by_id: input.issuedById,
    });
    if (error) console.error(`[document_issues] auto-log failed for ${input.entityType} ${input.entityId}:`, error.message);
  } catch (err) {
    console.error(`[document_issues] auto-log threw for ${input.entityType} ${input.entityId}:`, err);
  }
}
