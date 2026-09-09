"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createProgressReport } from "../../lib/actions/progress-reports";
import { FormGrid } from "./FormGrid";

type ProjectOption = { id: string; title: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewProgressReportForm({ projects, onSuccess }: { projects: ProjectOption[]; onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(createProgressReport, initialState);

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
          <InlineNotification kind="error" title="Could not create report" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
            <SelectItem value="" text="— Select a project —" />
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} text={p.title} />
            ))}
          </Select>
          <TextInput id="periodStart" name="periodStart" labelText="Period start" type="date" required />
          <TextInput id="periodEnd" name="periodEnd" labelText="Period end" type="date" required />
          <TextInput id="physicalProgressPct" name="physicalProgressPct" labelText="Physical progress %" type="number" step="any" />
          <TextInput id="scheduleProgressPct" name="scheduleProgressPct" labelText="Schedule progress %" type="number" step="any" />
        </FormGrid>
        <TextArea id="narrative" name="narrative" labelText="Narrative" rows={3} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create report"}
        </Button>
      </Stack>
    </Form>
  );
}
