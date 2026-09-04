"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createSnag } from "../../lib/actions/snags";

type ProjectOption = { id: string; title: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewSnagForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createSnag, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not log snag" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
          <SelectItem value="" text="— Select a project —" />
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} text={p.title} />
          ))}
        </Select>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))", gap: "1rem" }}>
          <TextInput id="location" name="location" labelText="Location" />
          <TextInput id="trade" name="trade" labelText="Trade" />
          <TextInput id="dueDate" name="dueDate" labelText="Due date" type="date" />
        </div>
        <TextInput id="description" name="description" labelText="Description" required />
        <Button type="submit" disabled={pending}>
          {pending ? "Logging…" : "Log snag"}
        </Button>
      </Stack>
    </Form>
  );
}
