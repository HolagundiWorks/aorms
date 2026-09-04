"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import type { CpiReportShape } from "../cpi-sections";

/**
 * Called directly from client components (not via useActionState/<form
 * action>) since section answers are arbitrary shapes (numbers, arrays,
 * rank maps) rather than FormData — a plain async server action works
 * fine called from a client onClick handler.
 *
 * generateReport (ESTI drafting the report from saved sections) isn't
 * ported — same open AI-gateway-architecture question Phase 7's audit
 * already flagged, unrelated to this table. saveReport works standalone:
 * an architect can type the report directly, no AI required.
 */
export async function saveCpiSection(
  projectId: string,
  section: string,
  data: Record<string, unknown>,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("cpi_responses")
    .select("sections")
    .eq("project_id", projectId)
    .maybeSingle();

  const sections = { ...((existing?.sections as Record<string, unknown>) ?? {}), [section]: data };

  const { error } = await supabase
    .from("cpi_responses")
    .upsert(
      { project_id: projectId, sections, updated_at: new Date().toISOString() },
      { onConflict: "project_id" },
    );

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "cpi_response",
    p_entity_id: projectId,
    p_action: "UPDATE",
    p_before: null,
    p_after: { section },
  });

  revalidatePath(`/projects/${projectId}/cpi`);
  return {};
}

export async function saveCpiReport(
  projectId: string,
  report: CpiReportShape,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("cpi_responses")
    .upsert(
      {
        project_id: projectId,
        report,
        report_generated_at: new Date().toISOString(),
        status: "COMPLETE",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" },
    );

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "cpi_response",
    p_entity_id: projectId,
    p_action: "REPORT_SAVED",
    p_before: null,
    p_after: { status: "COMPLETE" },
  });

  revalidatePath(`/projects/${projectId}/cpi`);
  return {};
}
