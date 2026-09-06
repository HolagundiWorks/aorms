"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { addNegotiationRound } from "../../lib/actions/negotiation";
import { FormGrid } from "./FormGrid";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewNegotiationRoundForm({ projectId }: { projectId: string }) {
  const boundAction = addNegotiationRound.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add round" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="feeChange" name="feeChange" labelText="Fee change (₹, negative = discount)" type="number" step="any" />
          <TextInput id="discountRequestedPct" name="discountRequestedPct" labelText="Discount requested %" type="number" step="any" />
          <Select id="outcome" name="outcome" labelText="Outcome" defaultValue="ONGOING">
            <SelectItem value="ONGOING" text="Ongoing" />
            <SelectItem value="AGREED" text="Agreed" />
            <SelectItem value="STALLED" text="Stalled" />
            <SelectItem value="WITHDRAWN" text="Withdrawn" />
          </Select>
        </FormGrid>
        <TextArea id="scopeChanges" name="scopeChanges" labelText="Scope changes" rows={2} />
        <TextArea id="timelineChanges" name="timelineChanges" labelText="Timeline changes" rows={2} />
        <TextArea id="architectResponse" name="architectResponse" labelText="Architect response" rows={2} />
        <TextArea id="clientResponse" name="clientResponse" labelText="Client response" rows={2} />
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add round"}
        </Button>
      </Stack>
    </Form>
  );
}
