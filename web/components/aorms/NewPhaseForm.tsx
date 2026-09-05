"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { createPhaseRecord, type PhaseActionState } from "../../lib/actions/phases";

const initialState: PhaseActionState = null;

export function NewPhaseForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(createPhaseRecord, initialState);

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
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add phase"}
        </Button>
      </Stack>
    </Form>
  );
}
