"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { generatePdfForTarget } from "../jobs/generate-pdf";

type ActionState = { error: string } | null;

export async function createProgressReport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const periodStart = String(formData.get("periodStart") ?? "").trim();
  const periodEnd = String(formData.get("periodEnd") ?? "").trim();
  const narrative = String(formData.get("narrative") ?? "").trim() || null;
  const physicalPct = String(formData.get("physicalProgressPct") ?? "").trim();
  const schedulePct = String(formData.get("scheduleProgressPct") ?? "").trim();

  if (!projectId) return { error: "Project is required." };
  if (!periodStart || !periodEnd) return { error: "Period start and end are required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inserted, error } = await supabase
    .from("progress_reports")
    .insert({
      project_id: projectId,
      period_start: periodStart,
      period_end: periodEnd,
      narrative,
      physical_progress_pct: physicalPct ? Number(physicalPct) : null,
      schedule_progress_pct: schedulePct ? Number(schedulePct) : null,
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "progress_report",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, periodStart, periodEnd },
  });

  revalidatePath("/progress-reports");
  return null;
}

export async function issueProgressReport(reportId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("progress_reports").update({ status: "ISSUED", updated_at: new Date().toISOString() }).eq("id", reportId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "progress_report",
    p_entity_id: reportId,
    p_action: "ISSUE",
    p_before: null,
    p_after: { status: "ISSUED" },
  });

  revalidatePath("/progress-reports");
  return {};
}

/** Phase 6 enqueue boundary (docs/esti/NEXTJS-MIGRATION-PHASE6-AUDIT.md). */
export async function generateProgressReportPdf(reportId: string): Promise<{ error: string } | null> {
  const supabase = await createClient();
  return generatePdfForTarget({
    supabase,
    table: "progress_reports",
    target: "progress_report",
    id: reportId,
    revalidate: "/progress-reports",
  });
}
