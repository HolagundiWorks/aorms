"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { saveAssessment } from "../../lib/actions/project-assessment";
import { FormGrid } from "./FormGrid";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export type AssessmentValues = {
  site_length: number | null;
  site_width: number | null;
  manual_area: number | null;
  far_factor: number;
  front_setback: number;
  rear_setback: number;
  left_setback: number;
  right_setback: number;
  ground_coverage_pct: number;
  super_builtup_factor: number;
  construction_rate_paise: number;
} | null;

/** step="any" throughout — a plain type="number" input defaults to step=1,
 * which rejects legitimate decimal inputs (a FAR factor of 1.5, say) with
 * "the two nearest valid values are 1 and 2" native browser validation. */
export function AssessmentForm({ projectId, values }: { projectId: string; values: AssessmentValues }) {
  const boundAction = saveAssessment.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not save assessment" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="siteLength" name="siteLength" labelText="Site length (m)" type="number" step="any" defaultValue={values?.site_length ?? ""} />
          <TextInput id="siteWidth" name="siteWidth" labelText="Site width (m)" type="number" step="any" defaultValue={values?.site_width ?? ""} />
          <TextInput id="manualArea" name="manualArea" labelText="Manual area override (sqm)" type="number" step="any" defaultValue={values?.manual_area ?? ""} />
          <TextInput id="farFactor" name="farFactor" labelText="FAR factor" type="number" step="any" required defaultValue={values?.far_factor ?? ""} />
          <TextInput id="frontSetback" name="frontSetback" labelText="Front setback (m)" type="number" step="any" defaultValue={values?.front_setback ?? 0} />
          <TextInput id="rearSetback" name="rearSetback" labelText="Rear setback (m)" type="number" step="any" defaultValue={values?.rear_setback ?? 0} />
          <TextInput id="leftSetback" name="leftSetback" labelText="Left setback (m)" type="number" step="any" defaultValue={values?.left_setback ?? 0} />
          <TextInput id="rightSetback" name="rightSetback" labelText="Right setback (m)" type="number" step="any" defaultValue={values?.right_setback ?? 0} />
          <TextInput id="groundCoveragePct" name="groundCoveragePct" labelText="Ground coverage %" type="number" step="any" required defaultValue={values?.ground_coverage_pct ?? ""} />
          <TextInput
            id="superBuiltupFactor"
            name="superBuiltupFactor"
            labelText="Super-builtup factor"
            type="number"
            step="any"
            defaultValue={values?.super_builtup_factor ?? 1.25}
          />
          <TextInput
            id="constructionRate"
            name="constructionRate"
            labelText="Construction rate (₹/sqm)"
            type="number"
            step="any"
            defaultValue={values ? values.construction_rate_paise / 100 : ""}
          />
        </FormGrid>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save assessment"}
        </Button>
      </Stack>
    </Form>
  );
}
