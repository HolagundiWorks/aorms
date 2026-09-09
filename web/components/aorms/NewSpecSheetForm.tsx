"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createSpecSheetRecord, type SpecSheetActionState } from "../../lib/actions/spec-sheets";
import { FormGrid } from "./FormGrid";

type ProjectOption = { id: string; title: string };

const initialState: SpecSheetActionState = null;

export function NewSpecSheetForm({ projects, onSuccess }: { projects: ProjectOption[]; onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(createSpecSheetRecord, initialState);

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
            title="Could not create spec sheet"
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
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create spec sheet"}
        </Button>
      </Stack>
    </Form>
  );
}
