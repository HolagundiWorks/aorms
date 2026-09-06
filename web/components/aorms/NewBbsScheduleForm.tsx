"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createBbsSchedule, type BbsActionState } from "../../lib/actions/bbs";
import { FormGrid } from "./FormGrid";

type ProjectOption = { id: string; title: string };

const initialState: BbsActionState = null;

export function NewBbsScheduleForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createBbsSchedule, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification
            kind="error"
            title="Could not create BBS schedule"
            subtitle={state.error}
            hideCloseButton
            lowContrast
          />
        )}
        <FormGrid>
          <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
            <SelectItem value="" text="— Select a project —" />
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} text={p.title} />
            ))}
          </Select>
          <TextInput id="title" name="title" labelText="Title" required />
        </FormGrid>
        <TextArea id="notes" name="notes" labelText="Notes" rows={2} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create BBS schedule"}
        </Button>
      </Stack>
    </Form>
  );
}
