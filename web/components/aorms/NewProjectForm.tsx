"use client";

import { useActionState, useEffect, useRef } from "react";
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
import { FormGrid } from "./FormGrid";

type ClientOption = { id: string; name: string };

const initialState: ProjectActionState = null;

export function NewProjectForm({ clients, onSuccess }: { clients: ClientOption[]; onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(createProjectRecord, initialState);

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
          <InlineNotification
            kind="error"
            title="Could not create project"
            subtitle={state.error}
            hideCloseButton
            lowContrast
          />
        )}
        <FormGrid>
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
          {/* Project-specific communication contact — independent of the
              selected client's own email/phone above (migration 0044).
              The project still shows the client's own info via clientId;
              this is who to actually reach for THIS project. */}
          <TextInput
            id="contactEmail"
            name="contactEmail"
            labelText="Contact email"
            type="email"
            placeholder="Project-specific, if different from the client's own"
          />
          <TextInput
            id="contactPhone"
            name="contactPhone"
            labelText="Contact phone"
            placeholder="Project-specific, if different from the client's own"
          />
        </FormGrid>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create project"}
        </Button>
      </Stack>
    </Form>
  );
}
