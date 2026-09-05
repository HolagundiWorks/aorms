"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { computeAssessment } from "../project-os";

type ActionState = { error: string } | null;

const num = (formData: FormData, key: string): number | null => {
  const raw = String(formData.get(key) ?? "").trim();
  return raw ? Number(raw) : null;
};

/**
 * Recomputes every derived field server-side from the raw inputs on every
 * upsert — the assessment never trusts a client-sent derived value, matching
 * Phase 4's estimate-item recompute and Phase 3's frozen-invoice-snapshot
 * discipline.
 */
export async function saveAssessment(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const farFactor = num(formData, "farFactor");
  const groundCoveragePct = num(formData, "groundCoveragePct");
  if (farFactor == null) return { error: "FAR factor is required." };
  if (groundCoveragePct == null) return { error: "Ground coverage % is required." };

  const input = {
    siteLength: num(formData, "siteLength"),
    siteWidth: num(formData, "siteWidth"),
    manualArea: num(formData, "manualArea"),
    farFactor,
    frontSetback: num(formData, "frontSetback") ?? 0,
    rearSetback: num(formData, "rearSetback") ?? 0,
    leftSetback: num(formData, "leftSetback") ?? 0,
    rightSetback: num(formData, "rightSetback") ?? 0,
    groundCoveragePct,
    superBuiltupFactor: num(formData, "superBuiltupFactor") ?? 1.25,
    constructionRatePaise: Math.round((num(formData, "constructionRate") ?? 0) * 100),
  };
  const d = computeAssessment(input);

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("pre_project_assessments")
    .upsert(
      {
        project_id: projectId,
        site_length: input.siteLength,
        site_width: input.siteWidth,
        manual_area: input.manualArea,
        site_area_sqm: d.siteAreaSqm,
        far_factor: input.farFactor,
        permissible_far_area: d.permissibleFarArea,
        front_setback: input.frontSetback,
        rear_setback: input.rearSetback,
        left_setback: input.leftSetback,
        right_setback: input.rightSetback,
        setback_buildable_area: d.setbackBuildableArea,
        ground_coverage_pct: input.groundCoveragePct,
        coverage_area: d.coverageArea,
        actual_ground_coverage: d.actualGroundCoverage,
        possible_floors: d.possibleFloors,
        super_builtup_factor: input.superBuiltupFactor,
        super_builtup_area: d.superBuiltupArea,
        construction_rate_paise: input.constructionRatePaise,
        estimated_project_cost_paise: d.estimatedProjectCostPaise,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" },
    )
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.from("project_offices").update({ assessment_id: row.id }).eq("id", projectId);

  await supabase.rpc("write_audit", {
    p_entity: "pre_project_assessment",
    p_entity_id: row.id,
    p_action: "UPSERT",
    p_before: null,
    p_after: { projectId, ...d },
  });

  revalidatePath(`/projects/${projectId}/assessment`);
  return null;
}
