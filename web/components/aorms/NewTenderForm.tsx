"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createTender } from "../../lib/actions/tenders";
import { FormGrid } from "./FormGrid";

type ProjectOption = { id: string; title: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewTenderForm({ projects, onSuccess }: { projects: ProjectOption[]; onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(createTender, initialState);

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
          <InlineNotification kind="error" title="Could not create tender" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
            <SelectItem value="" text="— Select a project —" />
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} text={p.title} />
            ))}
          </Select>
          <TextInput id="title" name="title" labelText="Title" required />
          <TextInput id="category" name="category" labelText="Category" />
          <TextInput id="dueDate" name="dueDate" labelText="Due date" type="date" />
        </FormGrid>
        <TextArea id="instructions" name="instructions" labelText="Instructions" rows={3} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create tender"}
        </Button>
      </Stack>
    </Form>
  );
}
