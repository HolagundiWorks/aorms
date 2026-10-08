"use server";

/**
 * Contractor Portal — the working half of a current project (2026-10-08): raising tickets and meeting requests, posting
 * progress updates and messages to the studio, and submitting running (RA) bills. Reads are RLS-scoped (migration 0099:
 * a contractor sees only projects where they hold an awarded package or tender); the two writes that need more than a
 * row check — minting a bill reference and validating the package — go through `submit_contractor_ra_bill()`.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { toSafeErrorMessage } from "../security/safe-error";

export type ContractorProjectActionState = { error: string } | { ok: string } | null;

const KINDS = ["TICKET", "MEETING_REQUEST", "RFI", "PROGRESS_UPDATE", "NOTE"] as const;

export async function raiseContractorSubmission(_prev: ContractorProjectActionState, formData: FormData): Promise<ContractorProjectActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  let body = String(formData.get("body") ?? "").trim();
  const preferred = String(formData.get("preferredDate") ?? "").trim();

  if (!projectId) return { error: "Missing project." };
  if (!(KINDS as readonly string[]).includes(kind)) return { error: "Choose what you are sending." };
  if (!subject) return { error: "Add a subject." };
  if (subject.length > 200) return { error: "Keep the subject under 200 characters." };
  if (body.length > 4000) return { error: "Keep the details under 4,000 characters." };
  if (kind === "MEETING_REQUEST" && preferred) body = `Preferred date: ${preferred}${body ? `\n\n${body}` : ""}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again." };
  const { data: profile } = await supabase.from("profiles").select("contractor_id").eq("id", user.id).maybeSingle();
  if (!profile?.contractor_id) return { error: "Your account isn't linked to a contractor record." };

  // RLS (contractor_submissions: contractor own insert) checks the contractor, the project and the author.
  const { error } = await supabase.from("contractor_submissions").insert({
    project_id: projectId,
    contractor_id: profile.contractor_id,
    kind,
    subject,
    body: body || null,
    submitted_by_id: user.id,
  });
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath(`/contractor-portal/projects/${projectId}`);
  return { ok: kind === "MEETING_REQUEST" ? "Meeting request sent." : "Sent to the studio." };
}

export async function postContractorMessage(_prev: ContractorProjectActionState, formData: FormData): Promise<ContractorProjectActionState> {
  const submissionId = String(formData.get("submissionId") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!submissionId || !projectId) return { error: "Missing thread." };
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
    author_name: profile?.full_name?.trim() || "Contractor",
    author_side: "CONTRACTOR",
    body,
  });
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath(`/contractor-portal/projects/${projectId}`);
  return { ok: "Sent." };
}

export async function submitRaBill(_prev: ContractorProjectActionState, formData: FormData): Promise<ContractorProjectActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const packageId = String(formData.get("packageId") ?? "").trim();
  const billNo = String(formData.get("billNo") ?? "").trim();
  const periodStart = String(formData.get("periodStart") ?? "").trim();
  const periodEnd = String(formData.get("periodEnd") ?? "").trim();
  const grossRaw = String(formData.get("gross") ?? "").trim();
  const narrative = String(formData.get("narrative") ?? "").trim();
  const linesRaw = String(formData.get("lines") ?? "").trim();

  if (!projectId || !packageId) return { error: "Missing package." };

  // Measurement-line bill (AQC RunningBill): lines + statutory terms; the database recomputes every amount.
  if (linesRaw) {
    let lines: unknown;
    let terms: unknown;
    try {
      lines = JSON.parse(linesRaw);
      terms = JSON.parse(String(formData.get("terms") ?? "{}"));
    } catch {
      return { error: "The bill lines could not be read." };
    }
    const supabase = await createClient();
    const { error } = await supabase.rpc("submit_contractor_ra_bill_lines", {
      p_package: packageId,
      p_bill_no: billNo,
      p_start: periodStart || null,
      p_end: periodEnd || null,
      p_narrative: narrative,
      p_terms: terms as object,
      p_lines: lines as object,
    });
    if (error) return { error: error.message.replace(/^.*?: /, "").slice(0, 160) || toSafeErrorMessage(error) };
    revalidatePath(`/contractor-portal/projects/${projectId}`);
    return { ok: "Bill submitted to the studio for site check." };
  }

  const grossPaise = grossRaw ? Math.round(Number(grossRaw.replaceAll(",", "")) * 100) : NaN;
  if (!Number.isFinite(grossPaise) || grossPaise <= 0) return { error: "Enter the gross amount claimed in rupees." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_contractor_ra_bill", {
    p_package: packageId,
    p_bill_no: billNo,
    p_start: periodStart || null,
    p_end: periodEnd || null,
    p_gross: grossPaise,
    p_narrative: narrative,
  });
  if (error) return { error: error.message.replace(/^.*?: /, "").slice(0, 160) || toSafeErrorMessage(error) };

  revalidatePath(`/contractor-portal/projects/${projectId}`);
  return { ok: "Bill submitted to the studio for site check." };
}
