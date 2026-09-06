"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

/**
 * Collaborator Portal submissions — port of the writing half of
 * backend/src/modules/consultant/portal.ts's `submit()`/`completeTask()`.
 * RLS (migration 0021) is the actual gate: `consultant_id` and engagement
 * ownership are enforced at the DB layer for `submit`; `completeTask`'s
 * narrow "only flip TASK rows I own to RESOLVED" policy does the same for
 * completion.
 */

export type CollabActionState = { error: string } | null;

async function currentConsultantId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("consultant_id")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.consultant_id ?? null;
}

export async function submitToProject(
  _prev: CollabActionState,
  formData: FormData,
): Promise<CollabActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;

  if (!projectId) return { error: "Missing project." };
  if (!["DELIVERABLE", "RFI", "NOTE"].includes(kind)) return { error: "Invalid submission kind." };
  if (!subject) return { error: "Subject is required." };

  const consultantId = await currentConsultantId();
  if (!consultantId) return { error: "Your account isn't linked to a consultant record." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("consultant_submissions").insert({
    project_id: projectId,
    consultant_id: consultantId,
    kind,
    subject,
    body,
    submitted_by_id: user?.id ?? null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/collab-portal/${projectId}`);
  return null;
}

export async function completeTask(submissionId: string, projectId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("consultant_submissions")
    .update({ status: "RESOLVED", updated_at: new Date().toISOString() })
    .eq("id", submissionId);
  if (error) return { error: error.message };

  revalidatePath(`/collab-portal/${projectId}`);
  return {};
}
