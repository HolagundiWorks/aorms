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
import { uploadContractorAttachment } from "../contractor/attachments";
import { createServiceRoleClient } from "../supabase/service";
import { notifyStudio } from "../contractor/notify";

export type ContractorProjectActionState = { error: string } | { ok: string } | null;

const KINDS = ["TICKET", "MEETING_REQUEST", "RFI", "PROGRESS_UPDATE", "SITE_VISIT", "JOINT_MEASUREMENT", "NOTE"] as const;

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
  if ((kind === "SITE_VISIT" || kind === "JOINT_MEASUREMENT") && preferred) body = `Requested date: ${preferred}${body ? `\n\n${body}` : ""}`;
  const milestoneId = String(formData.get("milestoneId") ?? "").trim() || null;
  const percentRaw = String(formData.get("percentComplete") ?? "").trim();
  const percent = percentRaw === "" ? null : Math.round(Number(percentRaw));
  if (percent !== null && (!Number.isFinite(percent) || percent < 0 || percent > 100)) return { error: "Percent complete must be between 0 and 100." };
  if (kind === "PROGRESS_UPDATE" && (!milestoneId || percent === null)) return { error: "Choose the milestone and its percent complete." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in again." };
  const { data: profile } = await supabase.from("profiles").select("contractor_id, firm_id").eq("id", user.id).maybeSingle();
  if (!profile?.contractor_id) return { error: "Your account isn't linked to a contractor record." };

  let storageKey: string | null = null;
  let fileName: string | null = null;
  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    // Only for a project this contractor really works on (the same RLS-scoped list the portal shows).
    const { data: mine } = await supabase.rpc("my_contractor_projects");
    if (!((mine ?? []) as { project_id: string }[]).some((r) => r.project_id === projectId)) return { error: "That isn't one of your projects." };
    const up = await uploadContractorAttachment(projectId, file);
    if ("error" in up) return { error: up.error };
    storageKey = up.storageKey;
    fileName = up.fileName;
  }

  // RLS (contractor_submissions: contractor own insert) checks the contractor, the project and the author.
  const { error } = await supabase.from("contractor_submissions").insert({
    project_id: projectId,
    contractor_id: profile.contractor_id,
    kind,
    subject,
    body: body || null,
    submitted_by_id: user.id,
    storage_key: storageKey,
    file_name: fileName,
    milestone_id: kind === "PROGRESS_UPDATE" ? milestoneId : null,
    percent_complete: kind === "PROGRESS_UPDATE" ? percent : null,
  });
  if (error) return { error: toSafeErrorMessage(error) };

  await notifyStudio(profile.firm_id ?? null, `[AORMS] Contractor ${kind.replaceAll("_", " ").toLowerCase()}: ${subject}`, `${subject}\n\n${body}\n\nOpen Contractor Tickets in the Office Hub to respond.`);

  revalidatePath(`/contractor-portal/projects/${projectId}`);
  return { ok: kind === "MEETING_REQUEST" ? "Meeting request sent." : kind === "PROGRESS_UPDATE" ? "Progress update sent for the studio to apply." : "Sent to the studio." };
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
    const { data: me } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("contractor_id, firm_id").eq("id", me.user?.id ?? "").maybeSingle();
    const billFile = formData.get("attachment");
    let upload: { storageKey: string; fileName: string } | null = null;
    if (billFile instanceof File && billFile.size > 0) {
      const up = await uploadContractorAttachment(projectId, billFile);
      if ("error" in up) return { error: up.error };
      upload = up;
    }
    const { data: billId, error } = await supabase.rpc("submit_contractor_ra_bill_lines", {
      p_package: packageId,
      p_bill_no: billNo,
      p_start: periodStart || null,
      p_end: periodEnd || null,
      p_narrative: narrative,
      p_terms: terms as object,
      p_lines: lines as object,
    });
    if (error) return { error: error.message.replace(/^.*?: /, "").slice(0, 160) || toSafeErrorMessage(error) };
    // The bill row exists and is this contractor's (the RPC checked the package); attach the backup via the service role.
    if (upload && billId && prof?.contractor_id) {
      await createServiceRoleClient().from("pmc_ra_bills").update({ attachment_key: upload.storageKey, attachment_name: upload.fileName }).eq("id", billId as string).eq("submitted_by_contractor_id", prof.contractor_id);
    }
    await notifyStudio(prof?.firm_id ?? null, `[AORMS] Contractor running bill ${billNo} submitted`, `A running bill (${billNo}) was submitted for site check. Open Site → RA Bills in the Office Hub.`);
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
