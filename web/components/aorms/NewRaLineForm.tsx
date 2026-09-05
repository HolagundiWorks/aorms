"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { createRaLine } from "../../lib/actions/pmc-ra-bills";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewRaLineForm({ billId }: { billId: string }) {
  const boundAction = createRaLine.bind(null, billId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add line" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))", gap: "1rem" }}>
          <TextInput id="description" name="description" labelText="Description" required />
          <TextInput id="unit" name="unit" labelText="Unit" />
          <TextInput id="thisQty" name="thisQty" labelText="This period qty" type="number" step="any" required />
          <TextInput id="rate" name="rate" labelText="Rate (₹)" type="number" step="any" required />
        </div>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add line"}
        </Button>
      </Stack>
    </Form>
  );
}
