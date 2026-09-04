"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createDrawingRecord, type DrawingActionState } from "../../lib/actions/drawings";

type ProjectOption = { id: string; title: string };

const initialState: DrawingActionState = null;

export function NewDrawingForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createDrawingRecord, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification
            kind="error"
            title="Could not create drawing"
            subtitle={state.error}
            hideCloseButton
            lowContrast
          />
        )}
        <InlineNotification
          kind="info"
          title="Upload not wired up yet"
          subtitle="This registers a drawing entry; the actual DXF/PDF upload path lands separately."
          hideCloseButton
          lowContrast
        />
        <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
          <SelectItem value="" text="— Select a project —" />
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} text={p.title} />
          ))}
        </Select>
        <TextInput id="title" name="title" labelText="Title" required />
        <TextInput id="fileName" name="fileName" labelText="File name" placeholder="e.g. GF-Plan.dxf" required />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Register drawing"}
        </Button>
      </Stack>
    </Form>
  );
}
