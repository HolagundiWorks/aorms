"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

type ActionState = { error: string } | null;

async function getBrief(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string) {
  const { data } = await supabase.from("project_briefs").select("*").eq("project_id", projectId).maybeSingle();
  return data;
}

async function upsertBrief(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  patch: Record<string, unknown>,
) {
  return supabase
    .from("project_briefs")
    .upsert({ project_id: projectId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "project_id" })
    .select("id, approved_at")
    .single();
}

function blockIfApproved(brief: { approved_at: string | null } | null | undefined): string | null {
  if (brief?.approved_at) {
    return "This brief was approved — reopen the Approval section before making further changes.";
  }
  return null;
}

// --- 1. Basic info ----------------------------------------------------------

export async function saveBasicInfo(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const existing = await getBrief(supabase, projectId);
  const blocked = blockIfApproved(existing);
  if (blocked) return { error: blocked };

  const basicInfo = {
    clientName: String(formData.get("clientName") ?? "").trim() || undefined,
    currentAddress: String(formData.get("currentAddress") ?? "").trim() || undefined,
    siteAddress: String(formData.get("siteAddress") ?? "").trim() || undefined,
    mobile: String(formData.get("mobile") ?? "").trim() || undefined,
    email: String(formData.get("email") ?? "").trim() || undefined,
    occupation: String(formData.get("occupation") ?? "").trim() || undefined,
    plotSize: String(formData.get("plotSize") ?? "").trim() || undefined,
    terrain: String(formData.get("terrain") ?? "").trim() || undefined,
    vegetation: String(formData.get("vegetation") ?? "").trim() || undefined,
    orientationNotes: String(formData.get("orientationNotes") ?? "").trim() || undefined,
  };

  const { data: row, error } = await upsertBrief(supabase, projectId, { basic_info: basicInfo });
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_brief",
    p_entity_id: row.id,
    p_action: "UPDATE",
    p_before: null,
    p_after: { section: "basicInfo" },
  });

  revalidatePath(`/projects/${projectId}/brief`);
  return null;
}

// --- 2. Project info ---------------------------------------------------------

export async function saveProjectInfo(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const existing = await getBrief(supabase, projectId);
  const blocked = blockIfApproved(existing);
  if (blocked) return { error: blocked };

  const builtUp = String(formData.get("builtUpAreaSqm") ?? "").trim();
  const projectInfo = {
    intendedUse: String(formData.get("intendedUse") ?? "").trim() || undefined,
    builtUpAreaSqm: builtUp ? Number(builtUp) : undefined,
    phasedConstruction: formData.get("phasedConstruction") === "on",
    tentativeStart: String(formData.get("tentativeStart") ?? "").trim() || undefined,
    budgetNote: String(formData.get("budgetNote") ?? "").trim() || undefined,
    financeNote: String(formData.get("financeNote") ?? "").trim() || undefined,
  };

  const { data: row, error } = await upsertBrief(supabase, projectId, { project_info: projectInfo });
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_brief",
    p_entity_id: row.id,
    p_action: "UPDATE",
    p_before: null,
    p_after: { section: "projectInfo" },
  });

  revalidatePath(`/projects/${projectId}/brief`);
  return null;
}

// --- 3. Occupants ------------------------------------------------------------

export async function saveStaffRequirements(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const existing = await getBrief(supabase, projectId);
  const blocked = blockIfApproved(existing);
  if (blocked) return { error: blocked };

  const staffRequirements = String(formData.get("staffRequirements") ?? "").trim() || undefined;
  const household = Array.isArray((existing?.occupants as { household?: unknown[] })?.household)
    ? (existing!.occupants as { household: unknown[] }).household
    : [];

  const { data: row, error } = await upsertBrief(supabase, projectId, { occupants: { household, staffRequirements } });
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_brief",
    p_entity_id: row.id,
    p_action: "UPDATE",
    p_before: null,
    p_after: { section: "occupants" },
  });

  revalidatePath(`/projects/${projectId}/brief`);
  return null;
}

