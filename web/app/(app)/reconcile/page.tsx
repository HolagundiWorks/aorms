import Link from "next/link";
import { CheckmarkFilled, DocumentExport, Money, WarningAltFilled } from "@carbon/icons-react";
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
import { AddReconcileBatchForm } from "../../../components/aorms/AddReconcileBatchForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { SettleReconcileButton } from "../../../components/aorms/SettleReconcileButton";

// has_capability('finance:ops') — migration 0087_reconcile.sql's
// "reconcile: finance ops" policy is a single, uniform gate (no read/
// write split); this page is entirely gated behind it too, not just the
// write actions — a non-finance-ops caller sees no reconciliation UI at
// all rather than a read-only table (RLS would return zero rows anyway,
// but the page says so explicitly instead of rendering an empty table).
const FINANCE_OPS_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT"]);

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  PENDING: "gray",
  PROCESSING: "blue",
  READY: "green",
  FAILED: "red",
};

function formatInr(paise: number | null): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function ReconcilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: myProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const hasFinanceOps = !!myProfile && FINANCE_OPS_ROLES.has(myProfile.role);

  if (!hasFinanceOps) {
    return (
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <PageHeader title="Reconciliation" description="Bank-statement reconciliation." />
          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            Only finance and ownership roles can see bank-statement reconciliation.
          </p>
        </Column>
      </Grid>
    );
  }

  const { data: batches, error } = await supabase
    .from("reconcile")
    .select("id, ref, label, file_name, status, row_count, matched_count, unmatched_count, total_credit_paise, matched_credit_paise, created_at")
    .order("created_at", { ascending: false });

  const rows = batches ?? [];
  const readyCount = rows.filter((b) => b.status === "READY").length;
  const failedCount = rows.filter((b) => b.status === "FAILED").length;
  const totalMatchedPaise = rows.reduce((sum, b) => sum + (b.matched_credit_paise ?? 0), 0);

  return (
    <ContextPanelLayout>
      <ContextPanel title="Upload statement" description="Upload a bank statement (CSV or Excel) to match against open invoices.">
        <AddReconcileBatchForm />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Reconciliation"
              description="Bank-statement reconciliation against open invoices."
              actions={<ContextPanelTrigger size="sm">Upload statement</ContextPanelTrigger>}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Batches" value={rows.length} icon={DocumentExport} />
              <KpiTile label="Ready" value={readyCount} icon={CheckmarkFilled} />
              <KpiTile label="Failed" value={failedCount} icon={WarningAltFilled} />
              <KpiTile label="Matched credit" value={formatInr(totalMatchedPaise)} icon={Money} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load reconciliation batches: {error.message}
              </p>
            ) : (
              <Table aria-label="Reconciliation batches" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>Label</TableHeader>
                    <TableHeader>File</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Rows</TableHeader>
                    <TableHeader>Matched</TableHeader>
                    <TableHeader>Matched credit</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <Link href={`/reconcile/${batch.id}`}>{batch.ref}</Link>
                      </TableCell>
                      <TableCell>{batch.label}</TableCell>
                      <TableCell>{batch.file_name}</TableCell>
                      <TableCell>
                        <Tag type={STATUS_TAG[batch.status] ?? "gray"} size="sm">
                          {batch.status}
                        </Tag>
                      </TableCell>
                      <TableCell>{batch.row_count ?? "—"}</TableCell>
                      <TableCell>
                        {batch.matched_count ?? 0} / {batch.row_count ?? 0}
                      </TableCell>
                      <TableCell>{formatInr(batch.matched_credit_paise)}</TableCell>
                      <TableCell>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                          <Link href={`/reconcile/${batch.id}`}>View</Link>
                          <a href={`/api/reconcile/${batch.id}/export`}>Export CSV</a>
                          {batch.status === "READY" && (batch.matched_count ?? 0) > 0 && (
                            <SettleReconcileButton reconcileId={batch.id} />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No reconciliation batches yet.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Column>
        </Grid>
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
