"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { canTransition, evaluateActivationGate, type ProjectStatus } from "../project-os";

/**
 * Port of gatherActivationGate() + the activate mutation
 * (backend/src/modules/projectoffice/router.ts) — gathers the six booleans
 * straight off the spine tables (not through the project_offices.dna_id/
 * assessment_id backlink columns, matching the original's own query shape)
 * and evaluates evaluateActivationGate() before flipping status to ACTIVE.
 */
export async function getActivationGate(projectId: string) {
  const supabase = await createClient();

  const [{ data: project }, { data: dna }, { data: assessment }, { data: fee }, { data: onboarding }, { data: advance }] =
    await Promise.all([
      supabase.from("project_offices").select("status").eq("id", projectId).maybeSingle(),
      supabase.from("project_dnas").select("id").eq("project_id", projectId).maybeSingle(),
      supabase.from("pre_project_assessments").select("id").eq("project_id", projectId).maybeSingle(),
      supabase.from("proposals").select("id").eq("project_id", projectId).eq("client_approval_status", "APPROVED").limit(1).maybeSingle(),
      supabase.from("client_onboardings").select("status").eq("project_id", projectId).maybeSingle(),
      supabase.from("invoices").select("id").eq("project_id", projectId).eq("is_advance", true).eq("status", "PAID").limit(1).maybeSingle(),
    ]);

  return evaluateActivationGate({
    status: (project?.status as ProjectStatus) ?? "ENQUIRY",
    hasDna: !!dna,
    hasAssessment: !!assessment,
    feeApproved: !!fee,
    onboardingComplete: onboarding?.status === "COMPLETE",
    advancePaid: !!advance,
  });
}

/**
 * Port of assertLegalTransition() (backend/src/modules/projectoffice/
 * router.ts) — enforces the draft-project status state machine for any
 * manual status change. Activation (-> ACTIVE from anything but ON_HOLD)
 * is deliberately excluded here; that only ever happens through
 * activateProject() below. ENQUIRY -> PROPOSAL additionally requires a
 * captured Project DNA.
 */
export async function updateProjectStatus(projectId: string, to: ProjectStatus): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: project } = await supabase.from("project_offices").select("status").eq("id", projectId).maybeSingle();
  if (!project) return { error: "Project not found." };
  const from = project.status as ProjectStatus;

  if (from === to) return {};
  if (to === "ACTIVE" && from !== "ON_HOLD") {
    return { error: "Use the activation gate to make a project ACTIVE." };
  }
  if (!canTransition(from, to)) {
    return { error: `Cannot move a ${from} project to ${to}.` };
  }
  if (from === "ENQUIRY" && to === "PROPOSAL") {
    const { data: dna } = await supabase.from("project_dnas").select("id").eq("project_id", projectId).maybeSingle();
    if (!dna) return { error: "Capture the Project DNA before moving to Proposal." };
  }

  const { error } = await supabase.from("project_offices").update({ status: to, updated_at: new Date().toISOString() }).eq("id", projectId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_office",
    p_entity_id: projectId,
    p_action: "STATUS",
    p_before: { status: from },
    p_after: { status: to },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return {};
}

export async function activateProject(projectId: string): Promise<{ error?: string }> {
  const gate = await getActivationGate(projectId);
  if (!gate.ok) {
    return { error: `Cannot activate: ${gate.blockingReason}` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_offices")
    .update({ status: "ACTIVE", updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "project_office",
    p_entity_id: projectId,
    p_action: "ACTIVATE",
    p_before: null,
    p_after: { status: "ACTIVE" },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return {};
}
