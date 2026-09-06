"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { addProgramSpace } from "../../lib/actions/program";
import { FormGrid } from "./FormGrid";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

const CATEGORIES = [
  "LIVING", "DINING", "KITCHEN", "BEDROOM", "BATHROOM", "STUDY", "POOJA", "UTILITY",
  "STORE", "CIRCULATION", "BALCONY", "PARKING", "SERVICE", "COMMERCIAL", "OTHER",
];

export function NewProgramSpaceForm({ programId, projectId }: { programId: string; projectId: string }) {
  const boundAction = addProgramSpace.bind(null, programId, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add space" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="name" name="name" labelText="Name" required />
          <Select id="category" name="category" labelText="Category" defaultValue="LIVING">
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} text={c} />
            ))}
          </Select>
          <TextInput id="floorLevel" name="floorLevel" labelText="Floor level" type="number" step="any" defaultValue={0} />
          <TextInput id="unitAreaSqm" name="unitAreaSqm" labelText="Unit area (sqm)" type="number" step="any" required />
          <TextInput id="count" name="count" labelText="Count" type="number" step="any" defaultValue={1} />
          <TextInput id="notes" name="notes" labelText="Notes" />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add space"}
        </Button>
      </Stack>
    </Form>
  );
}
