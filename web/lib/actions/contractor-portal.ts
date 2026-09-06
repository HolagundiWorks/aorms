"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

/**
 * Contractor Portal — sealed tender bid submission. Port of
 * backend/src/modules/contractor/portal.ts's `submitBid`/`decline`.
 * RLS (migration 0021) enforces ownership (a contractor can only touch
 * their own invitation/bid — sealed from every other contractor by
 * construction, no separate "sealed view" needed) and the allowed
 * `tender_invitations.status` transitions; the "tender must still be OPEN"
 * timing rule is enforced here at the app layer (same split the old
 * router used implicitly via its own procedure body — not yet a DB
 * trigger, flagged as a follow-up like the other business-rule checks
 * this pass deferred rather than rushed into a broad RLS policy).
 */

export type ContractorActionState = { error: string } | null;

export async function submitBid(
  _prev: ContractorActionState,
  formData: FormData,
): Promise<ContractorActionState> {
  const invitationId = String(formData.get("invitationId") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const completionWeeksRaw = String(formData.get("completionWeeks") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!invitationId) return { error: "Missing invitation." };
  const amountPaise = amountRaw ? Math.round(Number(amountRaw) * 100) : NaN;
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) return { error: "Enter a valid bid amount." };
  const completionWeeks = completionWeeksRaw ? Number(completionWeeksRaw) : null;
  if (completionWeeks != null && (!Number.isFinite(completionWeeks) || completionWeeks <= 0)) {
    return { error: "Completion time must be a positive number of weeks." };
  }

  const supabase = await createClient();

  const { data: invitation, error: invError } = await supabase
    .from("tender_invitations")
    .select("id, status, tenders(status)")
    .eq("id", invitationId)
    .maybeSingle();
  if (invError) return { error: invError.message };
  if (!invitation) return { error: "Invitation not found." };
  const tender = Array.isArray(invitation.tenders) ? invitation.tenders[0] : invitation.tenders;
  if (tender?.status !== "OPEN") return { error: "Bidding is only open while the tender is OPEN." };
  if (invitation.status === "DECLINED") return { error: "You declined this invitation." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("tender_bids")
    .select("id")
    .eq("invitation_id", invitationId)
    .maybeSingle();

  const payload = {
    amount_paise: amountPaise,
    completion_weeks: completionWeeks,
    notes,
    submitted_by_id: user?.id ?? null,
  };

  const { error } = existing
    ? await supabase.from("tender_bids").update(payload).eq("id", existing.id)
    : await supabase.from("tender_bids").insert({ invitation_id: invitationId, ...payload });
  if (error) return { error: error.message };

  const { error: statusError } = await supabase
    .from("tender_invitations")
    .update({ status: "SUBMITTED" })
    .eq("id", invitationId);
  if (statusError) return { error: statusError.message };

  revalidatePath(`/contractor-portal/${invitationId}`);
  revalidatePath("/contractor-portal");
  return null;
}

export async function declineInvitation(invitationId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: invitation, error: invError } = await supabase
    .from("tender_invitations")
    .select("status")
    .eq("id", invitationId)
    .maybeSingle();
  if (invError) return { error: invError.message };
  if (invitation?.status === "SUBMITTED") return { error: "Cannot decline after submitting a bid." };

  const { error } = await supabase.from("tender_invitations").update({ status: "DECLINED" }).eq("id", invitationId);
  if (error) return { error: error.message };

  revalidatePath(`/contractor-portal/${invitationId}`);
  revalidatePath("/contractor-portal");
  return {};
}

/** Stamps VIEWED on first open — called from the detail page's Server Component. */
export async function markInvitationViewed(invitationId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("tender_invitations")
    .update({ status: "VIEWED", viewed_at: new Date().toISOString() })
    .eq("id", invitationId)
    .eq("status", "INVITED");
}
