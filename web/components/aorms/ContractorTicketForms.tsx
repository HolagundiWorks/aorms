"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea } from "@carbon/react";
import { postStudioMessage, respondToContractorSubmission, type TicketActionState } from "../../lib/actions/contractor-tickets";

function Notice({ state }: { state: TicketActionState }) {
  if (!state) return null;
  return "error" in state ? (
    <InlineNotification kind="error" title="Couldn't save" subtitle={state.error} hideCloseButton lowContrast />
  ) : (
    <InlineNotification kind="success" title={state.ok} hideCloseButton lowContrast />
  );
}

export function TicketRespondForm({ id, status, note }: { id: string; status: string; note: string | null }) {
  const [state, action, pending] = useActionState(respondToContractorSubmission, null);
  return (
    <Form action={action}>
      <input type="hidden" name="id" value={id} />
      <Stack gap={3}>
        <Notice state={state} />
        <Select id={`st-${id}`} name="status" labelText="Status" defaultValue={status} size="sm">
          <SelectItem value="OPEN" text="Open" />
          <SelectItem value="RESPONDED" text="Responded" />
          <SelectItem value="RESOLVED" text="Resolved" />
        </Select>
        <TextArea id={`note-${id}`} name="note" labelText="Reply to the contractor" rows={2} defaultValue={note ?? ""} maxLength={2000} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save reply"}
        </Button>
      </Stack>
    </Form>
  );
}

export function StudioMessageForm({ submissionId }: { submissionId: string }) {
  const [state, action, pending] = useActionState(postStudioMessage, null);
  return (
    <Form action={action}>
      <input type="hidden" name="submissionId" value={submissionId} />
      <Stack gap={3}>
        <Notice state={state} />
        <TextArea id={`sm-${submissionId}`} name="body" labelText="Add to the thread" rows={2} maxLength={2000} required />
        <Button type="submit" kind="tertiary" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Post"}
        </Button>
      </Stack>
    </Form>
  );
}
