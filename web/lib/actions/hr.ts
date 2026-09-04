"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

type ActionState = { error: string } | null;

export async function createAssignment(
  memberId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  if (!projectId) return { error: "Project is required." };
  if (!role) return { error: "Role is required." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("assignments")
    .insert({ project_id: projectId, team_member_id: memberId, role })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "assignment",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, memberId, role },
  });

  revalidatePath(`/team-members/${memberId}`);
  return null;
}

export async function createLeave(
  memberId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const type = String(formData.get("type") ?? "").trim() || "CASUAL";
  const fromDate = String(formData.get("fromDate") ?? "").trim();
  const toDate = String(formData.get("toDate") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!fromDate || !toDate) return { error: "From and to dates are required." };

  const days = (new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86_400_000 + 1;
  if (days <= 0) return { error: "To date must be on or after from date." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("leaves")
    .insert({ team_member_id: memberId, type, from_date: fromDate, to_date: toDate, days, reason })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "leave",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { memberId, type, fromDate, toDate },
  });

  revalidatePath(`/team-members/${memberId}`);
  return null;
}

export async function updateLeaveStatus(memberId: string, leaveId: string, status: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("leaves").update({ status }).eq("id", leaveId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "leave",
    p_entity_id: leaveId,
    p_action: "UPDATE",
    p_before: null,
    p_after: { status },
  });

  revalidatePath(`/team-members/${memberId}`);
  return {};
}

export async function markAttendance(
  memberId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const attendanceDate = String(formData.get("attendanceDate") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() || "PRESENT";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!attendanceDate) return { error: "Date is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inserted, error } = await supabase
    .from("attendance")
    .upsert(
      { team_member_id: memberId, attendance_date: attendanceDate, status, notes, marked_by_id: user?.id ?? null },
      { onConflict: "team_member_id,attendance_date" },
    )
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "attendance",
    p_entity_id: inserted.id,
    p_action: "UPDATE",
    p_before: null,
    p_after: { memberId, attendanceDate, status },
  });

  revalidatePath(`/team-members/${memberId}`);
  return null;
}

/**
 * hr_profiles has 20+ columns (identity docs, both addresses, bank
 * details). This ports a practical subset — DOB/gender/blood group,
 * emergency contact, bank details, PF UAN — not every column; identity
 * document numbers (Aadhaar/PAN/passport/voter/DL) and the address JSONB
 * fields aren't in this form. hr_documents (below) is where the actual
 * ID document files get registered, so this isn't a functional gap, just
 * a smaller form than the full schema allows.
 */
export async function saveHrProfile(
  memberId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim() || null;
  const gender = String(formData.get("gender") ?? "").trim() || null;
  const bloodGroup = String(formData.get("bloodGroup") ?? "").trim() || null;
  const emergencyContactName = String(formData.get("emergencyContactName") ?? "").trim() || null;
  const emergencyContactRelation = String(formData.get("emergencyContactRelation") ?? "").trim() || null;
  const emergencyContactPhone = String(formData.get("emergencyContactPhone") ?? "").trim() || null;
  const bankAccountNumber = String(formData.get("bankAccountNumber") ?? "").trim() || null;
  const bankIfsc = String(formData.get("bankIfsc") ?? "").trim() || null;
  const bankName = String(formData.get("bankName") ?? "").trim() || null;
  const pfUan = String(formData.get("pfUan") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("hr_profiles").upsert(
    {
      member_id: memberId,
      date_of_birth: dateOfBirth,
      gender,
      blood_group: bloodGroup,
      emergency_contact_name: emergencyContactName,
      emergency_contact_relation: emergencyContactRelation,
      emergency_contact_phone: emergencyContactPhone,
      bank_account_number: bankAccountNumber,
      bank_ifsc: bankIfsc,
      bank_name: bankName,
      pf_uan: pfUan,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "member_id" },
  );
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "hr_profile",
    p_entity_id: memberId,
    p_action: "UPDATE",
    p_before: null,
    p_after: { memberId },
  });

  revalidatePath(`/team-members/${memberId}`);
  return null;
}

export async function createHrDocument(
  memberId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const documentType = String(formData.get("documentType") ?? "").trim();
  const documentName = String(formData.get("documentName") ?? "").trim();
  const issueDate = String(formData.get("issueDate") ?? "").trim() || null;
  const expiryDate = String(formData.get("expiryDate") ?? "").trim() || null;

  if (!documentType) return { error: "Document type is required." };
  if (!documentName) return { error: "Document name is required." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("hr_documents")
    .insert({ member_id: memberId, document_type: documentType, document_name: documentName, issue_date: issueDate, expiry_date: expiryDate })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "hr_document",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { memberId, documentType, documentName },
  });

  revalidatePath(`/team-members/${memberId}`);
  return null;
}

export async function grantRewardPoints(
  memberId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const points = Number(formData.get("points") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) return { error: "Reason is required." };
  if (!Number.isFinite(points) || points === 0) return { error: "Points must be a non-zero number." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inserted, error } = await supabase
    .from("reward_points")
    .insert({ team_member_id: memberId, points, reason, created_by_id: user?.id ?? null })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "reward_points",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { memberId, points, reason },
  });

  revalidatePath(`/team-members/${memberId}`);
  return null;
}
