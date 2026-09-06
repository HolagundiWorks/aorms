"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { addTransmittalItemRecord, type TransmittalItemActionState } from "../../lib/actions/transmittals";
import { FormGrid } from "./FormGrid";

type DrawingOption = { id: string; ref: string; title: string };

const initialState: TransmittalItemActionState = null;

export function NewTransmittalItemForm({ transmittalId, drawings }: { transmittalId: string; drawings: DrawingOption[] }) {
  const [state, formAction, pending] = useActionState(addTransmittalItemRecord, initialState);

  return (
    <Form action={formAction}>
      <input type="hidden" name="transmittalId" value={transmittalId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add item" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <Select id="drawingId" name="drawingId" labelText="Drawing (optional)" defaultValue="">
            <SelectItem value="" text="— Not a tracked drawing —" />
            {drawings.map((d) => (
              <SelectItem key={d.id} value={d.id} text={`${d.ref} — ${d.title}`} />
            ))}
          </Select>
          <TextInput id="drawingRef" name="drawingRef" labelText="Reference (if not a tracked drawing)" />
          <TextInput id="title" name="title" labelText="Title" required />
          <TextInput id="rev" name="rev" labelText="Revision" placeholder="e.g. P2" />
          <TextInput id="copies" name="copies" labelText="Copies" type="number" defaultValue="1" />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add item"}
        </Button>
      </Stack>
    </Form>
  );
}
