"use client";

import { useActionState } from "react";
import {
  Button,
  Form,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  TextArea,
  TextInput,
} from "@carbon/react";
import { createMomRecord, type MomActionState } from "../../lib/actions/moms";

type ProjectOption = { id: string; title: string };

const initialState: MomActionState = null;

export function NewMomForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createMomRecord, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification
            kind="error"
            title="Could not create minutes"
            subtitle={state.error}
            hideCloseButton
            lowContrast
          />
        )}
        <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
          <SelectItem value="" text="— Select a project —" />
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} text={p.title} />
          ))}
        </Select>
        <TextInput id="title" name="title" labelText="Title" required />
        <TextInput id="meetingDate" name="meetingDate" labelText="Meeting date" type="date" />
        <TextInput id="venue" name="venue" labelText="Venue" />
        <TextInput id="attendees" name="attendees" labelText="Attendees" />
        <TextArea id="minutes" name="minutes" labelText="Minutes" rows={4} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create minutes"}
        </Button>
      </Stack>
    </Form>
  );
}
