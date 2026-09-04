"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

type ActionState = { error: string } | null;

export async function createJobApplication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const appliedRole = String(formData.get("appliedRole") ?? "").trim();
  const experienceYears = String(formData.get("experienceYears") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) return { error: "Name is required." };
  if (!appliedRole) return { error: "Applied role is required." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("job_applications")
    .insert({
      name,
      email,
      phone,
      applied_role: appliedRole,
      experience_years: experienceYears,
      notes,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "job_application",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { name, appliedRole },
  });

  revalidatePath("/job-applications");
  return null;
}

const STATUSES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFERED", "HIRED", "REJECTED", "WITHDRAWN"];

export async function updateJobApplicationStatus(applicationId: string, status: string): Promise<{ error?: string }> {
  if (!STATUSES.includes(status)) return { error: "Invalid status." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("job_applications")
    .update({ status, status_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", applicationId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "job_application",
    p_entity_id: applicationId,
    p_action: "UPDATE",
    p_before: null,
    p_after: { status },
  });

  revalidatePath("/job-applications");
  return {};
}
