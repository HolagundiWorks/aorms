"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { createJobApplication } from "../../lib/actions/job-applications";
import { FormGrid } from "./FormGrid";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewJobApplicationForm() {
  const [state, formAction, pending] = useActionState(createJobApplication, initialState);

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
