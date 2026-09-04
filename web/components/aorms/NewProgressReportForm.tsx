"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createProgressReport } from "../../lib/actions/progress-reports";

type ProjectOption = { id: string; title: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewProgressReportForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createProgressReport, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not create report" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
          <SelectItem value="" text="— Select a project —" />
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} text={p.title} />
          ))}
        </Select>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))", gap: "1rem" }}>
          <TextInput id="periodStart" name="periodStart" labelText="Period start" type="date" required />
          <TextInput id="periodEnd" name="periodEnd" labelText="Period end" type="date" required />
          <TextInput id="physicalProgressPct" name="physicalProgressPct" labelText="Physical progress %" type="number" />
          <TextInput id="scheduleProgressPct" name="scheduleProgressPct" labelText="Schedule progress %" type="number" />
        </div>
        <TextArea id="narrative" name="narrative" labelText="Narrative" rows={3} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create report"}
        </Button>
      </Stack>
    </Form>
  );
}
