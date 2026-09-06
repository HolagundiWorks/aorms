"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createEngagement, type EngagementActionState } from "../../lib/actions/consultants";
import { FormGrid } from "./FormGrid";

type ProjectOption = { id: string; title: string };

const initialState: EngagementActionState = null;

export function NewEngagementForm({ consultantId, projects }: { consultantId: string; projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createEngagement, initialState);

  return (
    <Form action={formAction}>
      <input type="hidden" name="consultantId" value={consultantId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add engagement" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
            <SelectItem value="" text="— Select a project —" />
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} text={p.title} />
            ))}
          </Select>
          <TextInput id="agreedFeePaise" name="agreedFeePaise" labelText="Agreed fee (₹)" type="number" step="any" defaultValue="0" />
          <Select id="status" name="status" labelText="Status" defaultValue="ENGAGED">
            <SelectItem value="ENGAGED" text="Engaged" />
            <SelectItem value="COMPLETED" text="Completed" />
            <SelectItem value="TERMINATED" text="Terminated" />
          </Select>
        </FormGrid>
        <TextArea id="scope" name="scope" labelText="Scope" rows={2} />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add engagement"}
        </Button>
      </Stack>
    </Form>
  );
}
