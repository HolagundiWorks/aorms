"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { createPhaseRecord, type PhaseActionState } from "../../lib/actions/phases";
import { FormGrid } from "./FormGrid";

const initialState: PhaseActionState = null;

export function NewPhaseForm({ projectId, onSuccess }: { projectId: string; onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(createPhaseRecord, initialState);

  // Same pending -> not-pending-with-no-error transition detection as
  // NewDecisionForm — fires only on a real successful submit, not on mount.
  const prevPending = useRef(pending);
  useEffect(() => {
    if (prevPending.current && !pending && !state?.error) {
      onSuccess?.();
    }
    prevPending.current = pending;
  }, [pending, state, onSuccess]);

  return (
    <Form action={formAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification
            kind="error"
            title="Could not create phase"
            subtitle={state.error}
            hideCloseButton
            lowContrast
          />
        )}
        <FormGrid>
          <TextInput id="code" name="code" labelText="Code" placeholder="e.g. SD, DD, CD" required />
          <TextInput
            id="label"
            name="label"
            labelText="Label"
            placeholder="e.g. Schematic Design"
            required
          />
          <TextInput
            id="billingPct"
            name="billingPct"
            labelText="Billing %"
            type="number" step="any"
            defaultValue="0"
          />
          <TextInput
            id="sortOrder"
            name="sortOrder"
            labelText="Sort order"
            type="number" step="any"
            defaultValue="0"
          />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add phase"}
        </Button>
      </Stack>
    </Form>
  );
}
