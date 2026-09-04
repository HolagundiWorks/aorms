"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type ApprovalActionState = { error: string } | null;

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

  if (error) return { error: error.message };

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
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "approval",
    p_entity_id: approvalId,
    p_action: "UPDATE",
    p_before: null,
    p_after: { status },
  });

  revalidatePath("/approvals");
  return {};
}
