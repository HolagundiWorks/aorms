import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { SysDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

const STATUS_TAG: Record<string, "gray" | "cyan" | "green" | "red" | "magenta"> = {
  CREATED: "gray",
  AUTHORIZED: "cyan",
  CAPTURED: "green",
  FAILED: "red",
  REFUNDED: "magenta",
};

/**
 * Every Razorpay payment attempt across every studio — reads only, no
 * refund/adjustment action here (see the plan's "explicitly not in this
 * pass" — a refund is issued via Razorpay's own dashboard and would need
 * its own webhook-driven REFUNDED transition to show up here, not an
 * in-app button). Links to the raw Razorpay order/payment id so an admin
 * can cross-reference Razorpay's own dashboard.
 */
export default async function AdminPaymentsPage() {
  const account = await getCurrentPlatformSessionAccount();
  if (!isSuperAdmin(account)) return <AdminAccessDenied title="Payments" />;

  const platformService = createPlatformServiceRoleClient();
  const { data: payments } = await platformService
    .from("payments")
    .select("id, plan, seats, amount_paise, status, razorpay_order_id, razorpay_payment_id, created_at, studios(name, public_id)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <SysDexPortalHeader />
      <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader title="Payments" description="Every Razorpay payment attempt, most recent first." />

        <Table aria-label="Payments" className="aorms-table-spaced">
          <TableHead>
            <TableRow>
              <TableHeader>Studio</TableHeader>
              <TableHeader>Plan</TableHeader>
              <TableHeader>Seats</TableHeader>
              <TableHeader>Amount</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Razorpay order</TableHeader>
              <TableHeader>Date</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(payments ?? []).map((p) => {
              const studio = (Array.isArray(p.studios) ? p.studios[0] : p.studios) as { name: string; public_id: string } | null;
              return (
                <TableRow key={p.id}>
                  <TableCell>{studio ? `${studio.name} (${studio.public_id})` : "—"}</TableCell>
                  <TableCell>{p.plan}</TableCell>
                  <TableCell>{p.seats}</TableCell>
                  <TableCell>₹{(p.amount_paise / 100).toLocaleString("en-IN")}</TableCell>
                  <TableCell>
                    <Tag type={STATUS_TAG[p.status] ?? "gray"} size="sm">
                      {p.status}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    <span className="cds--type-code-01">{p.razorpay_payment_id ?? p.razorpay_order_id}</span>
                  </TableCell>
                  <TableCell>{new Date(p.created_at).toLocaleString()}</TableCell>
                </TableRow>
              );
            })}
            {(payments ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    No payments yet.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Column>
    </Grid>
    </>
  );
}
