"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, FileUploader, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { uploadDrawing, type DrawingActionState } from "../../lib/actions/drawings";
import { FormGrid } from "./FormGrid";

type ProjectOption = { id: string; title: string };

const initialState: DrawingActionState = null;

export function NewDrawingForm({ projects, onSuccess }: { projects: ProjectOption[]; onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(uploadDrawing, initialState);

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
            title="Could not upload drawing"
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
        <FileUploader
          id="file"
          name="file"
          labelTitle="File"
          labelDescription="DXF (worker-rendered SVG + takeoff) or PDF (plan sheet), 25 MB max."
          buttonLabel="Choose file"
          accept={[".dxf", ".pdf"]}
          filenameStatus="edit"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload drawing"}
        </Button>
      </Stack>
    </Form>
  );
}
