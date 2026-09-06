"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createOfficeTemplate, type OfficeTemplateActionState } from "../../lib/actions/office-templates";
import { FormGrid } from "./FormGrid";

const KIND_LABEL: Record<string, string> = {
  LETTER: "Letter",
  SCOPE: "Scope of work",
  COA: "COA fee proposal",
  CONTRACT: "Contract / agreement",
  MOM: "Meeting minutes",
};

const initialState: OfficeTemplateActionState = null;

export function NewOfficeTemplateForm() {
  const [state, formAction, pending] = useActionState(createOfficeTemplate, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add template" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <Select id="kind" name="kind" labelText="Kind" defaultValue="LETTER">
            {Object.entries(KIND_LABEL).map(([code, label]) => (
              <SelectItem key={code} value={code} text={label} />
            ))}
          </Select>
          <TextInput id="title" name="title" labelText="Title" required />
          <TextInput id="tags" name="tags" labelText="Tags (optional)" placeholder="comma-separated" />
        </FormGrid>
        <TextArea id="body" name="body" labelText="Body" rows={6} required />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add template"}
        </Button>
      </Stack>
    </Form>
  );
}
