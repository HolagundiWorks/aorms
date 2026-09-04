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
import { createTransmittalRecord, type TransmittalActionState } from "../../lib/actions/transmittals";

type ProjectOption = { id: string; title: string };

const initialState: TransmittalActionState = null;

export function NewTransmittalForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createTransmittalRecord, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification
            kind="error"
            title="Could not create transmittal"
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
        <TextInput id="recipient" name="recipient" labelText="Recipient" required />
        <TextInput id="purpose" name="purpose" labelText="Purpose" placeholder="e.g. For approval" required />
        <Select id="channel" name="channel" labelText="Channel" defaultValue="EMAIL">
          <SelectItem value="EMAIL" text="Email" />
          <SelectItem value="COURIER" text="Courier" />
          <SelectItem value="HAND" text="Hand delivery" />
          <SelectItem value="PORTAL" text="Client portal" />
        </Select>
        <TextInput id="dateIssued" name="dateIssued" labelText="Date issued" type="date" />
        <TextArea id="notes" name="notes" labelText="Notes" rows={2} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create transmittal"}
        </Button>
      </Stack>
    </Form>
  );
}
