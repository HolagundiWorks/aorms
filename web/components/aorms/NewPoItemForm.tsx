"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { addPoItemRecord, type PoItemActionState } from "../../lib/actions/purchase-orders";
import { FormGrid } from "./FormGrid";

const initialState: PoItemActionState = null;

export function NewPoItemForm({ poId }: { poId: string }) {
  const [state, formAction, pending] = useActionState(addPoItemRecord, initialState);

  return (
    <Form action={formAction}>
      <input type="hidden" name="poId" value={poId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add item" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="description" name="description" labelText="Description" required />
          <TextInput id="unit" name="unit" labelText="Unit" placeholder="e.g. nos, sqm, kg" />
          <TextInput id="qty" name="qty" labelText="Quantity" type="number" step="any" defaultValue="1" />
          <TextInput id="ratePaise" name="ratePaise" labelText="Rate (₹)" type="number" step="any" defaultValue="0" />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add item"}
        </Button>
      </Stack>
    </Form>
  );
}