export async function addHouseholdMember(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const existing = await getBrief(supabase, projectId);
  const blocked = blockIfApproved(existing);
  if (blocked) return { error: blocked };

  const occupants = (existing?.occupants as { household?: unknown[]; staffRequirements?: string }) ?? {};
  const household = Array.isArray(occupants.household) ? [...occupants.household] : [];
  const ageRaw = String(formData.get("age") ?? "").trim();
  household.push({
    name,
    relation: String(formData.get("relation") ?? "").trim() || undefined,
    age: ageRaw ? Number(ageRaw) : undefined,
    occupation: String(formData.get("occupation") ?? "").trim() || undefined,
  });

  const { data: row, error } = await upsertBrief(supabase, projectId, {
    occupants: { ...occupants, household },
  });
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_brief",
    p_entity_id: row.id,
    p_action: "UPDATE",
    p_before: null,
    p_after: { section: "occupants", addedMember: name },
  });

  revalidatePath(`/projects/${projectId}/brief`);
  return null;
}

export async function removeHouseholdMember(projectId: string, index: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const existing = await getBrief(supabase, projectId);
  const blocked = blockIfApproved(existing);
  if (blocked) return { error: blocked };

  const occupants = (existing?.occupants as { household?: unknown[] }) ?? {};
  const household = Array.isArray(occupants.household) ? [...occupants.household] : [];
  household.splice(index, 1);

  const { error } = await supabase
    .from("project_briefs")
    .update({ occupants: { ...occupants, household }, updated_at: new Date().toISOString() })
    .eq("project_id", projectId);
  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}/brief`);
  return {};
}

// --- 4. Design preferences ---------------------------------------------------

export async function saveDesignPrefs(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const existing = await getBrief(supabase, projectId);
  const blocked = blockIfApproved(existing);
  if (blocked) return { error: blocked };

  const fields = [
    "orientation", "doorDirection", "views", "basement", "vastu",
    "style", "lovedPlaces", "activities", "indoorPrefs", "outdoorPrefs",
  ] as const;
  const designPrefs: Record<string, string | undefined> = {};
  for (const f of fields) {
    designPrefs[f] = String(formData.get(f) ?? "").trim() || undefined;
  }

  const { data: row, error } = await upsertBrief(supabase, projectId, { design_prefs: designPrefs });
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_brief",
    p_entity_id: row.id,
    p_action: "UPDATE",
    p_before: null,
    p_after: { section: "designPrefs" },
  });

  revalidatePath(`/projects/${projectId}/brief`);
  return null;
}

// --- 5. Accommodation schedule -----------------------------------------------

export async function addSpaceRow(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!code) return { error: "Code is required." };
  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const existing = await getBrief(supabase, projectId);
  const blocked = blockIfApproved(existing);
  if (blocked) return { error: blocked };

  const spaceSchedule = Array.isArray(existing?.space_schedule) ? [...existing!.space_schedule] : [];
  const areaRaw = String(formData.get("areaSqm") ?? "").trim();
  spaceSchedule.push({
    code,
    title,
    areaSqm: areaRaw ? Number(areaRaw) : undefined,
    floor: String(formData.get("floor") ?? "").trim() || undefined,
    description: String(formData.get("description") ?? "").trim() || undefined,
  });

  const { data: row, error } = await upsertBrief(supabase, projectId, { space_schedule: spaceSchedule });
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_brief",
    p_entity_id: row.id,
    p_action: "UPDATE",
    p_before: null,
    p_after: { section: "spaceSchedule", addedCode: code },
  });

  revalidatePath(`/projects/${projectId}/brief`);
  return null;
}

export async function removeSpaceRow(projectId: string, index: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const existing = await getBrief(supabase, projectId);
  const blocked = blockIfApproved(existing);
  if (blocked) return { error: blocked };

  const spaceSchedule = Array.isArray(existing?.space_schedule) ? [...existing!.space_schedule] : [];
  spaceSchedule.splice(index, 1);

  const { error } = await supabase
    .from("project_briefs")
    .update({ space_schedule: spaceSchedule, updated_at: new Date().toISOString() })
    .eq("project_id", projectId);
  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}/brief`);
  return {};
}

