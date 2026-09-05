"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextArea } from "@carbon/react";
import { saveMaterials } from "../../../lib/actions/project-brief";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export type MaterialsValues = {
  construction?: string;
  flooring?: string;
  walls?: string;
  cabinetry?: string;
  seating?: string;
  beds?: string;
} | null;

export function MaterialsForm({ projectId, values, readOnly }: { projectId: string; values: MaterialsValues; readOnly: boolean }) {
  const boundAction = saveMaterials.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not save" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <TextArea id="construction" name="construction" labelText="Construction" rows={2} readOnly={readOnly} defaultValue={values?.construction ?? ""} />
        <TextArea id="flooring" name="flooring" labelText="Flooring" rows={2} readOnly={readOnly} defaultValue={values?.flooring ?? ""} />
        <TextArea id="walls" name="walls" labelText="Walls" rows={2} readOnly={readOnly} defaultValue={values?.walls ?? ""} />
        <TextArea id="cabinetry" name="cabinetry" labelText="Cabinetry" rows={2} readOnly={readOnly} defaultValue={values?.cabinetry ?? ""} />
        <TextArea id="seating" name="seating" labelText="Seating" rows={2} readOnly={readOnly} defaultValue={values?.seating ?? ""} />
        <TextArea id="beds" name="beds" labelText="Beds" rows={2} readOnly={readOnly} defaultValue={values?.beds ?? ""} />
        {!readOnly && (
          <Button type="submit" disabled={pending} size="sm">
            {pending ? "Saving…" : "Save materials"}
          </Button>
        )}
      </Stack>
    </Form>
  );
}
