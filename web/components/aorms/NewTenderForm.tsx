"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createTender } from "../../lib/actions/tenders";

type ProjectOption = { id: string; title: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewTenderForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createTender, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not create tender" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
          <SelectItem value="" text="— Select a project —" />
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} text={p.title} />
          ))}
        </Select>
        <TextInput id="title" name="title" labelText="Title" required />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))", gap: "1rem" }}>
          <TextInput id="category" name="category" labelText="Category" />
          <TextInput id="dueDate" name="dueDate" labelText="Due date" type="date" />
        </div>
        <TextArea id="instructions" name="instructions" labelText="Instructions" rows={3} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create tender"}
        </Button>
      </Stack>
    </Form>
  );
}
