"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { createSpecCatalogVersion, type SpecCatalogActionState } from "../../lib/actions/spec-catalog";
import { FormGrid } from "./FormGrid";

const initialState: SpecCatalogActionState = null;

export function NewSpecCatalogVersionForm() {
  const [state, formAction, pending] = useActionState(createSpecCatalogVersion, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not create version" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="label" name="label" labelText="Label" placeholder="e.g. 2026-27" required />
          <TextInput id="description" name="description" labelText="Description (optional)" />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Creating…" : "Create version"}
        </Button>
      </Stack>
    </Form>
  );
}
