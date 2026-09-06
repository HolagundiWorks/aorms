"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createOpportunity } from "../../lib/actions/project-precon";
import { FormGrid } from "./FormGrid";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

const AREAS = [
  "BUSINESS_CASE", "STAKEHOLDER", "SITE", "PLANNING", "DESIGN", "BUILDABILITY",
  "PROCUREMENT", "COST", "SCHEDULE", "CONTRACT", "SUSTAINABILITY", "DIGITAL",
];

export function NewOpportunityForm({ projectId }: { projectId: string }) {
  const boundAction = createOpportunity.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add opportunity" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <TextInput id="title" name="title" labelText="Title" required />
        <FormGrid>
          <Select id="source" name="source" labelText="Source" defaultValue="WORKSHOP">
            <SelectItem value="WORKSHOP" text="Workshop" />
            <SelectItem value="DESIGN_REVIEW" text="Design review" />
            <SelectItem value="SITE" text="Site" />
            <SelectItem value="LESSONS" text="Lessons learned" />
            <SelectItem value="EXPERT" text="Expert" />
            <SelectItem value="MARKET" text="Market" />
            <SelectItem value="OTHER" text="Other" />
          </Select>
          <Select id="area" name="area" labelText="Area" defaultValue="DESIGN">
            {AREAS.map((a) => (
              <SelectItem key={a} value={a} text={a} />
            ))}
          </Select>
          <TextInput id="probability" name="probability" labelText="Probability (1-5)" type="number" step="any" defaultValue={3} />
          <TextInput id="impact" name="impact" labelText="Impact (1-5)" type="number" step="any" defaultValue={3} />
          <Select id="response" name="response" labelText="Response" defaultValue="ENHANCE">
            <SelectItem value="EXPLOIT" text="Exploit" />
            <SelectItem value="ENHANCE" text="Enhance" />
            <SelectItem value="SHARE" text="Share" />
            <SelectItem value="ACCEPT" text="Accept" />
          </Select>
          <TextInput id="owner" name="owner" labelText="Owner" />
        </FormGrid>
        <TextArea id="actionPlan" name="actionPlan" labelText="Action plan" rows={2} />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add opportunity"}
        </Button>
      </Stack>
    </Form>
  );
}
