"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

type ActionState = { error: string } | null;

async function feasibilityEnvelope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<number> {
  const { data } = await supabase.from("pre_project_assessments").select("super_builtup_area").eq("project_id", projectId).maybeSingle();
  return data?.super_builtup_area ?? 0;
}

export async function getOrCreateProgram(projectId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("programs")
    .select("id")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return {};

  const envelope = await feasibilityEnvelope(supabase, projectId);
  const { data: inserted, error } = await supabase
    .from("programs")
    .insert({ project_id: projectId, version: 1, status: "DRAFT", max_built_area_sqm: envelope, created_by_id: user?.id ?? null })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "program",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId },
  });

  revalidatePath(`/projects/${projectId}/program`);
  return {};
}

export async function addProgramSpace(
  programId: string,
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const floorLevel = Number(formData.get("floorLevel") ?? 0);
  const unitAreaSqm = Number(formData.get("unitAreaSqm") ?? 0);
  const count = Number(formData.get("count") ?? 1);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) return { error: "Name is required." };
  if (!category) return { error: "Category is required." };

  const supabase = await createClient();

  const { data: program } = await supabase.from("programs").select("status").eq("id", programId).maybeSingle();
  if (program?.status === "FROZEN") return { error: "A frozen program cannot be edited — create a new version." };

  const { error } = await supabase
    .from("program_spaces")
    .insert({ program_id: programId, name, category, floor_level: floorLevel, unit_area_sqm: unitAreaSqm, count, notes });
  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}/program`);
  return null;
}

export async function freezeProgram(programId: string, projectId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: before } = await supabase.from("programs").select("status").eq("id", programId).maybeSingle();
  if (before?.status === "FROZEN") return { error: "Already frozen." };

  const envelope = await feasibilityEnvelope(supabase, projectId);
  const { error } = await supabase
    .from("programs")
    .update({ status: "FROZEN", max_built_area_sqm: envelope, frozen_at: new Date().toISOString(), frozen_by_id: user?.id ?? null, updated_at: new Date().toISOString() })
    .eq("id", programId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "program",
    p_entity_id: programId,
    p_action: "FREEZE",
    p_before: null,
    p_after: null,
  });

  revalidatePath(`/projects/${projectId}/program`);
  return {};
}

/** Clone the latest FROZEN program into a new DRAFT version. */
export async function newProgramVersion(projectId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: latest, error: latestError } = await supabase
    .from("programs")
    .select("id, version, status, notes")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) return { error: latestError.message };
  if (!latest) return { error: "No program to version." };
  if (latest.status !== "FROZEN") return { error: "Freeze the current draft before starting a new version." };

  const envelope = await feasibilityEnvelope(supabase, projectId);
  const { data: next, error } = await supabase
    .from("programs")
    .insert({ project_id: projectId, version: latest.version + 1, status: "DRAFT", max_built_area_sqm: envelope, notes: latest.notes, created_by_id: user?.id ?? null })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const { data: prevSpaces } = await supabase.from("program_spaces").select("*").eq("program_id", latest.id);
  if (prevSpaces && prevSpaces.length > 0) {
    await supabase.from("program_spaces").insert(
      prevSpaces.map((s) => ({
        program_id: next.id,
        name: s.name,
        category: s.category,
        floor_level: s.floor_level,
        unit_area_sqm: s.unit_area_sqm,
        count: s.count,
        notes: s.notes,
        sort_order: s.sort_order,
      })),
    );
  }

  await supabase.rpc("write_audit", {
    p_entity: "program",
    p_entity_id: next.id,
    p_action: "NEW_VERSION",
    p_before: null,
    p_after: { projectId },
  });

  revalidatePath(`/projects/${projectId}/program`);
  return {};
}
