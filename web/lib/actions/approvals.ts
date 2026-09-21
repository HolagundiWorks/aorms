"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { toSafeErrorMessage } from "../security/safe-error";

export type ApprovalActionState = { error: string } | null;

/**
 * Roles with `has_capability('write')` (rank >= 40, or an explicit
 * allow-list role) — same set web/lib/actions/clients.ts's WRITE_TIER_ROLES
 * uses, mirrored here as an explicit, friendly-error check in the Server
 * Action (defense in depth): the real authorization boundary is RLS
 * (`approvals: staff write`, migration 0085_write_policies_require_capability.sql).
 * Added 2026-09-21 in the same sweep that found the matching UI gap on
 * `/approvals`' "Log approval" trigger.
 */
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export async function createApproval(
  _prev: ApprovalActionState,
  formData: FormData,
): Promise<ApprovalActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const entityType = String(formData.get("entityType") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const recipient = String(formData.get("recipient") ?? "").trim() || null;
  const channel = String(formData.get("channel") ?? "").trim();
  const sentDate = String(formData.get("sentDate") ?? "").trim() || null;
  const remarks = String(formData.get("remarks") ?? "").trim() || null;

  if (!projectId) return { error: "Project is required." };
  if (!entityType) return { error: "Entity type is required." };
  if (!title) return { error: "Title is required." };
  if (!channel) return { error: "Channel is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: authProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  if (!authProfile || !WRITE_TIER_ROLES.has(authProfile.role)) {
    return { error: "You don't have permission to log approvals — contact a firm owner or partner." };
  }

  const { data: inserted, error } = await supabase
    .from("approvals")
    .insert({
      project_id: projectId,
      entity_type: entityType,
      title,
      recipient,
      channel,
      status: sentDate ? "SENT" : "DRAFT",
      sent_date: sentDate,
      remarks,
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: toSafeErrorMessage(error) };

  await supabase.rpc("write_audit", {
    p_entity: "approval",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, entityType, title, channel },
  });

  revalidatePath("/approvals");
  return null;
}

export type ApprovalStatusActionState = { error?: string };

const NEXT_STATUSES = ["DRAFT", "SENT", "APPROVED", "REVISIONS", "REJECTED", "SUPERSEDED"];

export async function updateApprovalStatus(
  approvalId: string,
  status: string,
): Promise<ApprovalStatusActionState> {
  if (!NEXT_STATUSES.includes(status)) return { error: "Invalid status." };

  const supabase = await createClient();
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "APPROVED" || status === "REJECTED" || status === "REVISIONS") {
    patch.response_date = new Date().toISOString().slice(0, 10);
  }

  const { error } = await supabase.from("approvals").update(patch).eq("id", approvalId);
  if (error) return { error: toSafeErrorMessage(error) };

  await supabase.rpc("write_audit", {
    p_entity: "approval",
    p_entity_id: approvalId,
    p_action: "UPDATE",
    p_before: null,
    p_after: { status },
  });

  revalidatePath("/approvals");
  revalidatePath("/pulse");
  return {};
}
