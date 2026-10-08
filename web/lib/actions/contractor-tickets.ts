"use server";

/**
 * Studio side of the Contractor Portal inbox (2026-10-08): reply to a contractor's ticket / meeting request / RFI /
 * progress update, set its status, and post to the thread. Writes use the staff's own session — RLS
 * (`contractor_submissions: staff write`, `submission_messages: staff write`) is the gate.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { toSafeErrorMessage } from "../security/safe-error";

export type TicketActionState = { error: string } | { ok: string } | null;

export async function respondToContractorSubmission(_prev: TicketActionState, formData: FormData): Promise<TicketActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!id) return { error: "Missing item." };
  if (!["OPEN", "RESPONDED", "RESOLVED"].includes(status)) return { error: "Choose a status." };
  if (note.length > 2000) return { error: "Keep the reply under 2,000 characters." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contractor_submissions")
    .update({ status, response_note: note || null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath("/contractor-tickets");
  return { ok: "Saved." };
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
