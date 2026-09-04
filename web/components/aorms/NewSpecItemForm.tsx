"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { createSpecItemRecord, type SpecItemActionState } from "../../lib/actions/spec-sheets";

const initialState: SpecItemActionState = null;

export function NewSpecItemForm({ specSheetId }: { specSheetId: string }) {
  const [state, formAction, pending] = useActionState(createSpecItemRecord, initialState);

  return (
    <Form action={formAction}>
      <input type="hidden" name="specSheetId" value={specSheetId} />
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
        <TextInput id="category" name="category" labelText="Category" placeholder="e.g. Flooring" />
        <TextInput id="item" name="item" labelText="Item" required />
        <TextInput id="make" name="make" labelText="Make" />
        <TextInput id="specification" name="specification" labelText="Specification" />
        <TextInput id="finish" name="finish" labelText="Finish" />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add item"}
        </Button>
      </Stack>
    </Form>
  );
}
