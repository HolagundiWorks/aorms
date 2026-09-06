"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { addManualBbsItem, type BbsActionState } from "../../lib/actions/bbs";
import { FormGrid } from "./FormGrid";

const initialState: BbsActionState = null;

export function NewBbsItemForm({ bbsId }: { bbsId: string }) {
  const [state, formAction, pending] = useActionState(addManualBbsItem, initialState);

  return (
    <Form action={formAction}>
      <input type="hidden" name="bbsId" value={bbsId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add bar line" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="barMark" name="barMark" labelText="Bar mark" required />
          <TextInput id="itemDiaMm" name="diaMm" labelText="Dia (mm)" type="number" step="any" required />
          <TextInput id="noOfMembers" name="noOfMembers" labelText="No. of members" type="number" defaultValue="1" />
          <TextInput id="barsPerMember" name="barsPerMember" labelText="Bars per member" type="number" defaultValue="1" />
          <TextInput id="cuttingLengthMm" name="cuttingLengthMm" labelText="Cutting length (mm)" type="number" step="any" required />
          <TextInput id="floor" name="floor" labelText="Floor (optional)" />
          <TextInput id="shape" name="shape" labelText="Shape (optional)" />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add bar line"}
        </Button>
      </Stack>
    </Form>
  );
}
