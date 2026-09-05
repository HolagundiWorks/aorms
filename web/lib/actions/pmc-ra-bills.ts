"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { generatePdfForTarget } from "../jobs/generate-pdf";

type ActionState = { error: string } | null;

export async function createRaBill(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const billNo = String(formData.get("billNo") ?? "").trim();
  const periodStart = String(formData.get("periodStart") ?? "").trim();
  const periodEnd = String(formData.get("periodEnd") ?? "").trim();

  if (!projectId) return { error: "Project is required." };
  if (!billNo) return { error: "Bill number is required." };
  if (!periodStart || !periodEnd) return { error: "Period start and end are required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "pmc_ra_bill",
    p_default_prefix: "RA",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("pmc_ra_bills")
    .insert({
      project_id: projectId,
      ref: refData,
      bill_no: billNo,
      period_start: periodStart,
      period_end: periodEnd,
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "pmc_ra_bill",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, ref: refData, billNo },
  });

  revalidatePath("/pmc-ra-bills");
  return null;
}

type LineActionState = { error: string } | null;

export async function createRaLine(billId: string, _prev: LineActionState, formData: FormData): Promise<LineActionState> {
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim() || null;
  const thisQty = Number(formData.get("thisQty") ?? 0);
  const ratePaiseInput = String(formData.get("rate") ?? "").trim();

  if (!description) return { error: "Description is required." };
  if (!ratePaiseInput) return { error: "Rate is required." };

  const ratePaise = Math.round(Number(ratePaiseInput) * 100);
  const amountPaise = Math.round(thisQty * ratePaise);

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("pmc_ra_lines")
    .insert({ bill_id: billId, description, unit, this_qty: thisQty, rate_paise: ratePaise, amount_paise: amountPaise })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // Roll the line amount into the bill's gross total.
  const { data: bill } = await supabase.from("pmc_ra_bills").select("gross_paise").eq("id", billId).maybeSingle();
  await supabase
    .from("pmc_ra_bills")
    .update({ gross_paise: (bill?.gross_paise ?? 0) + amountPaise, updated_at: new Date().toISOString() })
    .eq("id", billId);

  await supabase.rpc("write_audit", {
    p_entity: "pmc_ra_line",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { billId, description, amountPaise },
  });

  revalidatePath(`/pmc-ra-bills/${billId}`);
  return null;
}

const STATUSES = ["DRAFT", "SITE_CHECKED", "CERTIFIED", "SENT_TO_CLIENT", "CLOSED"];

/**
 * Same cost:approve trigger guard as steel certs (assert_cost_approve_for_certify,
 * migration 0014) on the CERTIFIED transition.
 */
export async function updateRaBillStatus(billId: string, status: string): Promise<{ error?: string }> {
  if (!STATUSES.includes(status)) return { error: "Invalid status." };

  const supabase = await createClient();
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "CERTIFIED") {
    patch.certified_at = new Date().toISOString();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    patch.certified_by_id = user?.id ?? null;
  }
  if (status === "SENT_TO_CLIENT") patch.sent_at = new Date().toISOString();

  const { error } = await supabase.from("pmc_ra_bills").update(patch).eq("id", billId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "pmc_ra_bill",
    p_entity_id: billId,
    p_action: "UPDATE",
    p_before: null,
    p_after: { status },
  });

  revalidatePath(`/pmc-ra-bills/${billId}`);
  revalidatePath("/pmc-ra-bills");
  return {};
}

/** Phase 6 enqueue boundary (docs/esti/NEXTJS-MIGRATION-PHASE6-AUDIT.md). */
export async function generateRaBillPdf(billId: string): Promise<{ error: string } | null> {
  const supabase = await createClient();
  return generatePdfForTarget({
    supabase,
    table: "pmc_ra_bills",
    target: "pmc_ra_bill",
    id: billId,
    revalidate: `/pmc-ra-bills/${billId}`,
  });
}
