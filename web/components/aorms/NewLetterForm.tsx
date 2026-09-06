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
import { createLetterRecord, type LetterActionState } from "../../lib/actions/letters";
import { FormGrid } from "./FormGrid";

type ProjectOption = { id: string; title: string };

const initialState: LetterActionState = null;

export function NewLetterForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createLetterRecord, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification
            kind="error"
            title="Could not create letter"
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
          <TextInput id="recipient" name="recipient" labelText="Recipient" required />
          <TextInput id="subject" name="subject" labelText="Subject" required />
          <TextInput id="dateLetter" name="dateLetter" labelText="Letter date" type="date" />
        </FormGrid>
        <TextArea id="body" name="body" labelText="Body" rows={4} required />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create letter"}
        </Button>
      </Stack>
    </Form>
  );
}
