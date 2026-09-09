"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createSiteInstruction } from "../../lib/actions/site-instructions";
import { FormGrid } from "./FormGrid";

type ProjectOption = { id: string; title: string };
type ContractorOption = { id: string; name: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewSiteInstructionForm({
  projects,
  contractors,
  onSuccess,
}: {
  projects: ProjectOption[];
  contractors: ContractorOption[];
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(createSiteInstruction, initialState);

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
          <InlineNotification kind="error" title="Could not issue instruction" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
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
          <TextInput id="issuedAt" name="issuedAt" labelText="Issued date" type="date" />
        </FormGrid>
        <TextArea id="body" name="body" labelText="Body" rows={3} />
        <Button type="submit" disabled={pending}>
          {pending ? "Issuing…" : "Issue instruction"}
        </Button>
      </Stack>
    </Form>
  );
}
