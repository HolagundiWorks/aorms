"use client";

import { useActionState } from "react";
import {
  Button,
  Form,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  TextInput,
} from "@carbon/react";
import { createProjectRecord, type ProjectActionState } from "../../lib/actions/projects";

type ClientOption = { id: string; name: string };

const initialState: ProjectActionState = null;

export function NewProjectForm({ clients }: { clients: ClientOption[] }) {
  const [state, formAction, pending] = useActionState(createProjectRecord, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification
            kind="error"
            title="Could not create project"
            subtitle={state.error}
            hideCloseButton
            lowContrast
          />
        )}
        <TextInput id="title" name="title" labelText="Project title" required />
        <TextInput
          id="projectType"
          name="projectType"
          labelText="Project type"
          placeholder="e.g. Residential, Commercial"
          required
        />
        <Select id="workType" name="workType" labelText="Work type" defaultValue="ARCHITECTURE">
          <SelectItem value="ARCHITECTURE" text="Architecture" />
          <SelectItem value="INTERIOR" text="Interior" />
          <SelectItem value="LANDSCAPE" text="Landscape" />
          <SelectItem value="MISC" text="Misc" />
        </Select>
        <Select id="clientId" name="clientId" labelText="Client" defaultValue="">
          <SelectItem value="" text="— No client —" />
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id} text={c.name} />
          ))}
        </Select>
        <TextInput id="city" name="city" labelText="City" />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create project"}
        </Button>
      </Stack>
    </Form>
  );
}
