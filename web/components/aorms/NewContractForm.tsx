"use client";

import { useActionState } from "react";
import {
  Button,
  Form,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  TextInput,
} from "@carbon/react";
import { createContractRecord, type ContractActionState } from "../../lib/actions/contracts";
import { FormGrid } from "./FormGrid";

type ProjectOption = { id: string; title: string };

const initialState: ContractActionState = null;

export function NewContractForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createContractRecord, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification
            kind="error"
            title="Could not create contract"
            subtitle={state.error}
            hideCloseButton
            lowContrast
          />
        )}
        <FormGrid>
          <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
            <SelectItem value="" text="— Firm-level (no project) —" />
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} text={p.title} />
            ))}
          </Select>
          <TextInput id="title" name="title" labelText="Title" required />
          <TextInput id="party" name="party" labelText="Party" required />
          <Select id="contractType" name="contractType" labelText="Type" defaultValue="CLIENT">
            <SelectItem value="CLIENT" text="Client" />
            <SelectItem value="CONSULTANT" text="Consultant" />
            <SelectItem value="VENDOR" text="Vendor" />
          </Select>
          <TextInput id="valuePaise" name="valuePaise" labelText="Value (₹)" type="number" step="any" defaultValue="0" />
          <TextInput id="startDate" name="startDate" labelText="Start date" type="date" />
          <TextInput id="endDate" name="endDate" labelText="End date" type="date" />
        </FormGrid>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create contract"}
        </Button>
      </Stack>
    </Form>
  );
}
