"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createMilestone } from "../../lib/actions/pmc-milestones";
import { FormGrid } from "./FormGrid";

type ProjectOption = { id: string; title: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewMilestoneForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createMilestone, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not create milestone" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
            <SelectItem value="" text="— Select a project —" />
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} text={p.title} />
            ))}
          </Select>
          <TextInput id="title" name="title" labelText="Title" required />
          <TextInput id="plannedDate" name="plannedDate" labelText="Planned date" type="date" />
        </FormGrid>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create milestone"}
        </Button>
      </Stack>
    </Form>
  );
}
