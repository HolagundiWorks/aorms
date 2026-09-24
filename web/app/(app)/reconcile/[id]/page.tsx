import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { ReconcileRemapForm } from "../../../../components/aorms/ReconcileRemapForm";
import { SettleReconcileButton } from "../../../../components/aorms/SettleReconcileButton";

const FINANCE_OPS_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT"]);

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  PENDING: "gray",
  PROCESSING: "blue",
  READY: "green",
  FAILED: "red",
};

const MATCH_TYPE_TAG: Record<string, "green" | "cyan" | "purple" | "gray"> = {
  ref_amount: "green",
  ref: "cyan",
  amount: "cyan",
  amount_ambiguous: "purple",
  none: "gray",
};

function formatInr(paise: number | null | undefined): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

type ReconcileLine = {
  row: number;
  date: string | null;
  description: string;
  amountPaise: number;
  matchType: string;
  matchedInvoiceRef: string | null;
  candidateInvoiceRefs: string[] | null;
  settledAt: string | null;
};

export default async function ReconcileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            Only finance and ownership roles can see bank-statement reconciliation.
          </p>
        </Column>
      </Grid>
    );
  }

  const { data: batch, error } = await supabase
    .from("reconcile")
    .select(
      "id, ref, label, file_name, status, row_count, matched_count, unmatched_count, total_credit_paise, matched_credit_paise, lines, column_mapping, error_text, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load reconciliation batch: {error.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!batch) notFound();

  const lines = (batch.lines ?? []) as ReconcileLine[];

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader eyebrow={batch.ref} eyebrowMono title={batch.label} />
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1.5rem", marginTop: "-1rem" }}>
          <Tag type={STATUS_TAG[batch.status] ?? "gray"} size="sm">
            {batch.status}
          </Tag>
          <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            {batch.file_name} · {batch.row_count ?? 0} rows · {batch.matched_count ?? 0} matched · {formatInr(batch.matched_credit_paise)} of{" "}
            {formatInr(batch.total_credit_paise)}
          </span>
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap" }}>
          <a href={`/api/reconcile/${batch.id}/export`}>Export CSV</a>
          {batch.status === "READY" && (batch.matched_count ?? 0) > 0 && <SettleReconcileButton reconcileId={batch.id} />}
        </div>

        {batch.status === "FAILED" && (
          <>
            {batch.error_text && (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)", marginBottom: "1rem" }}>
                {batch.error_text}
              </p>
            )}
            <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
              Remap columns
            </h2>
            <ReconcileRemapForm reconcileId={batch.id} />
          </>
        )}

        {lines.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
              Lines
            </h2>
            <Table aria-label="Reconciliation lines" className="aorms-table-spaced">
              <TableHead>
                <TableRow>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Description</TableHeader>
                  <TableHeader>Amount</TableHeader>
                  <TableHeader>Match</TableHeader>
                  <TableHeader>Matched invoice</TableHeader>
                  <TableHeader>Settled</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.row}>
                    <TableCell>{line.date ?? "—"}</TableCell>
                    <TableCell>{line.description}</TableCell>
                    <TableCell>{formatInr(line.amountPaise)}</TableCell>
                    <TableCell>
                      <Tag type={MATCH_TYPE_TAG[line.matchType] ?? "gray"} size="sm">
                        {line.matchType.replace(/_/g, " ")}
                      </Tag>
                    </TableCell>
                    <TableCell>
                      {line.matchedInvoiceRef ?? line.candidateInvoiceRefs?.join(", ") ?? "—"}
                    </TableCell>
                    <TableCell>{line.settledAt ? "Yes" : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Column>
    </Grid>
  );
}
