"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextArea, TextInput } from "@carbon/react";
import { saveBasicInfo } from "../../../lib/actions/project-brief";
import { FormGrid } from "../FormGrid";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export type BasicInfoValues = {
  clientName?: string;
  currentAddress?: string;
  siteAddress?: string;
  mobile?: string;
  email?: string;
  occupation?: string;
  plotSize?: string;
  terrain?: string;
  vegetation?: string;
  orientationNotes?: string;
} | null;

export function BasicInfoForm({ projectId, values, readOnly }: { projectId: string; values: BasicInfoValues; readOnly: boolean }) {
  const boundAction = saveBasicInfo.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not save" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="clientName" name="clientName" labelText="Client name" readOnly={readOnly} defaultValue={values?.clientName ?? ""} />
          <TextInput id="mobile" name="mobile" labelText="Mobile" readOnly={readOnly} defaultValue={values?.mobile ?? ""} />
          <TextInput id="email" name="email" labelText="Email" type="email" readOnly={readOnly} defaultValue={values?.email ?? ""} />
          <TextInput id="occupation" name="occupation" labelText="Occupation" readOnly={readOnly} defaultValue={values?.occupation ?? ""} />
          <TextInput id="plotSize" name="plotSize" labelText="Plot size" readOnly={readOnly} defaultValue={values?.plotSize ?? ""} />
          <TextInput id="terrain" name="terrain" labelText="Terrain" readOnly={readOnly} defaultValue={values?.terrain ?? ""} />
          <TextInput id="vegetation" name="vegetation" labelText="Vegetation" readOnly={readOnly} defaultValue={values?.vegetation ?? ""} />
        </FormGrid>
        <TextArea id="currentAddress" name="currentAddress" labelText="Current address" rows={2} readOnly={readOnly} defaultValue={values?.currentAddress ?? ""} />
        <TextArea id="siteAddress" name="siteAddress" labelText="Site address" rows={2} readOnly={readOnly} defaultValue={values?.siteAddress ?? ""} />
        <TextArea id="orientationNotes" name="orientationNotes" labelText="Orientation notes" rows={2} readOnly={readOnly} defaultValue={values?.orientationNotes ?? ""} />
        {!readOnly && (
          <Button type="submit" disabled={pending} size="sm">
            {pending ? "Saving…" : "Save basic info"}
          </Button>
        )}
      </Stack>
    </Form>
  );
}
