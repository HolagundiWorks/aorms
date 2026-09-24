"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button, InlineNotification, Select, SelectItem } from "@carbon/react";
import { auditExpense, closeExpense, markExpenseRecovered, submitExpense } from "../../lib/actions/expenses";

type InvoiceOption = { id: string; ref: string; project_id: string };

/**
 * Row actions for one expense — visible options depend on both the row's
 * own current status (matching the state machine migration
 * 0086_accounts_and_expenses.sql's RLS policies actually enforce) and the
 * viewer's own permission tier: `canWrite` gates Submit (any write-tier
 * staff can submit their own draft), `hasFinanceOps` gates
 * Audit/Close/Mark-recovered (finance:ops only — see
 * lib/actions/expenses.ts's FINANCE_OPS_ROLES). Mirrors
 * RemoveLineItemButton's useTransition-wrapped bound-action pattern.
 */
export function ExpenseRowActions({
  expenseId,
  status,
  scope,
  billingClass,
  projectId,
  canWrite,
  hasFinanceOps,
  projectInvoices,
}: {
  expenseId: string;
  status: string;
  scope: string;
  billingClass: string;
  projectId: string | null;
  canWrite: boolean;
  hasFinanceOps: boolean;
  projectInvoices: InvoiceOption[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.error) setError(res.error);
    });
  }

  const actions: ReactNode[] = [];

  if (status === "DRAFT" && canWrite) {
    actions.push(
      <Button key="submit" size="sm" kind="tertiary" disabled={isPending} onClick={() => run(() => submitExpense(expenseId))}>
        Submit
      </Button>,
    );
  }

  if (status === "SUBMITTED" && hasFinanceOps) {
    actions.push(
      <Button
        key="approve"
        size="sm"
        kind="tertiary"
        disabled={isPending}
        onClick={() => run(() => auditExpense(expenseId, "AUDITED"))}
      >
        Approve
      </Button>,
      <Button
        key="reject"
        size="sm"
        kind="danger--ghost"
        disabled={isPending}
        onClick={() => run(() => auditExpense(expenseId, "REJECTED"))}
      >
        Reject
      </Button>,
    );
  }

  if (status === "AUDITED" && hasFinanceOps) {
    actions.push(
      <Button key="close" size="sm" kind="tertiary" disabled={isPending} onClick={() => run(() => closeExpense(expenseId))}>
        Close
      </Button>,
    );
  }

  const eligibleForRecovery = status === "CLOSED" && scope === "PROJECT" && billingClass === "BILLABLE" && hasFinanceOps;
  const candidateInvoices = projectId ? projectInvoices.filter((inv) => inv.project_id === projectId) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      {actions.length > 0 && <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>{actions}</div>}
      {eligibleForRecovery && (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <Select
            id={`recover-${expenseId}`}
            labelText="Mark recovered on invoice"
            hideLabel
            size="sm"
            defaultValue=""
            disabled={isPending || candidateInvoices.length === 0}
            onChange={(e) => {
              const invoiceId = e.target.value;
              if (!invoiceId) return;
              run(() => markExpenseRecovered(expenseId, "INVOICED", invoiceId));
            }}
          >
            <SelectItem value="" text={candidateInvoices.length ? "— Mark recovered on invoice —" : "No invoices on this project"} />
            {candidateInvoices.map((inv) => (
              <SelectItem key={inv.id} value={inv.id} text={inv.ref} />
            ))}
          </Select>
          <Button
            size="sm"
            kind="ghost"
            disabled={isPending}
            onClick={() => run(() => markExpenseRecovered(expenseId, "WRITTEN_OFF"))}
          >
            Write off
          </Button>
        </div>
      )}
      {actions.length === 0 && !eligibleForRecovery && <span aria-hidden>—</span>}
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
