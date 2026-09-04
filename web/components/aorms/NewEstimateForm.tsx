"use client";

import { useActionState } from "react";
import {
  Button,
  Form,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  TextArea,
  TextInput,
} from "@carbon/react";
import { createEstimateRecord, type EstimateActionState } from "../../lib/actions/estimates";

type ProjectOption = { id: string; title: string };
type RateBookOption = { id: string; name: string };

const initialState: EstimateActionState = null;

export function NewEstimateForm({
  projects,
  rateBooks,
}: {
  projects: ProjectOption[];
  rateBooks: RateBookOption[];
}) {
  const [state, formAction, pending] = useActionState(createEstimateRecord, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification
            kind="error"
            title="Could not create estimate"
            subtitle={state.error}
            hideCloseButton
            lowContrast
          />
        )}
        <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
          <SelectItem value="" text="— Select a project —" />
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} text={p.title} />
          ))}
        </Select>
        <Select id="rateBookId" name="rateBookId" labelText="Rate book" defaultValue="">
          <SelectItem value="" text="— Select a rate book —" />
          {rateBooks.map((rb) => (
            <SelectItem key={rb.id} value={rb.id} text={rb.name} />
          ))}
        </Select>
        <TextInput id="title" name="title" labelText="Title" required />
        <TextInput
          id="contingencyPct"
          name="contingencyPct"
          labelText="Contingency %"
          type="number"
          defaultValue="0"
        />
        <TextInput id="gstPct" name="gstPct" labelText="GST %" type="number" defaultValue="0" />
        <TextArea id="notes" name="notes" labelText="Notes" rows={2} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create estimate"}
        </Button>
      </Stack>
    </Form>
  );
}
