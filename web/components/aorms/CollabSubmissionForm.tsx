"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { submitToProject, type CollabActionState } from "../../lib/actions/collab-portal";
import { FormGrid } from "./FormGrid";

const initialState: CollabActionState = null;

export function CollabSubmissionForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(submitToProject, initialState);

  return (
    <Form action={formAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not submit" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <Select id="kind" name="kind" labelText="Kind" defaultValue="NOTE">
            <SelectItem value="RFI" text="RFI" />
            <SelectItem value="DELIVERABLE" text="Deliverable" />
            <SelectItem value="NOTE" text="Note" />
          </Select>
          <TextInput id="subject" name="subject" labelText="Subject" required />
        </FormGrid>
        <TextArea id="body" name="body" labelText="Details" rows={3} />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Submitting…" : "Submit"}
        </Button>
      </Stack>
    </Form>
  );
}
