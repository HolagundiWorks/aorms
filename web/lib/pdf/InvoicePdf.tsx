/**
 * Invoice PDF — in-process render via @react-pdf/renderer (2026-09-14
 * remediation). Replaces the render_pdf job-queue path for invoices:
 * the queue (web/lib/jobs/enqueue.ts → gateway/ → Python worker/) isn't
 * confirmed reachable in production, and even when it is, the old
 * "Generate PDF" button never actually surfaced a download link once
 * the job finished (confirmed live — GeneratePdfButton.tsx just showed
 * inert "PDF ready" text, pdf_key was never even selected on the
 * invoices page). This renders synchronously in the same request that
 * serves the download, so there's no queue, no polling, no stuck
 * "Processing…" state to reach at all.
 *
 * Layout deliberately mirrors worker/esti_worker/jobs/pdf.py's
 * `_render_html`/`_tax_rows` (same fields, same section order, same GST
 * rule-46(n) place-of-supply line) — a faithful port to React-PDF's
 * View/Text primitives, not a redesign. Field selection matches
 * worker/esti_worker/db.py's `fetch_invoice_full` exactly.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { FirmForPdf } from "../jobs/firm";

export type InvoicePdfData = {
  ref: string;
  document_kind: string;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  composition_levy_paise: number;
  tds_paise: number;
  grand_total_paise: number;
  net_receivable_paise: number;
  date_invoice: string | null;
  notes: string | null;
  inter_state: boolean;
  place_of_supply_state: string | null;
  sac: string | null;
  project: { ref: string | null; title: string | null; city: string | null; state: string | null } | null;
  client: { name: string | null; gstin: string | null; pan: string | null; state: string | null; city: string | null } | null;
};

const DOC_TITLE: Record<string, string> = {
  TAX_INVOICE: "Tax Invoice",
  BILL_OF_SUPPLY: "Bill of Supply",
  INVOICE: "Invoice",
};

/** Indian digit grouping, e.g. 12345678 paise -> Rs. 1,23,456.78 — same
 * grouping algorithm as pdf.py's own `_inr`, but "Rs." instead of the ₹
 * glyph specifically in this PDF (found live: Helvetica's standard PDF
 * base-font encoding has no ₹ glyph at all — it rendered as a stray "¹"
 * superscript-one). The alternative was embedding a full Unicode font
 * just for one symbol; "Rs." is the same convention plenty of real GST
 * software uses for exactly this reason. The rest of the app keeps the
 * ₹ glyph (a browser renders real Unicode fine) — this substitution is
 * scoped to PDF rendering only. */
