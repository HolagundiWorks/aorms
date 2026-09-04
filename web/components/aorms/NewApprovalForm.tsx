"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createApproval, type ApprovalActionState } from "../../lib/actions/approvals";

type ProjectOption = { id: string; title: string };

const initialState: ApprovalActionState = null;

const ENTITY_TYPES: Record<string, string> = {
  DRAWING: "Drawing set",
  FEE_PROPOSAL: "Fee proposal",
  PERMIT: "Statutory submission",
  OTHER: "Other",
};

const CHANNELS: Record<string, string> = {
  EMAIL: "Email",
  PRINT: "Printed set",
  PORTAL: "Client portal",
  WHATSAPP: "WhatsApp",
  IN_PERSON: "In person",
};

export function NewApprovalForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createApproval, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not create approval" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
          <SelectItem value="" text="— Select a project —" />
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} text={p.title} />
          ))}
        </Select>
        <Select id="entityType" name="entityType" labelText="What's being issued" defaultValue="DRAWING">
          {Object.entries(ENTITY_TYPES).map(([code, label]) => (
            <SelectItem key={code} value={code} text={label} />
          ))}
        </Select>
        <TextInput id="title" name="title" labelText="Title" required />
        <TextInput id="recipient" name="recipient" labelText="Recipient" />
        <Select id="channel" name="channel" labelText="Channel" defaultValue="EMAIL">
          {Object.entries(CHANNELS).map(([code, label]) => (
            <SelectItem key={code} value={code} text={label} />
          ))}
        </Select>
        <TextInput id="sentDate" name="sentDate" labelText="Sent date" type="date" />
        <TextInput id="remarks" name="remarks" labelText="Remarks" />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Log approval"}
        </Button>
      </Stack>
    </Form>
  );
}
