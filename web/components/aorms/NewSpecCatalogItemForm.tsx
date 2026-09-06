"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { addSpecCatalogItem, type SpecCatalogActionState } from "../../lib/actions/spec-catalog";
import { FormGrid } from "./FormGrid";

const initialState: SpecCatalogActionState = null;

export function NewSpecCatalogItemForm({ versionId }: { versionId: string }) {
  const [state, formAction, pending] = useActionState(addSpecCatalogItem, initialState);

  return (
    <Form action={formAction}>
      <input type="hidden" name="versionId" value={versionId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add item" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="category" name="category" labelText="Category" placeholder="e.g. Flooring" />
          <TextInput id="item" name="item" labelText="Item" required />
          <TextInput id="make" name="make" labelText="Make" />
          <TextInput id="specification" name="specification" labelText="Specification" />
          <TextInput id="finish" name="finish" labelText="Finish" />
          <TextInput id="remarks" name="remarks" labelText="Remarks" />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add item"}
        </Button>
      </Stack>
    </Form>
  );
}
