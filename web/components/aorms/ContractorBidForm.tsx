"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextArea, TextInput } from "@carbon/react";
import { submitBid, type ContractorActionState } from "../../lib/actions/contractor-portal";
import { FormGrid } from "./FormGrid";

const initialState: ContractorActionState = null;

export function ContractorBidForm({
  invitationId,
  existing,
}: {
  invitationId: string;
  existing: { amountPaise: number; completionWeeks: number | null; notes: string | null } | null;
}) {
  const [state, formAction, pending] = useActionState(submitBid, initialState);

  return (
    <Form action={formAction}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not submit bid" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput
            id="amount"
            name="amount"
            labelText="Bid amount (₹)"
            type="number"
            step="any"
            defaultValue={existing ? String(existing.amountPaise / 100) : ""}
            required
          />
          <TextInput
            id="completionWeeks"
            name="completionWeeks"
            labelText="Completion time (weeks)"
            type="number"
            defaultValue={existing?.completionWeeks != null ? String(existing.completionWeeks) : ""}
          />
        </FormGrid>
        <TextArea id="notes" name="notes" labelText="Notes" rows={3} defaultValue={existing?.notes ?? ""} />
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : existing ? "Update bid" : "Submit bid"}
        </Button>
      </Stack>
    </Form>
  );
}
