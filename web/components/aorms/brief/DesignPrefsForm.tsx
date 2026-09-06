"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextArea, TextInput } from "@carbon/react";
import { saveDesignPrefs } from "../../../lib/actions/project-brief";
import { FormGrid } from "../FormGrid";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export type DesignPrefsValues = {
  orientation?: string;
  doorDirection?: string;
  views?: string;
  basement?: string;
  vastu?: string;
  style?: string;
  lovedPlaces?: string;
  activities?: string;
  indoorPrefs?: string;
  outdoorPrefs?: string;
} | null;

export function DesignPrefsForm({ projectId, values, readOnly }: { projectId: string; values: DesignPrefsValues; readOnly: boolean }) {
  const boundAction = saveDesignPrefs.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not save" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="orientation" name="orientation" labelText="Orientation" readOnly={readOnly} defaultValue={values?.orientation ?? ""} />
          <TextInput id="doorDirection" name="doorDirection" labelText="Main door direction" readOnly={readOnly} defaultValue={values?.doorDirection ?? ""} />
          <TextInput id="basement" name="basement" labelText="Basement" readOnly={readOnly} defaultValue={values?.basement ?? ""} />
          <TextInput id="vastu" name="vastu" labelText="Vastu requirements" readOnly={readOnly} defaultValue={values?.vastu ?? ""} />
        </FormGrid>
        <TextArea id="views" name="views" labelText="Desired views" rows={2} readOnly={readOnly} defaultValue={values?.views ?? ""} />
        <TextArea id="style" name="style" labelText="Style & preferences" rows={2} readOnly={readOnly} defaultValue={values?.style ?? ""} />
        <TextArea id="lovedPlaces" name="lovedPlaces" labelText="Loved places / inspirations" rows={2} readOnly={readOnly} defaultValue={values?.lovedPlaces ?? ""} />
        <TextArea id="activities" name="activities" labelText="Important activities" rows={2} readOnly={readOnly} defaultValue={values?.activities ?? ""} />
        <TextArea id="indoorPrefs" name="indoorPrefs" labelText="Indoor preferences" rows={2} readOnly={readOnly} defaultValue={values?.indoorPrefs ?? ""} />
        <TextArea id="outdoorPrefs" name="outdoorPrefs" labelText="Outdoor preferences" rows={2} readOnly={readOnly} defaultValue={values?.outdoorPrefs ?? ""} />
        {!readOnly && (
          <Button type="submit" disabled={pending} size="sm">
            {pending ? "Saving…" : "Save design preferences"}
          </Button>
        )}
      </Stack>
    </Form>
  );
}
