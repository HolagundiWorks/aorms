"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { addEstimateMeasurementRecord, type EstimateMeasurementActionState } from "../../lib/actions/estimates";
import { FormGrid } from "./FormGrid";

const initialState: EstimateMeasurementActionState = null;

/**
 * All five dimension fields are shown regardless of the item's unit —
 * the DB-level trigger (shape_for_unit()/measurement_quantity(), migration
 * 0005_phase4_estimation.sql) derives which ones actually matter from the
 * item's own unit (nos alone for COUNT, nos×length for LENGTH, nos×length×
 * breadth for AREA, nos×length×breadth×depth for VOLUME, the direct
 * Quantity field for WEIGHT/LUMPSUM) and recomputes the parent item — so
 * this form doesn't need its own shape-aware branching, just collect
 * whatever the user fills in.
 */
export function NewEstimateMeasurementForm({ estimateId, estimateItemId, shapeHint }: { estimateId: string; estimateItemId: string; shapeHint: string }) {
  const [state, formAction, pending] = useActionState(addEstimateMeasurementRecord, initialState);

  return (
    <Form action={formAction}>
      <input type="hidden" name="estimateId" value={estimateId} />
      <input type="hidden" name="estimateItemId" value={estimateItemId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add measurement" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="m-description" name="description" labelText="Description" placeholder="e.g. Wall W1, ground floor" />
          <TextInput id="m-nos" name="nos" labelText="Nos" type="number" defaultValue="1" helperText={shapeHint === "COUNT" ? "Used directly" : "Multiplier"} />
          <TextInput id="m-length" name="length" labelText="Length (m)" type="number" step="any" helperText={shapeHint === "LENGTH" || shapeHint === "AREA" || shapeHint === "VOLUME" ? "Used" : "Ignored for this unit"} />
          <TextInput id="m-breadth" name="breadth" labelText="Breadth (m)" type="number" step="any" helperText={shapeHint === "AREA" || shapeHint === "VOLUME" ? "Used" : "Ignored for this unit"} />
          <TextInput id="m-depth" name="depth" labelText="Depth (m)" type="number" step="any" helperText={shapeHint === "VOLUME" ? "Used" : "Ignored for this unit"} />
          <TextInput id="m-quantity" name="quantity" labelText="Direct quantity" type="number" step="any" helperText={shapeHint === "WEIGHT" || shapeHint === "LUMPSUM" ? "Used directly" : "Only for weight/lumpsum units"} />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add measurement"}
        </Button>
      </Stack>
    </Form>
  );
}
