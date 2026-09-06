"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { addMomActionRecord, type MomActionItemState } from "../../lib/actions/moms";
import { FormGrid } from "./FormGrid";

const initialState: MomActionItemState = null;

export function NewMomActionForm({ momId }: { momId: string }) {
  const [state, formAction, pending] = useActionState(addMomActionRecord, initialState);

  return (
    <Form action={formAction}>
      <input type="hidden" name="momId" value={momId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add action" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="description" name="description" labelText="Action" required />
          <TextInput id="assigneeName" name="assigneeName" labelText="Assignee" />
          <TextInput id="dueDate" name="dueDate" labelText="Due date" type="date" />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add action"}
        </Button>
      </Stack>
    </Form>
  );
}
