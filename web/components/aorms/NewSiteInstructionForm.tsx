"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createSiteInstruction } from "../../lib/actions/site-instructions";

type ProjectOption = { id: string; title: string };
type ContractorOption = { id: string; name: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewSiteInstructionForm({
  projects,
  contractors,
}: {
  projects: ProjectOption[];
  contractors: ContractorOption[];
}) {
  const [state, formAction, pending] = useActionState(createSiteInstruction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not issue instruction" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
          <SelectItem value="" text="— Select a project —" />
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} text={p.title} />
          ))}
        </Select>
        <Select id="contractorId" name="contractorId" labelText="Contractor" defaultValue="">
          <SelectItem value="" text="— None —" />
          {contractors.map((c) => (
            <SelectItem key={c.id} value={c.id} text={c.name} />
          ))}
        </Select>
        <TextInput id="subject" name="subject" labelText="Subject" required />
        <TextArea id="body" name="body" labelText="Body" rows={3} />
        <TextInput id="issuedAt" name="issuedAt" labelText="Issued date" type="date" />
        <Button type="submit" disabled={pending}>
          {pending ? "Issuing…" : "Issue instruction"}
        </Button>
      </Stack>
    </Form>
  );
}
