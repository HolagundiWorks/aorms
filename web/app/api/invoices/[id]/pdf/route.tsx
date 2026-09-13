/**
 * Invoice PDF download — in-process, synchronous (2026-09-14
 * remediation). See lib/pdf/InvoicePdf.tsx's own header comment for why
 * this replaces the render_pdf job-queue path for invoices specifically.
 *
 * Uses the request-scoped RLS client (not a service-role client) — the
 * exact same access control an authenticated user gets anywhere else in
 * the app; this route grants no privilege the invoices list page itself
 * doesn't already have. An unauthenticated or unauthorized request simply
 * gets no row back (RLS-filtered), reported as 404, not a 401/403 that
 * would confirm the invoice exists.
 */
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { getFirmForPdf } from "../../../../../lib/jobs/firm";
import { InvoicePdf, type InvoicePdfData } from "../../../../../lib/pdf/InvoicePdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      "ref, document_kind, gst_system, sac, inter_state, place_of_supply_state, taxable_paise, cgst_paise, sgst_paise, igst_paise, gst_total_paise, composition_levy_paise, tds_paise, grand_total_paise, net_receivable_paise, date_invoice, notes, project_offices(ref, title, city, state), clients(name, gstin, pan, state, city)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  const firmResult = await getFirmForPdf(supabase);
  if (!firmResult.firm) return NextResponse.json({ error: firmResult.error }, { status: 500 });

  const project = Array.isArray(invoice.project_offices) ? invoice.project_offices[0] : invoice.project_offices;
  const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;

  const data: InvoicePdfData = {
    ref: invoice.ref,
    document_kind: invoice.document_kind,
    taxable_paise: invoice.taxable_paise,
    cgst_paise: invoice.cgst_paise,
    sgst_paise: invoice.sgst_paise,
    igst_paise: invoice.igst_paise,
    composition_levy_paise: invoice.composition_levy_paise,
    tds_paise: invoice.tds_paise,
    grand_total_paise: invoice.grand_total_paise,
    net_receivable_paise: invoice.net_receivable_paise,
    date_invoice: invoice.date_invoice,
    notes: invoice.notes,
    inter_state: invoice.inter_state,
    place_of_supply_state: invoice.place_of_supply_state,
    sac: invoice.sac,
    project: project ? { ref: project.ref, title: project.title, city: project.city, state: project.state } : null,
    client: client ? { name: client.name, gstin: client.gstin, pan: client.pan, state: client.state, city: client.city } : null,
  };

  const buffer = await renderToBuffer(<InvoicePdf invoice={data} firm={firmResult.firm} />);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="AORMS_Invoice_${invoice.ref}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
