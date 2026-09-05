"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { generatePdfForTarget } from "../jobs/generate-pdf";

export type ProposalActionState = { error: string } | null;

export async function createProposalRecord(
  _prev: ProposalActionState,
  formData: FormData,
): Promise<ProposalActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const workCategory = String(formData.get("workCategory") ?? "").trim();
  const workType = String(formData.get("workType") ?? "ARCHITECTURE");
  const feeBasis = String(formData.get("feeBasis") ?? "COA_PERCENT");
  const costOfWorksRaw = String(formData.get("costOfWorksPaise") ?? "").trim();
  const feeRaw = String(formData.get("feePaise") ?? "").trim();
  const scope = String(formData.get("scope") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!projectId) return { error: "Project is required." };
  if (!workCategory) return { error: "Work category is required." };

  const costOfWorksPaise = costOfWorksRaw ? Math.round(Number(costOfWorksRaw) * 100) : 0;
  const feePaise = feeRaw ? Math.round(Number(feeRaw) * 100) : 0;
  if (!Number.isFinite(costOfWorksPaise) || !Number.isFinite(feePaise)) {
    return { error: "Cost of works and fee must be numbers." };
  }

  const supabase = await createClient();

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "proposal",
    p_default_prefix: "PRP",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("proposals")
    .insert({
      ref: refData,
      project_id: projectId,
      work_category: workCategory,
      work_type: workType,
      fee_basis: feeBasis,
      cost_of_works_paise: costOfWorksPaise,
      fee_paise: feePaise,
      scope,
      notes,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "proposal",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, projectId, workCategory, workType, feeBasis, costOfWorksPaise, feePaise },
  });

  revalidatePath("/proposals");
  return null;
}

/**
 * Phase 6 enqueue boundary (docs/esti/NEXTJS-MIGRATION-PHASE6-AUDIT.md).
 * Targets "feeproposal" — worker/esti_worker/jobs/pdf.py's `_RENDERERS` has
 * both "feeproposal" and "proposal" keys (two HTML templates) reading the
 * same unified `proposals` table now, but only the feeproposal template
 * prints the COA fee-scale breakdown (work_category/fee_basis/cost_of_works/
 * doc_comm_pct) this screen's own fields are actually about.
 */
export async function generateProposalPdf(proposalId: string): Promise<{ error: string } | null> {
  const supabase = await createClient();
  return generatePdfForTarget({
    supabase,
    table: "proposals",
    target: "feeproposal",
    id: proposalId,
    revalidate: "/proposals",
  });
}
