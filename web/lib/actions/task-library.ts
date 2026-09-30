"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { toSafeErrorMessage } from "../security/safe-error";
import { planTasks, type TaskTemplate } from "../tasks/estimate";
import { STARTER_LIBRARY } from "../tasks/starter-library";

export type LibraryActionState = { error: string } | { ok: string } | null;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Seeds the firm's library with the starter entries it doesn't already have (matched on code). Idempotent. */
export async function loadStarterLibrary(): Promise<{ error?: string; added?: number }> {
  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase.from("task_templates").select("code");
  if (readError) return { error: toSafeErrorMessage(readError) };
  const have = new Set((existing ?? []).map((r) => r.code));
  const rows = STARTER_LIBRARY.filter((e) => !have.has(e.code)).map((e) => ({
    code: e.code,
    title: e.title,
    bundle: e.bundle,
    scope: e.scope,
    area_basis: e.area_basis,
    base_hours: e.base_hours,
    hours_per_100sqm: e.hours_per_100sqm,
    min_hours: e.min_hours ?? null,
    max_hours: e.max_hours ?? null,
    work_type: e.work_type,
    classification: e.classification ?? null,
    difficulty_coefficient: e.difficulty_coefficient ?? 3,
    sequence: e.sequence,
  }));
  if (rows.length === 0) return { added: 0 };
  const { error } = await supabase.from("task_templates").insert(rows);
  if (error) return { error: toSafeErrorMessage(error) };
  revalidatePath("/tasks/library");
  return { added: rows.length };
}

/** Create or update one library entry (id present = update). */
export async function saveTaskTemplate(_prev: LibraryActionState, formData: FormData): Promise<LibraryActionState> {
  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : Number(v);
  };
  const id = String(formData.get("id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const title = String(formData.get("title") ?? "").trim();
  const scope = String(formData.get("scope") ?? "PROJECT");
  let areaBasis = String(formData.get("areaBasis") ?? "BUILT_UP");
  const baseHours = num("baseHours") ?? 0;
  const perHundred = num("hoursPer100sqm") ?? 0;
  const minHours = num("minHours");
  const maxHours = num("maxHours");

  if (!code || !title) return { error: "Code and title are required." };
  if (!["PROJECT", "PER_FLOOR"].includes(scope)) return { error: "Invalid scope." };
  if (scope === "PER_FLOOR" && areaBasis !== "NONE") areaBasis = "FLOOR";
  if (scope === "PROJECT" && areaBasis === "FLOOR") areaBasis = "BUILT_UP";
  if (![baseHours, perHundred].every((n) => Number.isFinite(n) && n >= 0)) return { error: "Hours must be zero or more." };
  if (minHours != null && maxHours != null && minHours > maxHours) return { error: "Minimum hours can't exceed maximum." };

  const row = {
    code,
    title,
    bundle: String(formData.get("bundle") ?? "").trim() || "General",
    scope,
    area_basis: areaBasis,
    base_hours: baseHours,
    hours_per_100sqm: perHundred,
    min_hours: minHours,
    max_hours: maxHours,
    work_type: String(formData.get("workType") ?? "").trim() || null,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("task_templates").update(row).eq("id", id)
    : await supabase.from("task_templates").insert(row);
  if (error) return { error: toSafeErrorMessage(error) };
  revalidatePath("/tasks/library");
  return { ok: id ? "Entry updated." : "Entry added." };
}

export async function deleteTaskTemplate(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("task_templates").delete().eq("id", id);
  if (error) return { error: toSafeErrorMessage(error) };
  revalidatePath("/tasks/library");
  return {};
}

export type GenerateInput = {
  projectId: string;
  templateIds: string[];
  startDate: string;
  complexity: number;
  builtUpAreaSqm: number;
  siteAreaSqm: number;
  floors: { label: string; areaSqm: number }[];
  assigneeId: string | null;
  saveScaleToProject: boolean;
};

/**
 * Expands chosen library entries into concrete tasks bundled to a project,
 * sized from its scale (see lib/tasks/estimate.ts). Inserted as one batch:
 * either every task is created or none is.
 */
export async function generateProjectTasks(input: GenerateInput): Promise<{ error?: string; created?: number }> {
  if (!input.projectId) return { error: "Choose a project." };
  if (input.templateIds.length === 0) return { error: "Select at least one library entry." };
  if (!ISO_DATE.test(input.startDate)) return { error: "Choose a valid start date." };
  if (!(input.complexity >= 0.5 && input.complexity <= 2)) return { error: "Complexity must be between 0.5 and 2." };
  const floors = input.floors.filter((f) => f.label.trim() && Number.isFinite(f.areaSqm) && f.areaSqm > 0);
  if (![input.builtUpAreaSqm, input.siteAreaSqm].every((n) => Number.isFinite(n) && n >= 0)) return { error: "Areas must be zero or more." };

  const supabase = await createClient();
  const { data: templates, error: tErr } = await supabase
    .from("task_templates")
    .select("*")
    .in("id", input.templateIds);
  if (tErr) return { error: toSafeErrorMessage(tErr) };
  const list = (templates ?? []).map((t) => ({
    ...t,
    base_hours: Number(t.base_hours),
    hours_per_100sqm: Number(t.hours_per_100sqm),
    min_hours: t.min_hours == null ? null : Number(t.min_hours),
    max_hours: t.max_hours == null ? null : Number(t.max_hours),
  })) as TaskTemplate[];

  if (list.some((t) => t.scope === "PER_FLOOR") && floors.length === 0) {
    return { error: "Add at least one floor with an area — selected entries are generated per floor." };
  }

  const planned = planTasks(
    list,
    { builtUpAreaSqm: input.builtUpAreaSqm, siteAreaSqm: input.siteAreaSqm, floors },
    input.startDate,
    input.complexity,
  );
  if (planned.length === 0) return { error: "Nothing to generate." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inserted, error } = await supabase
    .from("tasks")
    .insert(
      planned.map((p) => ({
        title: p.title,
        project_id: input.projectId,
        assignee_id: input.assigneeId,
        template_id: p.templateId,
        floor_label: p.floorLabel,
        area_sqm: p.areaSqm,
        estimated_hours: p.estimatedHours,
        start_date: p.startDate,
        due_date: p.dueDate,
        work_type: p.workType,
        classification: p.classification,
        difficulty_coefficient: p.difficulty,
        created_by_id: user?.id ?? null,
      })),
    )
    .select("id");
  if (error) return { error: toSafeErrorMessage(error) };

  if (input.saveScaleToProject) {
    await supabase
      .from("project_offices")
      .update({
        built_up_area_sqm: input.builtUpAreaSqm || null,
        site_area_sqm: input.siteAreaSqm || null,
        floor_count: floors.length || null,
      })
      .eq("id", input.projectId);
  }

  await supabase.rpc("write_audit", {
    p_entity: "project",
    p_entity_id: input.projectId,
    p_action: "GENERATE_TASKS",
    p_before: null,
    p_after: { count: inserted?.length ?? planned.length, templates: input.templateIds.length },
  });

  revalidatePath("/tasks");
  return { created: inserted?.length ?? planned.length };
}
