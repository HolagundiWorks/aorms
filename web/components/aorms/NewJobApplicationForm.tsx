"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { createJobApplication } from "../../lib/actions/job-applications";
import { FormGrid } from "./FormGrid";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewJobApplicationForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [state, formAction, pending] = useActionState(createJobApplication, initialState);

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
          <InlineNotification kind="error" title="Could not add application" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="name" name="name" labelText="Name" required />
          <TextInput id="appliedRole" name="appliedRole" labelText="Applied role" required />
          <TextInput id="email" name="email" labelText="Email" type="email" />
          <TextInput id="phone" name="phone" labelText="Phone" />
          <TextInput id="experienceYears" name="experienceYears" labelText="Experience (years)" type="number" step="any" />
          <TextInput id="notes" name="notes" labelText="Notes" />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add application"}
        </Button>
      </Stack>
    </Form>
  );
}
