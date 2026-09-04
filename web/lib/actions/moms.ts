"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type MomActionState = { error: string } | null;

export async function createMomRecord(
  _prev: MomActionState,
  formData: FormData,
): Promise<MomActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const meetingDate = String(formData.get("meetingDate") ?? "").trim() || null;
  const venue = String(formData.get("venue") ?? "").trim() || null;
  const attendees = String(formData.get("attendees") ?? "").trim() || null;
  const minutes = String(formData.get("minutes") ?? "").trim();

  if (!projectId) return { error: "Project is required." };
  if (!title) return { error: "Title is required." };

  const supabase = await createClient();

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "mom",
    p_default_prefix: "MOM",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("moms")
    .insert({
      ref: refData,
      project_id: projectId,
      title,
      meeting_date: meetingDate,
      venue,
      attendees,
      minutes,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "mom",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, projectId, title, meetingDate },
  });

  revalidatePath("/moms");
  return null;
}
