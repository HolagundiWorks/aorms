"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { createStandard, type StandardActionState } from "../../lib/actions/standards";

const initialState: StandardActionState = null;

export function NewStandardForm() {
  const [state, formAction, pending] = useActionState(createStandard, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not create standard" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <TextInput id="discipline" name="discipline" labelText="Discipline" placeholder="e.g. Structural, Electrical, Landscape" required />
        <TextInput id="title" name="title" labelText="Title" required />
        <TextInput id="notes" name="notes" labelText="Notes" />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create standard"}
        </Button>
      </Stack>
    </Form>
  );
}
