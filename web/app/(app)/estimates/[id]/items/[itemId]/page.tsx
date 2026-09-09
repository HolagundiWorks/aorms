import { notFound } from "next/navigation";
import Link from "next/link";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../../../../lib/supabase/server";
import { NewEstimateMeasurementForm } from "../../../../../../components/aorms/NewEstimateMeasurementForm";
import { PageHeader } from "../../../../../../components/aorms/PageHeader";
import { RemoveLineItemButton } from "../../../../../../components/aorms/RemoveLineItemButton";
import { removeEstimateMeasurementRecord } from "../../../../../../lib/actions/estimates";

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const SHAPE_LABEL: Record<string, string> = {
  COUNT: "Count (nos only)",
  LENGTH: "Length (nos × length)",
  AREA: "Area (nos × length × breadth)",
  VOLUME: "Volume (nos × length × breadth × depth)",
  WEIGHT: "Weight (direct quantity)",
  LUMPSUM: "Lump sum (direct quantity)",
};

/**
 * Measurement-book drill-down for one estimate item — the Phase 4 gap
 * ROADMAP-CLOUD.md flagged open ("measurement-row drill-down for estimate
 * items (direct quantity entry only)"). Quantity/amount here are read-only,
 * computed display only — the actual computation happens in Postgres
 * (migration 0005_phase4_estimation.sql's recompute trigger) the moment a
 * measurement row is written, not in this page's own code.
 */
export default async function EstimateItemMeasurementsPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id: estimateId, itemId } = await params;
  const supabase = await createClient();

  const { data: item, error: itemError } = await supabase
    .from("estimate_items")
    .select("id, description, unit, quantity, rate_paise, amount_paise, estimate_id, estimates(id, ref, title, status)")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError) {
    return (
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load item: {itemError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!item || item.estimate_id !== estimateId) notFound();

  const estimate = Array.isArray(item.estimates)
    ? item.estimates[0]
    : (item.estimates as { id: string; ref: string; title: string; status: string } | null);

  const [{ data: shapeData }, { data: measurements, error: measurementsError }] = await Promise.all([
    supabase.rpc("shape_for_unit", { p_unit: item.unit }),
    supabase
      .from("estimate_measurements")
      .select("id, description, nos, length, breadth, depth, quantity")
      .eq("estimate_item_id", itemId)
      .order("created_at"),
  ]);
  const shape = (shapeData as string | null) ?? "COUNT";

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          <Link href={`/estimates/${estimateId}`}>← {estimate?.ref ?? "Estimate"}</Link>
        </p>
        <PageHeader title={item.description} />
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.5rem", marginTop: "-1rem" }}>
          <Tag type="outline" size="sm">
            {item.unit}
          </Tag>
          <Tag type="cool-gray" size="sm">
            {SHAPE_LABEL[shape] ?? shape}
          </Tag>
          <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            Quantity {item.quantity} · Rate {formatInr(item.rate_paise)} · Amount {formatInr(item.amount_paise)}
          </span>
        </div>
        <p className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "2rem" }}>
          Quantity and amount are computed automatically from the measurement rows below — add or remove a row to
          change them.
        </p>

        <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
          Measurements
        </h2>
        <NewEstimateMeasurementForm estimateId={estimateId} estimateItemId={itemId} shapeHint={shape} />

        {measurementsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)", marginTop: "1.5rem" }}>
            Couldn&apos;t load measurements: {measurementsError.message}
          </p>
        ) : (
          <div style={{ marginTop: "1.5rem" }}>
            <Table aria-label="Measurement rows" className="aorms-table-spaced">
              <TableHead>
                <TableRow>
                  <TableHeader>Description</TableHeader>
                  <TableHeader>Nos</TableHeader>
                  <TableHeader>Length</TableHeader>
                  <TableHeader>Breadth</TableHeader>
                  <TableHeader>Depth</TableHeader>
                  <TableHeader>Direct qty</TableHeader>
                  <TableHeader>Remove</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(measurements ?? []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.description ?? "—"}</TableCell>
                    <TableCell>{m.nos}</TableCell>
                    <TableCell>{m.length}</TableCell>
                    <TableCell>{m.breadth}</TableCell>
                    <TableCell>{m.depth}</TableCell>
                    <TableCell>{m.quantity}</TableCell>
                    <TableCell>
                      <RemoveLineItemButton action={removeEstimateMeasurementRecord.bind(null, m.id, estimateId, itemId)} />
                    </TableCell>
                  </TableRow>
                ))}
                {(measurements ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        No measurement rows yet — this item&apos;s quantity was entered directly.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Column>
    </Grid>
  );
}
