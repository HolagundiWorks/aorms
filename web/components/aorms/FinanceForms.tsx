"use client";

import { useActionState, useState, useTransition } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createVariation, recordBillPayment, setVariationStatus, type FinanceActionState } from "../../lib/actions/pmc-variations";
import { FormGrid } from "./FormGrid";

function Notice({ state }: { state: FinanceActionState }) {
  if (!state) return null;
  return "error" in state ? (
    <InlineNotification kind="error" title="Could not save" subtitle={state.error} hideCloseButton lowContrast />
  ) : (
    <InlineNotification kind="success" title={state.ok} hideCloseButton lowContrast />
  );
}

export function NewVariationForm({ packageId }: { packageId: string }) {
  const [state, action, pending] = useActionState(createVariation, null);
  return (
    <Form action={action}>
      <input type="hidden" name="packageId" value={packageId} />
      <Stack gap={4}>
        <Notice state={state} />
        <FormGrid>
          <TextInput id="vo-title" name="title" labelText="Variation" required maxLength={200} />
          <TextInput id="vo-amount" name="amount" labelText="Amount (₹, negative = omission)" inputMode="decimal" required />
          <TextInput id="vo-note" name="note" labelText="Note" />
        </FormGrid>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Adding…" : "Add variation"}</Button>
      </Stack>
    </Form>
  );
}

export function VariationStatusSelect({ id, packageId, status }: { id: string; packageId: string; status: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <Select id={`vo-st-${id}`} labelText="Variation status" hideLabel size="sm" value={status} disabled={pending}
        onChange={(e) => { setError(null); const next = e.target.value; start(async () => { const r = await setVariationStatus(id, packageId, next); if (r.error) setError(r.error); }); }}>
        {["DRAFT", "APPROVED", "REJECTED"].map((s) => <SelectItem key={s} value={s} text={s} />)}
      </Select>
      {error && <InlineNotification kind="error" title={error} hideCloseButton lowContrast />}
    </div>
  );
}

export function BillPaymentForm({ billId, paidPaise, paidAt }: { billId: string; paidPaise: number; paidAt: string | null }) {
  const [state, action, pending] = useActionState(recordBillPayment, null);
  return (
    <Form action={action}>
      <input type="hidden" name="billId" value={billId} />
      <Stack gap={4}>
        <Notice state={state} />
        <FormGrid>
          <TextInput id="pay-amount" name="amount" labelText="Amount received (₹)" inputMode="decimal" defaultValue={paidPaise ? String(paidPaise / 100) : ""} required />
          <TextInput id="pay-date" name="paidAt" labelText="Date received" type="date" defaultValue={paidAt ?? ""} required />
        </FormGrid>
        <Button type="submit" size="sm" kind="tertiary" disabled={pending}>{pending ? "Saving…" : "Record payment"}</Button>
      </Stack>
    </Form>
  );
}
