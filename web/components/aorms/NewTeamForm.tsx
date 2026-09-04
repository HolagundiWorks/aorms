"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { createTeam } from "../../lib/actions/teams";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewTeamForm() {
  const [state, formAction, pending] = useActionState(createTeam, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not create team" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <TextInput id="name" name="name" labelText="Name" required />
        <TextInput id="description" name="description" labelText="Description" />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create team"}
        </Button>
      </Stack>
    </Form>
  );
}
