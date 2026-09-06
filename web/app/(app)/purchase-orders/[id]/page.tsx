import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewPoItemForm } from "../../../../components/aorms/NewPoItemForm";
import { RemoveLineItemButton } from "../../../../components/aorms/RemoveLineItemButton";
import { removePoItem } from "../../../../lib/actions/purchase-orders";

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  ISSUED: "blue",
  CLOSED: "green",
  CANCELLED: "red",
};

function formatInr(paise: number | null): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select("id, ref, vendor, title, status, total_paise, date_po, notes, project_offices(title)")
    .eq("id", id)
    .maybeSingle();

  if (poError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load purchase order: {poError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!po) notFound();

  const project = Array.isArray(po.project_offices) ? po.project_offices[0] : (po.project_offices as { title: string } | null);

  const { data: items, error: itemsError } = await supabase
    .from("po_items")
    .select("id, description, unit, qty, rate_paise, amount_paise")
    .eq("po_id", id)
    .order("sort_order");

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {po.ref}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "0.5rem" }}>
          {po.title ?? po.vendor ?? "Purchase order"}
        </h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "2rem" }}>
          <Tag type={STATUS_TAG[po.status] ?? "gray"} size="sm">
            {po.status}
          </Tag>
          <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            {project?.title ?? "—"} · {po.vendor ?? "—"}
          </span>
        </div>

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
          Items
        </h2>
        <NewPoItemForm poId={po.id} />

        {itemsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load items: {itemsError.message}
          </p>
        ) : (
          <>
            <div style={{ marginTop: "1.5rem" }}>
            <Table aria-label="PO items" className="aorms-table-spaced">
              <TableHead>
                <TableRow>
                  <TableHeader>Description</TableHeader>
                  <TableHeader>Unit</TableHeader>
                  <TableHeader>Qty</TableHeader>
                  <TableHeader>Rate</TableHeader>
                  <TableHeader>Amount</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(items ?? []).map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.description}</TableCell>
                    <TableCell>{it.unit ?? "—"}</TableCell>
                    <TableCell>{it.qty}</TableCell>
                    <TableCell>{formatInr(it.rate_paise)}</TableCell>
                    <TableCell>{formatInr(it.amount_paise)}</TableCell>
                    <TableCell>
                      <RemoveLineItemButton action={removePoItem.bind(null, it.id, po.id)} />
                    </TableCell>
                  </TableRow>
                ))}
                {(items ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        No items yet.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
            <div style={{ marginTop: "1rem", textAlign: "right" }}>
              <span className="cds--type-productive-heading-02">Total: {formatInr(po.total_paise)}</span>
            </div>
          </>
        )}

        {po.notes && (
          <>
            <h2 className="cds--type-heading-03" style={{ margin: "2rem 0 1rem" }}>
              Notes
            </h2>
            <p className="cds--type-body-01">{po.notes}</p>
          </>
        )}
      </Column>
    </Grid>
  );
}
