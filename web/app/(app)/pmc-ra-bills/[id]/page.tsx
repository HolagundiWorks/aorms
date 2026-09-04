import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewRaLineForm } from "../../../../components/aorms/NewRaLineForm";
import { RaBillStatusSelect } from "../../../../components/aorms/RaBillStatusSelect";

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
    supabase.from("pmc_ra_bills").select("id, ref, bill_no, period_start, period_end, gross_paise, status").eq("id", id).maybeSingle(),
    supabase.from("pmc_ra_lines").select("id, description, unit, this_qty, rate_paise, amount_paise").eq("bill_id", id).order("sort_order"),
  ]);

  if (billError) {
    return (
      <Grid style={{ padding: "2rem" }}>
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
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {bill.ref} · {bill.period_start} – {bill.period_end}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <h1 className="cds--type-heading-05">Bill {bill.bill_no}</h1>
          <RaBillStatusSelect billId={bill.id} status={bill.status} />
        </div>

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
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
                <TableHeader>Rate</TableHeader>
                <TableHeader>Amount</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(lines ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.description}</TableCell>
                  <TableCell>{l.unit ?? "—"}</TableCell>
                  <TableCell>{l.this_qty}</TableCell>
                  <TableCell>{formatInr(l.rate_paise)}</TableCell>
                  <TableCell>{formatInr(l.amount_paise)}</TableCell>
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
      </Column>
    </Grid>
  );
}
