"use server";

/**
 * Studio side of the Contractor Portal inbox (2026-10-08): reply to a contractor's ticket / meeting request / RFI /
 * progress update, set its status, and post to the thread. Writes use the staff's own session — RLS
 * (`contractor_submissions: staff write`, `submission_messages: staff write`) is the gate.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { toSafeErrorMessage } from "../security/safe-error";
import { notifyContractor } from "../contractor/notify";

export type TicketActionState = { error: string } | { ok: string } | null;

export async function respondToContractorSubmission(_prev: TicketActionState, formData: FormData): Promise<TicketActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!id) return { error: "Missing item." };
  if (!["OPEN", "RESPONDED", "RESOLVED"].includes(status)) return { error: "Choose a status." };
  if (note.length > 2000) return { error: "Keep the reply under 2,000 characters." };

  const meetingRaw = String(formData.get("meetingAt") ?? "").trim();
  const meetingPlace = String(formData.get("meetingPlace") ?? "").trim().slice(0, 200);
  // The datetime-local field has no zone; the studio works in IST.
  const meetingAt = meetingRaw ? new Date(`${meetingRaw}:00+05:30`) : null;
  if (meetingAt && Number.isNaN(meetingAt.getTime())) return { error: "Enter a valid meeting time." };

  const supabase = await createClient();
  const patch: Record<string, unknown> = { status, response_note: note || null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (meetingAt) {
    patch.meeting_at = meetingAt.toISOString();
    patch.meeting_place = meetingPlace || null;
  }
  const { data: row, error } = await supabase.from("contractor_submissions").update(patch).eq("id", id).select("contractor_id, subject").maybeSingle();
  if (error) return { error: toSafeErrorMessage(error) };

  if (row && (note || meetingAt)) {
    await notifyContractor(
      row.contractor_id,
      `[AORMS] Reply: ${row.subject}`,
      `${note}${meetingAt ? `\n\nMeeting confirmed: ${meetingAt.toLocaleString("en-GB", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST${meetingPlace ? ` at ${meetingPlace}` : ""}.` : ""}\n\nOpen the Contractor Portal to see the full thread.`,
    );
  }

  revalidatePath("/contractor-tickets");
  return { ok: "Saved." };
}

/** Apply a contractor's progress update to its milestone (studio decision — the programme stays the studio's). */
export async function applyProgressUpdate(_prev: TicketActionState, formData: FormData): Promise<TicketActionState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Missing item." };
  const supabase = await createClient();
  const { data: sub } = await supabase.from("contractor_submissions").select("kind, milestone_id, percent_complete, applied_at").eq("id", id).maybeSingle();
  if (!sub || sub.kind !== "PROGRESS_UPDATE" || !sub.milestone_id || sub.percent_complete == null) return { error: "This update has no milestone to apply to." };
  if (sub.applied_at) return { error: "Already applied." };

  const { data: ms } = await supabase.from("pmc_milestones").select("status").eq("id", sub.milestone_id).maybeSingle();
  const patch: Record<string, unknown> = { percent_complete: sub.percent_complete, updated_at: new Date().toISOString() };
  if (sub.percent_complete >= 100) {
    patch.status = "COMPLETE";
    patch.actual_date = new Date().toISOString().slice(0, 10);
  } else if (ms?.status === "PLANNED" && sub.percent_complete > 0) {
    patch.status = "ON_TRACK";
  }
  const { error } = await supabase.from("pmc_milestones").update(patch).eq("id", sub.milestone_id);
  if (error) return { error: toSafeErrorMessage(error) };
  await supabase.from("contractor_submissions").update({ applied_at: new Date().toISOString(), status: "RESPONDED", updated_at: new Date().toISOString() }).eq("id", id);
  await supabase.rpc("write_audit", { p_entity: "pmc_milestone", p_entity_id: sub.milestone_id, p_action: "UPDATE", p_before: null, p_after: { percent_complete: sub.percent_complete, via: "contractor progress update" } });

  revalidatePath("/contractor-tickets");
  return { ok: "Applied to the milestone." };
}

export async function postStudioMessage(_prev: TicketActionState, formData: FormData): Promise<TicketActionState> {
  const submissionId = String(formData.get("submissionId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!submissionId) return { error: "Missing thread." };
  if (!body) return { error: "Write a message." };
  if (body.length > 2000) return { error: "Keep a message under 2,000 characters." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again." };
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  const { error } = await supabase.from("submission_messages").insert({
    contractor_submission_id: submissionId,
    author_id: user.id,
    author_name: profile?.full_name?.trim() || "Studio",
    author_side: "FIRM",
    body,
  });
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath("/contractor-tickets");
  return { ok: "Sent." };
}
