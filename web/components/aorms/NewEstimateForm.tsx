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
import { FormGrid } from "./FormGrid";

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
        <FormGrid>
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
            type="number" step="any"
            defaultValue="0"
          />
          <TextInput id="gstPct" name="gstPct" labelText="GST %" type="number" step="any" defaultValue="0" />
        </FormGrid>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
          Markup cascade (applied on the rate-book subtotal, before contingency/GST) — defaults match a typical DSR abstract.
        </p>
        <FormGrid>
          <TextInput id="electricalPct" name="electricalPct" labelText="Electrical %" type="number" step="any" defaultValue="8" />
          <TextInput id="plumbingPct" name="plumbingPct" labelText="Plumbing %" type="number" step="any" defaultValue="6" />
          <TextInput id="escalationPct" name="escalationPct" labelText="Escalation %" type="number" step="any" defaultValue="5" />
          <TextInput id="consultingFeePct" name="consultingFeePct" labelText="Consulting fee %" type="number" step="any" defaultValue="3" />
        </FormGrid>
        <TextArea id="notes" name="notes" labelText="Notes" rows={2} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create estimate"}
        </Button>
      </Stack>
    </Form>
  );
}
