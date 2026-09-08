"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { addNumberingPatternRecord, type NumberingPatternActionState } from "../../lib/actions/numbering";
import { FormGrid } from "./FormGrid";

const initialState: NumberingPatternActionState = null;

export function NewNumberingPatternForm() {
  const [state, formAction, pending] = useActionState(addNumberingPatternRecord, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not save" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="np-scope" name="scope" labelText="Scope" placeholder="e.g. letter, invoice, estimate" required />
          <TextInput id="np-prefix" name="prefix" labelText="Prefix override" placeholder="e.g. LTR" />
          <TextInput id="np-padding" name="padding" labelText="Padding override" type="number" placeholder="e.g. 4" />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Saving…" : "Save override"}
        </Button>
      </Stack>
    </Form>
  );
}
