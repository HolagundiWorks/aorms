"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { enqueueJob, JobEnqueueError } from "../jobs/enqueue";

export type InvoiceActionState = { error: string } | null;

/**
 * GST/TDS computation (cgst/sgst/igst/composition/tds rollup) is NOT ported
 * here — this creates a DRAFT invoice with a taxable amount only, matching
 * every other domain's "schema + basic CRUD first" pattern this session.
 * The current backend's tax engine (packages/contracts) is a separate,
 * substantial port — flagged, not attempted as a side effect of this form.
 */
export async function createInvoiceRecord(
  _prev: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "").trim() || null;
  const gstSystem = String(formData.get("gstSystem") ?? "REGULAR");
  const documentKind = String(formData.get("documentKind") ?? "TAX_INVOICE");
  const taxableRaw = String(formData.get("taxablePaise") ?? "").trim();
  const dateInvoice = String(formData.get("dateInvoice") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!projectId) return { error: "Project is required." };

  const taxablePaise = taxableRaw ? Math.round(Number(taxableRaw) * 100) : 0;
  if (!Number.isFinite(taxablePaise)) return { error: "Taxable amount must be a number." };

  const supabase = await createClient();

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
      gst_system: gstSystem,
      document_kind: documentKind,
      taxable_paise: taxablePaise,
      grand_total_paise: taxablePaise,
      net_receivable_paise: taxablePaise,
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
    p_after: { ref: refData, projectId, clientId, gstSystem, documentKind, taxablePaise },
  });

  revalidatePath("/invoices");
  return null;
}

/**
 * Phase 6's enqueue boundary (docs/esti/NEXTJS-MIGRATION-PHASE6-AUDIT.md) —
 * the one representative wiring this pass adds, proving the intended
 * pattern end-to-end. Enqueues a `render_pdf`/`target: "invoice"` job for
 * the Python worker's already-ported `fetch_invoice_full`/`update_invoice`
 * (worker/esti_worker/db.py) to pick up — nothing else in `web/` calls the
 * worker yet; the other 10 render targets need the same few lines repeated
 * on their own screens, left as follow-up (see the roadmap).
 *
 * The worker only reads `firm` from the job payload, never fetches it
 * itself (payload.get("firm", {})) — mapped here from the `firm` table's
 * columns into the flat shape worker/esti_worker/jobs/pdf.py's HTML
 * templates expect (legalName/addressLines/coaRegNo/logoKey), since the two
 * schemas don't share field names.
 */
export async function generateInvoicePdf(invoiceId: string): Promise<{ error: string } | null> {
  const supabase = await createClient();

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id, pdf_status")
    .eq("id", invoiceId)
    .maybeSingle();
  if (invoiceError) return { error: invoiceError.message };
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.pdf_status === "PROCESSING") return { error: "PDF is already being generated." };

  const { data: firm, error: firmError } = await supabase
    .from("firm")
    .select("company_name, gstin, pan, coa_reg_no, email, phone, address_line1, address_line2, city, state, pincode")
    .eq("singleton", true)
    .maybeSingle();
  if (firmError) return { error: firmError.message };

  const addressLines = [
    firm?.address_line1,
    firm?.address_line2,
    [firm?.city, firm?.state, firm?.pincode].filter(Boolean).join(" "),
  ].filter((line): line is string => !!line && line.trim().length > 0);

  try {
    await enqueueJob(
      "render_pdf",
      {
        target: "invoice",
        id: invoiceId,
        firm: {
          legalName: firm?.company_name ?? "",
          gstin: firm?.gstin ?? "",
          pan: firm?.pan ?? "",
          coaRegNo: firm?.coa_reg_no ?? "",
          email: firm?.email ?? "",
          phone: firm?.phone ?? "",
          addressLines,
        },
      },
      randomUUID(),
    );
  } catch (err) {
    if (err instanceof JobEnqueueError) return { error: err.message };
    throw err;
  }

  revalidatePath("/invoices");
  return null;
}
