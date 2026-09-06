"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createEstimateItemRecord, type EstimateItemActionState } from "../../lib/actions/estimates";
import { FormGrid } from "./FormGrid";

type RateBookItemOption = { id: string; description: string; unit: string; rate_paise: number };

const initialState: EstimateItemActionState = null;

export function NewEstimateItemForm({
  estimateId,
  rateBookItems,
}: {
  estimateId: string;
  rateBookItems: RateBookItemOption[];
}) {
  const [state, formAction, pending] = useActionState(createEstimateItemRecord, initialState);

  return (
    <Form action={formAction}>
      <input type="hidden" name="estimateId" value={estimateId} />
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
        <FormGrid>
          <Select id="rateBookItemId" name="rateBookItemId" labelText="Rate book item (optional)" defaultValue="">
            <SelectItem value="" text="— None —" />
            {rateBookItems.map((rbi) => (
              <SelectItem key={rbi.id} value={rbi.id} text={`${rbi.description} (${rbi.unit})`} />
            ))}
          </Select>
          <TextInput id="description" name="description" labelText="Description" required />
          <TextInput id="unit" name="unit" labelText="Unit" placeholder="e.g. sqm, cum, nos" required />
          <TextInput id="quantity" name="quantity" labelText="Quantity" type="number" step="any" defaultValue="0" />
          <TextInput id="ratePaise" name="ratePaise" labelText="Rate (₹)" type="number" step="any" defaultValue="0" />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add item"}
        </Button>
      </Stack>
    </Form>
  );
}
