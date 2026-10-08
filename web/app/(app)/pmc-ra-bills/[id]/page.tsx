import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewRaLineForm } from "../../../../components/aorms/NewRaLineForm";
import { RaBillStatusSelect } from "../../../../components/aorms/RaBillStatusSelect";
import { GeneratePdfButton } from "../../../../components/aorms/GeneratePdfButton";
import { BillPaymentForm } from "../../../../components/aorms/FinanceForms";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { generateRaBillPdf } from "../../../../lib/actions/pmc-ra-bills";

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function PmcRaBillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: bill, error: billError }, { data: lines, error: linesError }] = await Promise.all([
    supabase.from("pmc_ra_bills").select("id, ref, bill_no, period_start, period_end, gross_paise, status, pdf_status, paid_paise, paid_at, submitted_by_contractor_id").eq("id", id).maybeSingle(),
    supabase.from("pmc_ra_lines").select("id, description, unit, this_qty, rate_paise, amount_paise").eq("bill_id", id).order("sort_order"),
  ]);

  if (billError) {
    return (
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load bill: {billError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!bill) notFound();

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader eyebrow={`${bill.ref} · ${bill.period_start} – ${bill.period_end}`} title={`Bill ${bill.bill_no}`} />
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", marginTop: "-1rem" }}>
          <RaBillStatusSelect billId={bill.id} status={bill.status} />
          <GeneratePdfButton action={generateRaBillPdf.bind(null, bill.id)} pdfStatus={bill.pdf_status} />
        </div>

        <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
          Line items
        </h2>
        <NewRaLineForm billId={bill.id} />

        {linesError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load lines: {linesError.message}
          </p>
        ) : (
          <Table aria-label="RA lines" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Description</TableHeader>
                <TableHeader>Unit</TableHeader>
                <TableHeader>Qty (this period)</TableHeader>
                <TableHeader className="aorms-num">Rate</TableHeader>
                <TableHeader className="aorms-num">Amount</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(lines ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.description}</TableCell>
                  <TableCell>{l.unit ?? "—"}</TableCell>
                  <TableCell>{l.this_qty}</TableCell>
                  <TableCell className="aorms-num">{formatInr(l.rate_paise)}</TableCell>
                  <TableCell className="aorms-num">{formatInr(l.amount_paise)}</TableCell>
                </TableRow>
              ))}
              {(lines ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No lines yet.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        <p className="cds--type-heading-03" style={{ marginTop: "1.5rem" }}>
          Gross total: {formatInr(bill.gross_paise)}
        </p>

        <h2 className="cds--type-heading-02" style={{ margin: "2rem 0 1rem" }}>
          Payment received
        </h2>
        <p className="cds--type-body-01" style={{ marginBottom: "1rem", color: "var(--cds-text-secondary)" }}>
          {bill.paid_paise ? `${formatInr(bill.paid_paise)} received on ${bill.paid_at}.` : "No payment recorded yet."}{" "}
          What you record here shows in the contractor&apos;s cost tracking as received.
        </p>
        <BillPaymentForm billId={bill.id} paidPaise={bill.paid_paise ?? 0} paidAt={bill.paid_at} />
      </Column>
    </Grid>
  );
}
