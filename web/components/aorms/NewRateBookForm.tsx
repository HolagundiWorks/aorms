"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Form, InlineNotification, Stack, TextArea, TextInput } from "@carbon/react";
import { createRateBookRecord, type RateBookActionState } from "../../lib/actions/rate-books";
import { FormGrid } from "./FormGrid";

const initialState: RateBookActionState = null;

export function NewRateBookForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [state, formAction, pending] = useActionState(createRateBookRecord, initialState);

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
          <InlineNotification
            kind="error"
            title="Could not create rate book"
            subtitle={state.error}
            hideCloseButton
            lowContrast
          />
        )}
        <FormGrid>
          <TextInput id="name" name="name" labelText="Name" required />
          <TextInput id="versionLabel" name="versionLabel" labelText="Version label" placeholder="e.g. 2026-27" />
          <TextInput id="effectiveDate" name="effectiveDate" labelText="Effective date" type="date" />
        </FormGrid>
        <TextArea id="description" name="description" labelText="Description" rows={2} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create rate book"}
        </Button>
      </Stack>
    </Form>
  );
}
