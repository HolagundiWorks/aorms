import Link from "next/link";
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
import { NewPurchaseOrderForm } from "../../../components/aorms/NewPurchaseOrderForm";

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

export default async function PurchaseOrdersPage() {
  const supabase = await createClient();

  const [{ data: pos, error }, { data: projects }] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("id, ref, vendor, title, status, total_paise, date_po, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Purchase Orders</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Simple quantity × rate procurement, per project.
        </p>

        <NewPurchaseOrderForm projects={projects ?? []} />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load purchase orders: {error.message}
          </p>
        ) : (
          <Table aria-label="Purchase Orders" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Vendor</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Total</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(pos ?? []).map((po) => {
                const project = Array.isArray(po.project_offices)
                  ? po.project_offices[0]
                  : (po.project_offices as { title: string } | null);
                return (
                  <TableRow key={po.id}>
                    <TableCell>
                      <Link href={`/purchase-orders/${po.id}`}>{po.ref}</Link>
                    </TableCell>
                    <TableCell>{po.title ?? "—"}</TableCell>
                    <TableCell>{po.vendor ?? "—"}</TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>{formatInr(po.total_paise)}</TableCell>
                    <TableCell>
                      <Tag type={STATUS_TAG[po.status] ?? "gray"} size="sm">
                        {po.status}
                      </Tag>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(pos ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No purchase orders yet.
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
