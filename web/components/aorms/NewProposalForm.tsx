"use client";

import { useActionState, useEffect, useRef } from "react";
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
import { createProposalRecord, type ProposalActionState } from "../../lib/actions/proposals";
import { FormGrid } from "./FormGrid";

type ProjectOption = { id: string; title: string };

const initialState: ProposalActionState = null;

export function NewProposalForm({ projects, onSuccess }: { projects: ProjectOption[]; onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(createProposalRecord, initialState);

  const prevPending = useRef(pending);
  useEffect(() => {
    if (prevPending.current && !pending && !state?.error) {
      onSuccess?.();
    }
    prevPending.current = pending;
  }, [pending, state, onSuccess]);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification
            kind="error"
            title="Could not create proposal"
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
          <TextInput
            id="workCategory"
            name="workCategory"
            labelText="Work category"
            placeholder="e.g. New construction"
            required
          />
          <Select id="workType" name="workType" labelText="Work type" defaultValue="ARCHITECTURE">
            <SelectItem value="ARCHITECTURE" text="Architecture" />
            <SelectItem value="INTERIOR" text="Interior" />
            <SelectItem value="LANDSCAPE" text="Landscape" />
            <SelectItem value="MISC" text="Misc" />
          </Select>
          <Select id="feeBasis" name="feeBasis" labelText="Fee basis" defaultValue="COA_PERCENT">
            <SelectItem value="COA_PERCENT" text="COA %" />
            <SelectItem value="PER_SQM" text="Per sq.m" />
            <SelectItem value="LUMPSUM" text="Lump sum" />
          </Select>
          <TextInput
            id="costOfWorksPaise"
            name="costOfWorksPaise"
            labelText="Cost of works (₹)"
            type="number" step="any"
            defaultValue="0"
          />
          <TextInput id="feePaise" name="feePaise" labelText="Fee (₹)" type="number" step="any" defaultValue="0" />
        </FormGrid>
        <TextArea id="scope" name="scope" labelText="Scope" rows={3} />
        <TextArea id="notes" name="notes" labelText="Notes" rows={2} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create proposal"}
        </Button>
      </Stack>
    </Form>
  );
}
