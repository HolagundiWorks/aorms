"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createRisk } from "../../lib/actions/project-precon";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewRiskForm({ projectId }: { projectId: string }) {
  const boundAction = createRisk.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add risk" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <TextInput id="title" name="title" labelText="Title" required />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(10rem, 1fr))", gap: "1rem" }}>
          <TextInput id="likelihood" name="likelihood" labelText="Likelihood (1-5)" type="number" step="any" defaultValue={3} />
          <TextInput id="impact" name="impact" labelText="Impact (1-5)" type="number" step="any" defaultValue={3} />
          <Select id="response" name="response" labelText="Response" defaultValue="REDUCE">
            <SelectItem value="AVOID" text="Avoid" />
            <SelectItem value="REDUCE" text="Reduce" />
            <SelectItem value="TRANSFER" text="Transfer" />
            <SelectItem value="ACCEPT" text="Accept" />
          </Select>
          <TextInput id="owner" name="owner" labelText="Owner" />
        </div>
        <TextArea id="mitigation" name="mitigation" labelText="Mitigation" rows={2} />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add risk"}
        </Button>
      </Stack>
    </Form>
  );
}
