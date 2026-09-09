"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createDecision } from "../../lib/actions/decisions";
import { FormGrid } from "./FormGrid";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

/** New CRIF decision — created in DRAFT, moved on via DecisionStateSelect. */
export function NewDecisionForm({ projectId }: { projectId: string }) {
  const boundAction = createDecision.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction} style={{ marginBottom: "2rem" }}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add decision" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <TextInput id="title" name="title" labelText="Title" />
        <TextArea id="rationale" name="rationale" labelText="Rationale" rows={3} />
        <FormGrid>
          <Select id="revisionCategory" name="revisionCategory" labelText="Revision category" defaultValue="">
            <SelectItem value="" text="— Not a revision —" />
            <SelectItem value="MINOR" text="Minor" />
            <SelectItem value="MAJOR" text="Major" />
            <SelectItem value="CRITICAL" text="Critical" />
          </Select>
          <Select id="revisionSource" name="revisionSource" labelText="Revision source" defaultValue="">
            <SelectItem value="" text="— N/A —" />
            <SelectItem value="CLIENT_DRIVEN" text="Client-driven" />
            <SelectItem value="INTERNAL_ERROR" text="Internal error" />
            <SelectItem value="TECHNICAL_QUERY" text="Technical query" />
            <SelectItem value="SCOPE_CHANGE" text="Scope change" />
          </Select>
          <Select id="impact" name="impact" labelText="Impact" defaultValue="LOW">
            <SelectItem value="LOW" text="Low" />
            <SelectItem value="MEDIUM" text="Medium" />
            <SelectItem value="HIGH" text="High" />
          </Select>
          <TextInput id="ownerName" name="ownerName" labelText="Owner" />
          <TextInput id="reviewDeadline" name="reviewDeadline" labelText="Review deadline" type="date" />
        </FormGrid>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add decision"}
        </Button>
      </Stack>
    </Form>
  );
}
