"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type LetterActionState = { error: string } | null;

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

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "letter",
    p_default_prefix: "LTR",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("letters")
    .insert({ ref: refData, project_id: projectId, recipient, subject, body, date_letter: dateLetter })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "letter",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, projectId, recipient, subject, dateLetter },
  });

  revalidatePath("/letters");
  return null;
}
