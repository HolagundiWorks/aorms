"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { generatePdfForTarget } from "../jobs/generate-pdf";
import { computeGst, computeTds194j, GstSystem, tds194jApplies } from "../tax/gst";
import { derivePlaceOfSupply } from "../tax/place-of-supply";
import { financialYearRange } from "../tax/fy";

export type InvoiceActionState = { error: string } | null;

/**
 * Fee value (excluding GST) already invoiced to a client this financial
 * year — port of backend/src/lib/createInvoice.ts's clientFyTaxablePaise(),
 * feeding the s.194J(B) ₹30,000/FY aggregate threshold.
 */
async function clientFyTaxablePaise(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
): Promise<number> {
  const { start, end } = financialYearRange();
  const { data } = await supabase
    .from("invoices")
    .select("taxable_paise")
    .eq("client_id", clientId)
    .in("status", ["DRAFT", "ISSUED", "PAID"])
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());
  return (data ?? []).reduce((sum, r) => sum + r.taxable_paise, 0);
}

/**
 * GST/TDS/place-of-supply computation — port of backend/src/lib/
 * createInvoice.ts's createStudioInvoice(). Every tax column already
 * existed on `invoices` (migration 0002); this is what actually fills them
 * in, closing Phase 3's own flagged gap ("invoices don't compute GST —
 * DRAFT with a taxable amount only").
 */
export async function createInvoiceRecord(
  _prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "").trim() || null;
  const gstSystemOverride = String(formData.get("gstSystem") ?? "").trim() || null;
  const sac = String(formData.get("sac") ?? "998322").trim();
  const taxableRaw = String(formData.get("taxablePaise") ?? "").trim();
  const dateInvoice = String(formData.get("dateInvoice") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const isAdvance = formData.get("isAdvance") === "on";

  if (!projectId) return { error: "Project is required." };

  const taxablePaise = taxableRaw ? Math.round(Number(taxableRaw) * 100) : 0;
  if (!Number.isFinite(taxablePaise) || taxablePaise < 0) {
    return { error: "Taxable amount must be a non-negative number." };
  }

  const supabase = await createClient();

  const [{ data: firm, error: firmError }, { data: project, error: projectError }] = await Promise.all([
    supabase.from("firm").select("gst_type, state, gstin, tds_applicable_default").limit(1).maybeSingle(),
    supabase.from("project_offices").select("state").eq("id", projectId).maybeSingle(),
  ]);
  if (firmError) return { error: `Could not load firm settings: ${firmError.message}` };
  if (projectError) return { error: `Could not load project: ${projectError.message}` };

  const { data: client } = clientId
    ? await supabase.from("clients").select("state, gstin").eq("id", clientId).maybeSingle()
    : { data: null };

  const system = (gstSystemOverride || firm?.gst_type || GstSystem.REGULAR) as GstSystem;
  const pos = derivePlaceOfSupply({
    firmState: firm?.state ?? null,
    firmGstin: firm?.gstin ?? null,
    projectState: project?.state ?? null,
    clientState: client?.state ?? null,
    clientGstin: client?.gstin ?? null,
  });

  const firmDeducts = firm?.tds_applicable_default ?? true;
  const priorTaxablePaise = clientId ? await clientFyTaxablePaise(supabase, clientId) : 0;
  const tdsCheck = tds194jApplies({ priorTaxablePaise, taxablePaise });
  const tdsApplicable = firmDeducts && tdsCheck.applies;

  const g = computeGst(system, taxablePaise, pos.interState);
  const tdsPaise = tdsApplicable ? computeTds194j(taxablePaise) : 0;
  const netReceivablePaise = g.grandTotal - tdsPaise;

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "invoice",
    p_default_prefix: "INV",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("invoices")
    .insert({
      ref: refData,
      project_id: projectId,
      client_id: clientId,
      gst_system: system,
      document_kind: g.documentKind,
      sac: system === GstSystem.REGULAR ? sac : null,
      inter_state: pos.interState,
      place_of_supply_state: pos.state,
      tds_applicable: tdsApplicable,
      taxable_paise: g.taxable,
      cgst_paise: g.cgst,
      sgst_paise: g.sgst,
      igst_paise: g.igst,
      gst_total_paise: g.gstTotal,
      composition_levy_paise: g.compositionLevy,
      tds_paise: tdsPaise,
      grand_total_paise: g.grandTotal,
      net_receivable_paise: netReceivablePaise,
      is_advance: isAdvance,
      date_invoice: dateInvoice,
      notes,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "invoice",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: {
      ref: refData,
      projectId,
      clientId,
      gstSystem: system,
      taxablePaise,
      grandTotalPaise: g.grandTotal,
      tdsPaise,
      netReceivablePaise,
    },
  });

  revalidatePath("/invoices");
  return null;
}

/**
 * Phase 6's enqueue boundary (docs/esti/NEXTJS-MIGRATION-PHASE6-AUDIT.md) —
 * the original proof-of-pattern screen for `generatePdfForTarget()`
 * (lib/jobs/generate-pdf.ts), which every other render target's own action
 * now calls the same way. Enqueues a `render_pdf`/`target: "invoice"` job
 * for the Python worker's already-ported `fetch_invoice_full`/
 * `update_invoice` (worker/esti_worker/db.py) to pick up.
 */
export async function generateInvoicePdf(invoiceId: string): Promise<{ error: string } | null> {
  const supabase = await createClient();
  return generatePdfForTarget({
    supabase,
    table: "invoices",
    target: "invoice",
    id: invoiceId,
    revalidate: "/invoices",
  });
}
