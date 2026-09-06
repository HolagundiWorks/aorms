"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createRaBill } from "../../lib/actions/pmc-ra-bills";
import { FormGrid } from "./FormGrid";

type ProjectOption = { id: string; title: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewRaBillForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createRaBill, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not create bill" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
            <SelectItem value="" text="— Select a project —" />
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} text={p.title} />
            ))}
          </Select>
          <TextInput id="billNo" name="billNo" labelText="Bill number" required />
          <TextInput id="periodStart" name="periodStart" labelText="Period start" type="date" required />
          <TextInput id="periodEnd" name="periodEnd" labelText="Period end" type="date" required />
        </FormGrid>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create bill"}
        </Button>
      </Stack>
    </Form>
  );
}
