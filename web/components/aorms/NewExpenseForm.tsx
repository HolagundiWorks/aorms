"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button, FileUploader, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createExpenseRecord, type ExpenseActionState } from "../../lib/actions/expenses";
import { FormGrid } from "./FormGrid";

type ProjectOption = { id: string; title: string };
type AccountOption = { id: string; code: string; name: string };

const initialState: ExpenseActionState = null;

const CATEGORIES = ["TRAVEL", "FOOD", "ACCOMMODATION", "MISC", "INVOICING_COST"];
const PAYMENT_METHODS = ["CASH", "BANK", "CARD", "UPI"];

export function NewExpenseForm({
  projects,
  accounts,
  onSuccess,
}: {
  projects: ProjectOption[];
  accounts: AccountOption[];
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(createExpenseRecord, initialState);
  const [scope, setScope] = useState("OFFICE");

  const prevPending = useRef(pending);
  useEffect(() => {
    if (prevPending.current && !pending && !state?.error) {
      onSuccess?.();
    }
    prevPending.current = pending;
  }, [pending, state, onSuccess]);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not record expense" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <Select id="scope" name="scope" labelText="Scope" value={scope} onChange={(e) => setScope(e.target.value)}>
            <SelectItem value="OFFICE" text="Office" />
            <SelectItem value="PROJECT" text="Project" />
          </Select>
          {scope === "PROJECT" && (
            <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
              <SelectItem value="" text="— Select a project —" />
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id} text={p.title} />
              ))}
            </Select>
          )}
          <Select id="billingClass" name="billingClass" labelText="Billing class" defaultValue="NON_BILLABLE">
            <SelectItem value="NON_BILLABLE" text="Non-billable" />
            <SelectItem value="BILLABLE" text="Billable" />
          </Select>
          <Select id="category" name="category" labelText="Category" defaultValue="">
            <SelectItem value="" text="— Select a category —" />
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} text={c.replace(/_/g, " ")} />
            ))}
          </Select>
          <Select id="paymentMethod" name="paymentMethod" labelText="Payment method" defaultValue="">
            <SelectItem value="" text="— Select a method —" />
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m} text={m} />
            ))}
          </Select>
          <Select id="accountId" name="accountId" labelText="Account" defaultValue="" helperText="Leave blank to auto-pick.">
            <SelectItem value="" text="— Auto —" />
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id} text={`${a.code} — ${a.name}`} />
            ))}
          </Select>
          <TextInput id="amount" name="amount" labelText="Amount (₹)" type="number" step="any" defaultValue="0" />
          <TextInput id="expenseDate" name="expenseDate" labelText="Expense date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          <TextInput id="payee" name="payee" labelText="Payee" />
        </FormGrid>
        <TextArea id="description" name="description" labelText="Description" rows={2} />
        <FileUploader
          id="receipt"
          name="receipt"
          labelTitle="Receipt"
          labelDescription="JPEG, PNG, WebP, or PDF — 10MB max."
          buttonLabel="Choose file"
          filenameStatus="edit"
          accept={[".jpg", ".jpeg", ".png", ".webp", ".pdf"]}
          size="sm"
        />
        <TextArea id="notes" name="notes" labelText="Notes" rows={2} />
        <Button type="submit" disabled={pending}>
          {pending ? "Recording…" : "Record expense"}
        </Button>
      </Stack>
    </Form>
  );
}
