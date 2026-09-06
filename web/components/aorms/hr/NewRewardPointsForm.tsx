"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { grantRewardPoints } from "../../../lib/actions/hr";
import { FormGrid } from "../FormGrid";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewRewardPointsForm({ memberId }: { memberId: string }) {
  const boundAction = grantRewardPoints.bind(null, memberId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not grant points" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="points" name="points" labelText="Points (+/-)" type="number" step="any" required />
          <TextInput id="reason" name="reason" labelText="Reason" required />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Granting…" : "Grant points"}
        </Button>
      </Stack>
    </Form>
  );
}
