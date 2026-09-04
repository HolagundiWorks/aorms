"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createSteelCert } from "../../lib/actions/pmc-steel-certs";

type ProjectOption = { id: string; title: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewSteelCertForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createSteelCert, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not create certificate" subtitle={state.error} hideCloseButton lowContrast />
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
          <TextInput id="issuedKg" name="issuedKg" labelText="Issued (kg)" type="number" />
          <TextInput id="consumedKg" name="consumedKg" labelText="Consumed (kg)" type="number" />
        </div>
        <TextArea id="narrative" name="narrative" labelText="Narrative" rows={2} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create certificate"}
        </Button>
      </Stack>
    </Form>
  );
}
