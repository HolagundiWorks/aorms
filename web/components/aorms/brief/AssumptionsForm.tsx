"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextArea } from "@carbon/react";
import { saveAssumptions } from "../../../lib/actions/project-brief";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function AssumptionsForm({ projectId, value, readOnly }: { projectId: string; value: string | null; readOnly: boolean }) {
  const boundAction = saveAssumptions.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not save" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <TextArea id="assumptions" name="assumptions" labelText="Assumptions & exclusions" rows={6} readOnly={readOnly} defaultValue={value ?? ""} />
        {!readOnly && (
          <Button type="submit" disabled={pending} size="sm">
            {pending ? "Saving…" : "Save assumptions"}
          </Button>
        )}
      </Stack>
    </Form>
  );
}
