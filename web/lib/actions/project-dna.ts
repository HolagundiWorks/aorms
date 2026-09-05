"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

type ActionState = { error: string } | null;

const ENUM_FIELDS = [
  "budgetMode",
  "vastuRequirement",
  "designLanguage",
  "designFlexibility",
  "decisionMakers",
  "timelineCriticality",
  "materialExpectation",
  "revisionTolerance",
] as const;

export async function saveProjectDna(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const values: Record<string, string> = {};
  for (const field of ENUM_FIELDS) {
    const v = String(formData.get(field) ?? "").trim();
    if (!v) return { error: `${field} is required.` };
    values[field] = v;
  }
  const customNotes = String(formData.get("customNotes") ?? "").trim() || null;

  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("project_dnas")
    .upsert(
      {
        project_id: projectId,
        budget_mode: values.budgetMode,
        vastu_requirement: values.vastuRequirement,
        design_language: values.designLanguage,
        design_flexibility: values.designFlexibility,
        decision_makers: values.decisionMakers,
        timeline_criticality: values.timelineCriticality,
        material_expectation: values.materialExpectation,
        revision_tolerance: values.revisionTolerance,
        custom_notes: customNotes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" },
    )
    .select("id")
    .single();
  if (error) return { error: error.message };

  // Backlink onto the project (used for schema fidelity with the original
  // esti_projectoffice.dna_id — the activation gate itself queries
  // project_dnas by project_id directly, not through this column).
  await supabase.from("project_offices").update({ dna_id: row.id }).eq("id", projectId);

  await supabase.rpc("write_audit", {
    p_entity: "project_dna",
    p_entity_id: row.id,
    p_action: "UPSERT",
    p_before: null,
    p_after: values,
  });

  revalidatePath(`/projects/${projectId}/dna`);
  return null;
}
