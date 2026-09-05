"use client";

import { useActionState } from "react";
import { Button, Checkbox, Form, InlineNotification, Stack, TextArea, TextInput } from "@carbon/react";
import { saveProjectInfo } from "../../../lib/actions/project-brief";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export type ProjectInfoValues = {
  intendedUse?: string;
  builtUpAreaSqm?: number;
  phasedConstruction?: boolean;
  tentativeStart?: string;
  budgetNote?: string;
  financeNote?: string;
} | null;

export function ProjectInfoForm({ projectId, values, readOnly }: { projectId: string; values: ProjectInfoValues; readOnly: boolean }) {
  const boundAction = saveProjectInfo.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not save" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <TextArea id="intendedUse" name="intendedUse" labelText="Intended use" rows={2} readOnly={readOnly} defaultValue={values?.intendedUse ?? ""} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(13rem, 1fr))", gap: "1rem" }}>
          <TextInput id="builtUpAreaSqm" name="builtUpAreaSqm" labelText="Built-up area (sqm)" type="number" step="any" readOnly={readOnly} defaultValue={values?.builtUpAreaSqm ?? ""} />
          <TextInput id="tentativeStart" name="tentativeStart" labelText="Tentative start" type="date" readOnly={readOnly} defaultValue={values?.tentativeStart ?? ""} />
        </div>
        <Checkbox id="phasedConstruction" name="phasedConstruction" labelText="Phased construction" readOnly={readOnly} defaultChecked={values?.phasedConstruction ?? false} />
        <TextArea id="budgetNote" name="budgetNote" labelText="Budget note" rows={2} readOnly={readOnly} defaultValue={values?.budgetNote ?? ""} />
        <TextArea id="financeNote" name="financeNote" labelText="Finance note" rows={2} readOnly={readOnly} defaultValue={values?.financeNote ?? ""} />
        {!readOnly && (
          <Button type="submit" disabled={pending} size="sm">
            {pending ? "Saving…" : "Save project info"}
          </Button>
        )}
      </Stack>
    </Form>
  );
}
