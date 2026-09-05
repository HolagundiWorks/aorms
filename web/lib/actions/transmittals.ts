"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { generatePdfForTarget } from "../jobs/generate-pdf";

export type TransmittalActionState = { error: string } | null;

export async function createTransmittalRecord(
  _prev: TransmittalActionState,
  formData: FormData,
): Promise<TransmittalActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const recipient = String(formData.get("recipient") ?? "").trim();
  const purpose = String(formData.get("purpose") ?? "").trim();
  const channel = String(formData.get("channel") ?? "EMAIL");
  const dateIssued = String(formData.get("dateIssued") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!projectId) return { error: "Project is required." };
  if (!recipient) return { error: "Recipient is required." };
  if (!purpose) return { error: "Purpose is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "transmittal",
    p_default_prefix: "TRN",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("transmittals")
    .insert({
      ref: refData,
      project_id: projectId,
      recipient,
      purpose,
      channel,
      date_issued: dateIssued,
      notes,
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "transmittal",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, projectId, recipient, purpose, channel },
  });

  revalidatePath("/transmittals");
  return null;
}

/** Phase 6 enqueue boundary (docs/esti/NEXTJS-MIGRATION-PHASE6-AUDIT.md). */
export async function generateTransmittalPdf(transmittalId: string): Promise<{ error: string } | null> {
  const supabase = await createClient();
  return generatePdfForTarget({
    supabase,
    table: "transmittals",
    target: "transmittal",
    id: transmittalId,
    revalidate: "/transmittals",
  });
}