// --- 6. Materials -------------------------------------------------------------

export async function saveMaterials(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const existing = await getBrief(supabase, projectId);
  const blocked = blockIfApproved(existing);
  if (blocked) return { error: blocked };

  const fields = ["construction", "flooring", "walls", "cabinetry", "seating", "beds"] as const;
  const materials: Record<string, string | undefined> = {};
  for (const f of fields) {
    materials[f] = String(formData.get(f) ?? "").trim() || undefined;
  }

  const { data: row, error } = await upsertBrief(supabase, projectId, { materials });
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_brief",
    p_entity_id: row.id,
    p_action: "UPDATE",
    p_before: null,
    p_after: { section: "materials" },
  });

  revalidatePath(`/projects/${projectId}/brief`);
  return null;
}

// --- 7. Room details (keyed to space schedule rows) --------------------------

export async function addRoomDetail(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const roomCode = String(formData.get("roomCode") ?? "").trim();
  if (!roomCode) return { error: "Select a space." };

  const supabase = await createClient();
  const existing = await getBrief(supabase, projectId);
  const blocked = blockIfApproved(existing);
  if (blocked) return { error: blocked };

  const roomDetails = Array.isArray(existing?.room_details) ? [...existing!.room_details] : [];
  roomDetails.push({
    roomCode,
    ambience: String(formData.get("ambience") ?? "").trim() || undefined,
    lighting: String(formData.get("lighting") ?? "").trim() || undefined,
    flooring: String(formData.get("flooring") ?? "").trim() || undefined,
    furniture: String(formData.get("furniture") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });

  const { data: row, error } = await upsertBrief(supabase, projectId, { room_details: roomDetails });
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_brief",
    p_entity_id: row.id,
    p_action: "UPDATE",
    p_before: null,
    p_after: { section: "roomDetails", roomCode },
  });

  revalidatePath(`/projects/${projectId}/brief`);
  return null;
}

export async function removeRoomDetail(projectId: string, index: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const existing = await getBrief(supabase, projectId);
  const blocked = blockIfApproved(existing);
  if (blocked) return { error: blocked };

  const roomDetails = Array.isArray(existing?.room_details) ? [...existing!.room_details] : [];
  roomDetails.splice(index, 1);

  const { error } = await supabase
    .from("project_briefs")
    .update({ room_details: roomDetails, updated_at: new Date().toISOString() })
    .eq("project_id", projectId);
  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}/brief`);
  return {};
}

// --- 8. Assumptions -----------------------------------------------------------

export async function saveAssumptions(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const existing = await getBrief(supabase, projectId);
  const blocked = blockIfApproved(existing);
  if (blocked) return { error: blocked };

  const assumptions = String(formData.get("assumptions") ?? "").trim() || null;

  const { data: row, error } = await upsertBrief(supabase, projectId, { assumptions });
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_brief",
    p_entity_id: row.id,
    p_action: "UPDATE",
    p_before: null,
    p_after: { section: "assumptions" },
  });

  revalidatePath(`/projects/${projectId}/brief`);
  return null;
}

// --- 9. Approval ---------------------------------------------------------------

export async function approveBrief(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const approvalNote = String(formData.get("approvalNote") ?? "").trim() || null;
  const approvedAt = String(formData.get("approvedAt") ?? "").trim() || new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data: row, error } = await upsertBrief(supabase, projectId, { approval_note: approvalNote, approved_at: approvedAt });
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_brief",
    p_entity_id: row.id,
    p_action: "APPROVE",
    p_before: null,
    p_after: { approvedAt },
  });

  revalidatePath(`/projects/${projectId}/brief`);
  return null;
}

export async function reopenBrief(projectId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_briefs")
    .update({ approved_at: null, updated_at: new Date().toISOString() })
    .eq("project_id", projectId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_brief",
    p_entity_id: projectId,
    p_action: "REOPEN",
    p_before: null,
    p_after: null,
  });

  revalidatePath(`/projects/${projectId}/brief`);
  return {};
}
