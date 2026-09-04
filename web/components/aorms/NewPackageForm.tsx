"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createPackage } from "../../lib/actions/pmc-packages";

type ProjectOption = { id: string; title: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewPackageForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createPackage, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not create package" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
          <SelectItem value="" text="— Select a project —" />
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} text={p.title} />
          ))}
        </Select>
        <TextInput id="title" name="title" labelText="Title" required />
        <TextInput id="trade" name="trade" labelText="Trade" />
        <TextInput id="tenderCloseDate" name="tenderCloseDate" labelText="Tender close date" type="date" />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create package"}
        </Button>
      </Stack>
    </Form>
  );
}
