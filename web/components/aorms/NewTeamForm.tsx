"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { createTeam } from "../../lib/actions/teams";
import { FormGrid } from "./FormGrid";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewTeamForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [state, formAction, pending] = useActionState(createTeam, initialState);

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
          <InlineNotification kind="error" title="Could not create team" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="name" name="name" labelText="Name" required />
          <TextInput id="description" name="description" labelText="Description" />
        </FormGrid>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create team"}
        </Button>
      </Stack>
    </Form>
  );
}
