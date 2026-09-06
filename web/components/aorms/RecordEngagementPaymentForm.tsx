"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { recordEngagementPayment, type EngagementActionState } from "../../lib/actions/consultants";

const initialState: EngagementActionState = null;

export function RecordEngagementPaymentForm({ engagementId, consultantId }: { engagementId: string; consultantId: string }) {
  const [state, formAction, pending] = useActionState(recordEngagementPayment, initialState);

  return (
    <Form action={formAction}>
      <input type="hidden" name="engagementId" value={engagementId} />
      <input type="hidden" name="consultantId" value={consultantId} />
      <Stack gap={3} orientation="horizontal">
        <TextInput id={`amount-${engagementId}`} name="amountPaise" labelText="" hideLabel size="sm" type="number" step="any" placeholder="Amount (₹)" />
        <Button type="submit" disabled={pending} size="sm" kind="tertiary">
          {pending ? "Recording…" : "Record payment"}
        </Button>
      </Stack>
      {state?.error && (
        <InlineNotification kind="error" title="Failed" subtitle={state.error} hideCloseButton lowContrast />
      )}
    </Form>
  );
}
