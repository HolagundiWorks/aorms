"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { generatePdfForTarget } from "../jobs/generate-pdf";
import { logAutoDocumentIssue } from "../document-issues-log";
import { toSafeErrorMessage } from "../security/safe-error";

export type LetterActionState = { error: string } | null;

/**
 * Roles with `has_capability('write')` (rank >= 40, or an explicit
 * allow-list role) — same set web/lib/actions/clients.ts's WRITE_TIER_ROLES
 * uses, mirrored here as an explicit, friendly-error check in the Server
 * Action (defense in depth): the real authorization boundary is RLS
 * (`letters: staff write`, migration 0085_write_policies_require_capability.sql).
 * Added 2026-09-21 (QA finding: `/letters`' "Add letter" button was visible
 * and fully interactive for a VIEWER — the RLS policy already blocked the
 * INSERT, but a VIEWER's submit would have failed with a raw RLS-denial
 * error instead of a clear message, and the button/form shouldn't have
 * been reachable at all).
 */
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export async function createLetterRecord(
  _prev: LetterActionState,
  formData: FormData,
): Promise<LetterActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim() || null;
  const recipient = String(formData.get("recipient") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const dateLetter = String(formData.get("dateLetter") ?? "").trim() || null;

  if (!recipient) return { error: "Recipient is required." };
  if (!subject) return { error: "Subject is required." };
  if (!body) return { error: "Body is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: authProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  if (!authProfile || !WRITE_TIER_ROLES.has(authProfile.role)) {
    return { error: "You don't have permission to add letters — contact a firm owner or partner." };
  }

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "letter",
    p_default_prefix: "LTR",
  });
  if (refError) return { error: `Could not mint a reference: ${toSafeErrorMessage(refError)}` };

  const { data: inserted, error } = await supabase
    .from("letters")
    .insert({ ref: refData, project_id: projectId, recipient, subject, body, date_letter: dateLetter })
    .select("id")
    .single();

  if (error) return { error: toSafeErrorMessage(error) };

  await supabase.rpc("write_audit", {
    p_entity: "letter",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, projectId, recipient, subject, dateLetter },
  });

  await logAutoDocumentIssue(supabase, {
    entityType: "LETTER",
    entityId: inserted.id,
    projectId,
    ref: refData,
    issuedById: user?.id ?? null,
  });

  revalidatePath("/letters");
  return null;
}

/** Phase 6 enqueue boundary (docs/esti/NEXTJS-MIGRATION-PHASE6-AUDIT.md). */
export async function generateLetterPdf(letterId: string): Promise<{ error: string } | null> {
  const supabase = await createClient();
  return generatePdfForTarget({
    supabase,
    table: "letters",
    target: "letter",
    id: letterId,
    revalidate: "/letters",
  });
}
