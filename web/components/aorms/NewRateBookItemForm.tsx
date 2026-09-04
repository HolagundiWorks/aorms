"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import {
  createRateBookItemRecord,
  type RateBookItemActionState,
} from "../../lib/actions/rate-books";

const initialState: RateBookItemActionState = null;

export function NewRateBookItemForm({ rateBookId }: { rateBookId: string }) {
  const [state, formAction, pending] = useActionState(createRateBookItemRecord, initialState);

  return (
    <Form action={formAction}>
      <input type="hidden" name="rateBookId" value={rateBookId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification
            kind="error"
            title="Could not add item"
            subtitle={state.error}
            hideCloseButton
            lowContrast
          />
        )}
        <TextInput id="itemCode" name="itemCode" labelText="Item code" />
        <TextInput id="description" name="description" labelText="Description" required />
        <TextInput id="unit" name="unit" labelText="Unit" placeholder="e.g. sqm, cum, nos" required />
        <TextInput id="ratePaise" name="ratePaise" labelText="Rate (₹)" type="number" defaultValue="0" />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add item"}
        </Button>
      </Stack>
    </Form>
  );
}
