"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { updateOfficeTemplate, type OfficeTemplateActionState } from "../../lib/actions/office-templates";
import { FormGrid } from "./FormGrid";

const KIND_LABEL: Record<string, string> = {
  LETTER: "Letter",
  SCOPE: "Scope of work",
  COA: "COA fee proposal",
  CONTRACT: "Contract / agreement",
  MOM: "Meeting minutes",
};

const initialState: OfficeTemplateActionState = null;

export type OfficeTemplate = { id: string; kind: string; title: string; body: string; tags: string | null };

export function EditOfficeTemplateForm({ template }: { template: OfficeTemplate }) {
  const [state, formAction, pending] = useActionState(updateOfficeTemplate, initialState);

  return (
    <Form action={formAction}>
      <input type="hidden" name="id" value={template.id} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not save" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <Select id="kind" name="kind" labelText="Kind" defaultValue={template.kind}>
            {Object.entries(KIND_LABEL).map(([code, label]) => (
              <SelectItem key={code} value={code} text={label} />
            ))}
          </Select>
          <TextInput id="title" name="title" labelText="Title" defaultValue={template.title} required />
          <TextInput id="tags" name="tags" labelText="Tags (optional)" defaultValue={template.tags ?? ""} placeholder="comma-separated" />
        </FormGrid>
        <TextArea id="body" name="body" labelText="Body" rows={10} defaultValue={template.body} required />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </Stack>
    </Form>
  );
}
