"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

type ActionState = { error: string } | null;

export async function createSiteInstruction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const contractorId = String(formData.get("contractorId") ?? "").trim() || null;
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;
  const issuedAt = String(formData.get("issuedAt") ?? "").trim() || null;

  if (!projectId) return { error: "Project is required." };
  if (!subject) return { error: "Subject is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "siteinstruction",
    p_default_prefix: "SI",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("site_instructions")
    .insert({
      ref: refData,
      project_id: projectId,
      contractor_id: contractorId,
      subject,
      body,
      issued_at: issuedAt,
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "site_instruction",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, ref: refData, subject },
  });

  revalidatePath("/site-instructions");
  return null;
}
