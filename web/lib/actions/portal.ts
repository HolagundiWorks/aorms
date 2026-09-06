"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

/**
 * Client Portal submissions — port of the writing half of
 * backend/src/modules/portal/router.ts's `insertSubmission()` helper (all
 * four kinds funnel through one shared table, `portal_submissions` —
 * migration 0020). RLS (`portal_submissions: client insert own`) is the
 * actual gate: `client_id` and project ownership are enforced at the DB
 * layer, not just trusted from the form, so there's no need to re-check
 * "does this client own this project" here the way the old tRPC
 * procedures' `assertOwnedProject()` did.
 */

export type PortalActionState = { error: string } | null;

async function currentClientId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.client_id ?? null;
}

export async function submitChangeRequest(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;
  const revisionCategory = String(formData.get("revisionCategory") ?? "").trim();

  if (!projectId) return { error: "Missing project." };
  if (!subject) return { error: "Subject is required." };
  if (!["MINOR", "MAJOR", "CRITICAL"].includes(revisionCategory)) {
    return { error: "Select a revision category — Minor, Major or Critical." };
  }

  const clientId = await currentClientId();
  if (!clientId) return { error: "Your account isn't linked to a client record." };

  const supabase = await createClient();
  const { error } = await supabase.from("portal_submissions").insert({
    project_id: projectId,
    client_id: clientId,
    kind: "CHANGE_REQUEST",
    subject,
    body,
    revision_category: revisionCategory,
  });
  if (error) return { error: error.message };

  revalidatePath(`/portal/${projectId}`);
  return null;
}

export async function submitFeedback(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;
  const ratingRaw = String(formData.get("rating") ?? "").trim();
  const rating = ratingRaw ? Number(ratingRaw) : null;

  if (!projectId) return { error: "Missing project." };
  if (!subject) return { error: "Subject is required." };
  if (rating != null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return { error: "Rating must be 1–5." };
  }

  const clientId = await currentClientId();
  if (!clientId) return { error: "Your account isn't linked to a client record." };

  const supabase = await createClient();
  const { error } = await supabase.from("portal_submissions").insert({
    project_id: projectId,
    client_id: clientId,
    kind: "FEEDBACK",
    subject,
    body,
    rating,
  });
  if (error) return { error: error.message };

  revalidatePath(`/portal/${projectId}`);
  return null;
}

export async function requestMeeting(
  _prev: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const preferredDate = String(formData.get("preferredDate") ?? "").trim();
  const mode = String(formData.get("mode") ?? "IN_PERSON").trim();
  const agenda = String(formData.get("agenda") ?? "").trim() || null;

  if (!projectId) return { error: "Missing project." };

  const modeLabel = mode === "VIDEO_CALL" ? "Video call" : mode === "PHONE" ? "Phone call" : "In-person";
  const subject = preferredDate
    ? `Meeting request — ${modeLabel} on ${preferredDate}`
    : `Meeting request — ${modeLabel}`;

  const clientId = await currentClientId();
  if (!clientId) return { error: "Your account isn't linked to a client record." };

  const supabase = await createClient();
  const { error } = await supabase.from("portal_submissions").insert({
    project_id: projectId,
    client_id: clientId,
    kind: "MEETING_REQUEST",
    subject,
    body: agenda,
  });
  if (error) return { error: error.message };

  revalidatePath(`/portal/${projectId}`);
  return null;
}

export async function acknowledgeItem(
  projectId: string,
  objectType: string,
  objectId: string | null,
  subject: string,
): Promise<{ error?: string }> {
  const clientId = await currentClientId();
  if (!clientId) return { error: "Your account isn't linked to a client record." };

  const supabase = await createClient();
  const { error } = await supabase.from("portal_submissions").insert({
    project_id: projectId,
    client_id: clientId,
    kind: "ACKNOWLEDGEMENT",
    object_type: objectType,
    object_id: objectId,
    subject,
  });
  if (error) return { error: error.message };

  // The old router also stamped the transmittal register row itself
  // (acknowledged_at/acknowledged_by) as a second write. Not ported here —
  // it needs a narrowly-scoped, business-rule-guarded write path (a client
  // must never be able to touch any other transmittal column), same
  // reasoning as `respondApproval`/`respondToImpact` being deferred in the
  // migration's own header comment — the `portal_submissions` row above is
  // already the record of record either way.

  revalidatePath(`/portal/${projectId}`);
  return {};
}
