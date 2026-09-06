import { notFound } from "next/navigation";
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
import { createClient } from "../../../../lib/supabase/server";
import { NewEstimateItemForm } from "../../../../components/aorms/NewEstimateItemForm";
import { computeEstimateMarkups } from "../../../../lib/tax/estimate-markups";

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  FINALISED: "blue",
  APPROVED: "green",
  CANCELLED: "red",
};

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * Read-time totals rollup — port of computeEstimateTotalsFromSubtotal()
 * (packages/contracts/src/estimation.ts), extended with the markup cascade
 * (lib/tax/estimate-markups.ts, ported from AQC's EstimateMarkups) sitting
 * between the rate-book subtotal and contingency/GST: items subtotal →
 * +Electrical/+Plumbing → +Escalation (on that) → +Consulting fee (on
 * that) → markupped subtotal → +contingency → taxable → +GST → grand
 * total. Estimates never store totals, items always do (amount_paise,
 * maintained by the recompute trigger).
 */
function computeTotals(
  items: { amount_paise: number }[],
  estimate: {
    contingency_pct: number;
    gst_pct: number;
    electrical_pct: number;
    plumbing_pct: number;
    escalation_pct: number;
    consulting_fee_pct: number;
  },
) {
  const itemsSubtotalPaise = items.reduce((sum, it) => sum + it.amount_paise, 0);
  const markups = computeEstimateMarkups(itemsSubtotalPaise, {
    electricalPct: estimate.electrical_pct,
    plumbingPct: estimate.plumbing_pct,
    escalationPct: estimate.escalation_pct,
    consultingFeePct: estimate.consulting_fee_pct,
  });
  const markuppedSubtotalPaise = markups.grandTotalPaise;
  const contingencyPaise = Math.round((markuppedSubtotalPaise * estimate.contingency_pct) / 100);
  const taxablePaise = markuppedSubtotalPaise + contingencyPaise;
  const gstPaise = Math.round((taxablePaise * estimate.gst_pct) / 100);
  const grandTotalPaise = taxablePaise + gstPaise;
  return { itemsSubtotalPaise, markups, markuppedSubtotalPaise, contingencyPaise, taxablePaise, gstPaise, grandTotalPaise };
}

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: estimate, error: estError },
    { data: items, error: itemsError },
  ] = await Promise.all([
    supabase
      .from("estimates")
      .select(
        "id, ref, title, status, contingency_pct, gst_pct, electrical_pct, plumbing_pct, escalation_pct, consulting_fee_pct, project_offices(title), rate_books(id, name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("estimate_items")
      .select("id, item_code, description, unit, quantity, rate_paise, amount_paise")
      .eq("estimate_id", id)
      .order("sort_order"),
  ]);

  if (estError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load estimate: {estError.message}
          </p>
        </Column>
      </Grid>
    );
  }

  if (!estimate) notFound();

  const project = Array.isArray(estimate.project_offices)
    ? estimate.project_offices[0]
    : (estimate.project_offices as { title: string } | null);
  const rateBook = Array.isArray(estimate.rate_books)
    ? estimate.rate_books[0]
    : (estimate.rate_books as { id: string; name: string } | null);

  const rows = items ?? [];
  const totals = computeTotals(rows, estimate);

  const { data: rateBookItems } = rateBook
    ? await supabase
        .from("rate_book_items")
        .select("id, description, unit, rate_paise")
        .eq("rate_book_id", rateBook.id)
        .order("sort_order")
    : { data: [] };

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p
          className="cds--type-body-01"
          style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}
        >
          {estimate.ref}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "0.5rem" }}>
          {estimate.title}
        </h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "2rem" }}>
          <Tag type={STATUS_TAG[estimate.status] ?? "gray"} size="sm">
            {estimate.status}
          </Tag>
          <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            {project?.title ?? "—"} · {rateBook?.name ?? "—"}
          </span>
        </div>

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
          Items
        </h2>

        <NewEstimateItemForm estimateId={estimate.id} rateBookItems={rateBookItems ?? []} />

        {itemsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load items: {itemsError.message}
          </p>
        ) : (
          <>
            <Table aria-label="Estimate items" className="aorms-table-spaced">
              <TableHead>
                <TableRow>
                  <TableHeader>Description</TableHeader>
                  <TableHeader>Unit</TableHeader>
                  <TableHeader>Quantity</TableHeader>
                  <TableHeader>Rate</TableHeader>
                  <TableHeader>Amount</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.description}</TableCell>
                    <TableCell>{it.unit}</TableCell>
                    <TableCell>{it.quantity}</TableCell>
                    <TableCell>{formatInr(it.rate_paise)}</TableCell>
                    <TableCell>{formatInr(it.amount_paise)}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        No items yet.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div style={{ marginTop: "1.5rem", maxWidth: "24rem", marginLeft: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                <span className="cds--type-body-01">Items subtotal</span>
                <span className="cds--type-body-01">{formatInr(totals.itemsSubtotalPaise)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                <span className="cds--type-body-01">Electrical ({estimate.electrical_pct}%)</span>
                <span className="cds--type-body-01">{formatInr(totals.markups.electricalPaise)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                <span className="cds--type-body-01">Plumbing ({estimate.plumbing_pct}%)</span>
                <span className="cds--type-body-01">{formatInr(totals.markups.plumbingPaise)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                <span className="cds--type-body-01">Escalation ({estimate.escalation_pct}%)</span>
                <span className="cds--type-body-01">{formatInr(totals.markups.escalationPaise)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                <span className="cds--type-body-01">Consulting fee ({estimate.consulting_fee_pct}%)</span>
                <span className="cds--type-body-01">{formatInr(totals.markups.consultingFeePaise)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", fontWeight: 600 }}>
                <span className="cds--type-body-01">Subtotal after markups</span>
                <span className="cds--type-body-01">{formatInr(totals.markuppedSubtotalPaise)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                <span className="cds--type-body-01">Contingency ({estimate.contingency_pct}%)</span>
                <span className="cds--type-body-01">{formatInr(totals.contingencyPaise)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                <span className="cds--type-body-01">Taxable</span>
                <span className="cds--type-body-01">{formatInr(totals.taxablePaise)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                <span className="cds--type-body-01">GST ({estimate.gst_pct}%)</span>
                <span className="cds--type-body-01">{formatInr(totals.gstPaise)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.5rem 0",
                  borderTop: "1px solid var(--cds-border-subtle)",
                  fontWeight: 600,
                }}
              >
                <span className="cds--type-body-01">Grand total</span>
                <span className="cds--type-body-01">{formatInr(totals.grandTotalPaise)}</span>
              </div>
            </div>
          </>
        )}
      </Column>
    </Grid>
  );
}
