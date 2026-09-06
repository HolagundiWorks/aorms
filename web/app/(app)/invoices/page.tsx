import {
  Column,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { NewInvoiceForm } from "../../../components/aorms/NewInvoiceForm";
import { GeneratePdfButton } from "../../../components/aorms/GeneratePdfButton";
import { generateInvoicePdf } from "../../../lib/actions/invoices";

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  ISSUED: "blue",
  PAID: "green",
  CANCELLED: "red",
};

function formatInr(paise: number | null): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function InvoicesPage() {
  const supabase = await createClient();

  const [{ data: invoices, error }, { data: projects }, { data: clients }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, ref, status, gst_system, document_kind, taxable_paise, gst_total_paise, tds_paise, grand_total_paise, net_receivable_paise, paid_paise, date_invoice, pdf_status, project_offices(title), clients(name)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
    supabase.from("clients").select("id, name").order("name"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Invoices</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          GST invoicing — CGST/SGST/IGST, place of supply, and s.194J TDS computed automatically.
        </p>

        <NewInvoiceForm projects={projects ?? []} clients={clients ?? []} />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load invoices: {error.message}
          </p>
        ) : (
          <Table aria-label="Invoices" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Client</TableHeader>
                <TableHeader>Kind</TableHeader>
                <TableHeader>Taxable</TableHeader>
                <TableHeader>GST</TableHeader>
                <TableHeader>TDS</TableHeader>
                <TableHeader>Grand total</TableHeader>
                <TableHeader>Net receivable</TableHeader>
                <TableHeader>Paid</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>PDF</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(invoices ?? []).map((inv) => {
                const project = Array.isArray(inv.project_offices)
                  ? inv.project_offices[0]
                  : (inv.project_offices as { title: string } | null);
                const client = Array.isArray(inv.clients)
                  ? inv.clients[0]
                  : (inv.clients as { name: string } | null);
                return (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.ref}</TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>{client?.name ?? "—"}</TableCell>
                    <TableCell>{inv.document_kind}</TableCell>
                    <TableCell>{formatInr(inv.taxable_paise)}</TableCell>
                    <TableCell>{formatInr(inv.gst_total_paise)}</TableCell>
                    <TableCell>{formatInr(inv.tds_paise)}</TableCell>
                    <TableCell>{formatInr(inv.grand_total_paise)}</TableCell>
                    <TableCell>{formatInr(inv.net_receivable_paise)}</TableCell>
                    <TableCell>{formatInr(inv.paid_paise)}</TableCell>
                    <TableCell>
                      <Tag type={STATUS_TAG[inv.status] ?? "gray"} size="sm">
                        {inv.status}
                      </Tag>
                    </TableCell>
                    <TableCell>
                      <GeneratePdfButton
                        action={generateInvoicePdf.bind(null, inv.id)}
                        pdfStatus={inv.pdf_status}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {(invoices ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={12}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No invoices yet.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Column>
    </Grid>
  );
}
