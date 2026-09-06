"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { createConsultant, type ConsultantActionState } from "../../lib/actions/consultants";
import { FormGrid } from "./FormGrid";

const initialState: ConsultantActionState = null;

export function NewConsultantForm() {
  const [state, formAction, pending] = useActionState(createConsultant, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add consultant" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="name" name="name" labelText="Name" required />
          <TextInput id="discipline" name="discipline" labelText="Discipline" placeholder="e.g. Structural, MEP" required />
          <TextInput id="firm" name="firm" labelText="Firm" />
          <TextInput id="email" name="email" labelText="Email" type="email" />
          <TextInput id="phone" name="phone" labelText="Phone" />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add consultant"}
        </Button>
      </Stack>
    </Form>
  );
}
