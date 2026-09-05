"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { generatePdfForTarget } from "../jobs/generate-pdf";

type ActionState = { error: string } | null;

export async function createPayslip(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teamMemberId = String(formData.get("teamMemberId") ?? "").trim();
  const month = String(formData.get("month") ?? "").trim();
  const grossRupees = String(formData.get("gross") ?? "").trim();
  const deductionsRupees = String(formData.get("deductions") ?? "").trim() || "0";

  if (!teamMemberId) return { error: "Team member is required." };
  if (!month) return { error: "Month is required." };
  if (!grossRupees) return { error: "Gross amount is required." };

  const grossPaise = Math.round(Number(grossRupees) * 100);
  const deductionsPaise = Math.round(Number(deductionsRupees) * 100);
  const netPaise = grossPaise - deductionsPaise;

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("payslips")
    .insert({ team_member_id: teamMemberId, month, gross_paise: grossPaise, deductions_paise: deductionsPaise, net_paise: netPaise })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "payslip",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { teamMemberId, month, grossPaise, netPaise },
  });

  revalidatePath("/payslips");
  return null;
}

export async function markPayslipPaid(payslipId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("payslips")
    .update({ paid: true, paid_date: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() })
    .eq("id", payslipId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "payslip",
    p_entity_id: payslipId,
    p_action: "MARK_PAID",
    p_before: null,
    p_after: null,
  });

  revalidatePath("/payslips");
  return {};
}

/** Phase 6 enqueue boundary (docs/esti/NEXTJS-MIGRATION-PHASE6-AUDIT.md). */
export async function generatePayslipPdf(payslipId: string): Promise<{ error: string } | null> {
  const supabase = await createClient();
  return generatePdfForTarget({
    supabase,
    table: "payslips",
    target: "payslip",
    id: payslipId,
    revalidate: "/payslips",
  });
}
