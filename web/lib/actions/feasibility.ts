"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

/**
 * Port of feasibility.generate (backend/src/modules/projectos/feasibility.ts)
 * minus the render_pdf enqueue — the Python worker isn't wired up to this
 * app (same Phase 6 gap every other render target has). pdf_status stays
 * NONE rather than PENDING, since nothing will ever process a PENDING job
 * here — honest about the gap rather than implying a job is in flight.
 */
export async function generateFeasibilityReport(projectId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: assessment, error: assessmentError } = await supabase
    .from("pre_project_assessments")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (assessmentError) return { error: assessmentError.message };
  if (!assessment) return { error: "Record a pre-project assessment first." };

  const { data: project, error: projectError } = await supabase
    .from("project_offices")
    .select("ref, title")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) return { error: projectError.message };
  if (!project) return { error: "Project not found." };

  const now = new Date().toISOString();
  const snapshot = {
    projectRef: project.ref,
    projectTitle: project.title,
    siteAreaSqm: assessment.site_area_sqm,
    permissibleFarArea: assessment.permissible_far_area,
    setbackBuildableArea: assessment.setback_buildable_area,
    actualGroundCoverage: assessment.actual_ground_coverage,
    possibleFloors: assessment.possible_floors,
    superBuiltupArea: assessment.super_builtup_area,
    estimatedProjectCostPaise: assessment.estimated_project_cost_paise,
    constructionRatePaise: assessment.construction_rate_paise,
    estimatedTimeline: null,
    compliancePct: null,
    breakdown: assessment.breakdown,
    generatedAt: now,
  };

  const shareToken = randomBytes(16).toString("hex");

  const { data: inserted, error } = await supabase
    .from("feasibility_reports")
    .insert({
      project_id: projectId,
      assessment_id: assessment.id,
      snapshot,
      generated_at: now,
      share_token: shareToken,
      pdf_status: "NONE",
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "feasibility_report",
    p_entity_id: inserted.id,
    p_action: "GENERATE",
    p_before: null,
    p_after: { projectId, shareToken },
  });

  revalidatePath(`/projects/${projectId}/feasibility`);
  return {};
}
