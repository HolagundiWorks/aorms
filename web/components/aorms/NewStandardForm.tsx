"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { createStandard, type StandardActionState } from "../../lib/actions/standards";
import { FormGrid } from "./FormGrid";

const initialState: StandardActionState = null;

export function NewStandardForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [state, formAction, pending] = useActionState(createStandard, initialState);

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
          <InlineNotification kind="error" title="Could not create standard" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="discipline" name="discipline" labelText="Discipline" placeholder="e.g. Structural, Electrical, Landscape" required />
          <TextInput id="title" name="title" labelText="Title" required />
          <TextInput id="notes" name="notes" labelText="Notes" />
        </FormGrid>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create standard"}
        </Button>
      </Stack>
    </Form>
  );
}