function inr(paise: number | null | undefined): string {
  const p = Math.trunc(paise ?? 0);
  const abs = Math.abs(p);
  const rupees = Math.floor(abs / 100);
  const paisePart = abs % 100;
  let s = String(rupees);
  if (s.length > 3) {
    const head = s.slice(0, -3);
    const tail = s.slice(-3);
    const groups: string[] = [];
    let i = head.length;
    while (i > 0) {
      const start = Math.max(i - 2, 0);
      groups.unshift(head.slice(start, i));
      i = start;
    }
    s = `${groups.join(",")},${tail}`;
  }
  const sign = p < 0 ? "-" : "";
  return `${sign}Rs. ${s}.${String(paisePart).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, color: "#161616", fontFamily: "Helvetica" },
  firmName: { fontSize: 16, fontWeight: 700 },
  muted: { color: "#6f6f6f" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  right: { textAlign: "right" },
  title: {
    fontSize: 13,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#161616",
    paddingVertical: 6,
    marginVertical: 16,
  },
  bold: { fontWeight: 700 },
  table: { marginTop: 8 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e0e0e0", paddingVertical: 5 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#f4f4f4", paddingVertical: 5, borderBottomWidth: 1, borderColor: "#e0e0e0" },
  colDesc: { flex: 3, paddingHorizontal: 4 },
  colSac: { flex: 1, paddingHorizontal: 4 },
  colAmt: { flex: 1, paddingHorizontal: 4, textAlign: "right" },
  totals: { alignSelf: "flex-end", width: "55%", marginTop: 10 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalsGrand: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderTopWidth: 2, borderColor: "#161616", fontWeight: 700 },
  note: { color: "#6f6f6f", fontStyle: "italic", marginTop: 8 },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, color: "#6f6f6f", fontSize: 8, borderTopWidth: 1, borderColor: "#e0e0e0", paddingTop: 6 },
});

export function InvoicePdf({ invoice, firm }: { invoice: InvoicePdfData; firm: FirmForPdf }) {
  const title = DOC_TITLE[invoice.document_kind] ?? "Invoice";
  const posState = invoice.place_of_supply_state ?? invoice.project?.state ?? null;
  const showPos = posState && invoice.document_kind === "TAX_INVOICE";

  return (
    <Document title={`${title} ${invoice.ref}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.row}>
          <View>
            <Text style={styles.firmName}>{firm.legalName}</Text>
            {firm.addressLines.map((line, i) => (
              <Text key={i} style={styles.muted}>
                {line}
              </Text>
            ))}
            <Text style={styles.muted}>
              {firm.email} · {firm.phone}
            </Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.muted}>GSTIN: {firm.gstin}</Text>
            <Text style={styles.muted}>PAN: {firm.pan}</Text>
            <Text style={styles.muted}>COA Reg: {firm.coaRegNo}</Text>
          </View>
        </View>

        <Text style={styles.title}>{title}</Text>

        <View style={styles.row}>
          <View>
            <Text style={styles.muted}>Bill to</Text>
            <Text style={styles.bold}>{invoice.client?.name ?? "—"}</Text>
            <Text style={styles.muted}>
              {invoice.client?.city ?? ""} {invoice.client?.state ?? ""}
            </Text>
            {invoice.client?.gstin ? (
              <Text>GSTIN: {invoice.client.gstin}</Text>
            ) : invoice.client?.pan ? (
              <Text>PAN: {invoice.client.pan}</Text>
            ) : null}
          </View>
          <View style={styles.right}>
            <Text>
              <Text style={styles.bold}>Invoice # </Text>
              {invoice.ref}
            </Text>
            <Text>
              <Text style={styles.bold}>Date </Text>
              {invoice.date_invoice ?? "—"}
            </Text>
            <Text>
              <Text style={styles.bold}>Project </Text>
              {invoice.project?.ref ?? "—"}
            </Text>
            {showPos && (
              <Text>
                <Text style={styles.bold}>Place of supply </Text>
                {posState}
                {invoice.inter_state ? " (inter-state)" : ""}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDesc, styles.bold]}>Description</Text>
            <Text style={[styles.colSac, styles.bold]}>SAC</Text>
            <Text style={[styles.colAmt, styles.bold]}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.colDesc}>Professional architectural services — {invoice.project?.title ?? ""}</Text>
            <Text style={styles.colSac}>{invoice.sac ?? "—"}</Text>
            <Text style={styles.colAmt}>{inr(invoice.taxable_paise)}</Text>
          </View>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text>Taxable value</Text>
            <Text>{inr(invoice.taxable_paise)}</Text>
          </View>
          {invoice.cgst_paise ? (
            // A React Fragment (<>...</>) as a direct child of react-pdf's
            // View broke rendering silently here — everything after this
            // point (the rest of the totals, the footer) vanished from the
            // output PDF with no error thrown (found live: the header row
            // rendered, the item row/totals/footer didn't). A plain View
            // wrapper is a real node react-pdf's reconciler handles
            // correctly; a Fragment isn't.
            <View>
              <View style={styles.totalsRow}>
                <Text>CGST @ 9%</Text>
                <Text>{inr(invoice.cgst_paise)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text>SGST @ 9%</Text>
                <Text>{inr(invoice.sgst_paise)}</Text>
              </View>
            </View>
          ) : null}
          {invoice.igst_paise ? (
            <View style={styles.totalsRow}>
              <Text>IGST @ 18%</Text>
              <Text>{inr(invoice.igst_paise)}</Text>
            </View>
          ) : null}
          <View style={styles.totalsGrand}>
            <Text>Total</Text>
            <Text>{inr(invoice.grand_total_paise)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Less: TDS u/s 194J</Text>
            <Text>{inr(invoice.tds_paise)}</Text>
          </View>
          <View style={styles.totalsGrand}>
            <Text>Net receivable</Text>
            <Text>{inr(invoice.net_receivable_paise)}</Text>
          </View>
        </View>

        {invoice.composition_levy_paise ? (
          <Text style={styles.note}>
            Composition taxable person — not eligible to collect tax on supplies. Composition levy borne by the firm.
          </Text>
        ) : null}
        {invoice.notes ? <Text style={styles.note}>{invoice.notes}</Text> : null}

        <Text style={styles.footer}>
          {firm.legalName} · COA Reg {firm.coaRegNo} · GSTIN {firm.gstin} — computer-generated document
        </Text>
      </Page>
    </Document>
  );
}
