"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createAssignment } from "../../../lib/actions/hr";

type ProjectOption = { id: string; title: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewAssignmentForm({ memberId, projects }: { memberId: string; projects: ProjectOption[] }) {
  const boundAction = createAssignment.bind(null, memberId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not assign" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
          <SelectItem value="" text="— Select a project —" />
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} text={p.title} />
          ))}
        </Select>
        <TextInput id="role" name="role" labelText="Role on project" placeholder="e.g. Lead Architect" required />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Assigning…" : "Assign"}
        </Button>
      </Stack>
    </Form>
  );
}
