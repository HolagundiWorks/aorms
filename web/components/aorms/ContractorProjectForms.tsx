"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import {
  postContractorMessage,
  raiseContractorSubmission,
  submitRaBill,
  type ContractorProjectActionState,
} from "../../lib/actions/contractor-project";
import { FormGrid } from "./FormGrid";

function Notice({ state }: { state: ContractorProjectActionState }) {
  if (!state) return null;
  return "error" in state ? (
    <InlineNotification kind="error" title="Could not send" subtitle={state.error} hideCloseButton lowContrast />
  ) : (
    <InlineNotification kind="success" title={state.ok} hideCloseButton lowContrast />
  );
}

/** Raise a ticket, request a meeting, ask an RFI, post a progress update or send a note — one form, one inbox at the studio. */
export function ContractorRaiseForm({ projectId, defaultKind = "TICKET" }: { projectId: string; defaultKind?: string }) {
  const [state, action, pending] = useActionState(raiseContractorSubmission, null);
  return (
    <Form action={action}>
      <input type="hidden" name="projectId" value={projectId} />
      <Stack gap={4}>
        <Notice state={state} />
        <FormGrid>
          <Select id={`kind-${defaultKind}`} name="kind" labelText="What are you sending?" defaultValue={defaultKind}>
            <SelectItem value="TICKET" text="Raise a ticket (site issue or clash)" />
            <SelectItem value="MEETING_REQUEST" text="Request a meeting" />
            <SelectItem value="RFI" text="Request for information (RFI)" />
            <SelectItem value="PROGRESS_UPDATE" text="Progress update" />
            <SelectItem value="NOTE" text="Other communication" />
          </Select>
          <TextInput id={`subject-${defaultKind}`} name="subject" labelText="Subject" required maxLength={200} />
        </FormGrid>
        <TextInput id={`pref-${defaultKind}`} name="preferredDate" labelText="Preferred meeting date (meeting requests)" type="date" />
        <TextArea id={`body-${defaultKind}`} name="body" labelText="Details" rows={3} maxLength={4000} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send to the studio"}
        </Button>
      </Stack>
    </Form>
  );
}

export function ContractorMessageForm({ submissionId, projectId }: { submissionId: string; projectId: string }) {
  const [state, action, pending] = useActionState(postContractorMessage, null);
  return (
    <Form action={action}>
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="projectId" value={projectId} />
      <Stack gap={3}>
        <Notice state={state} />
        <TextArea id={`msg-${submissionId}`} name="body" labelText="Reply" rows={2} maxLength={2000} required />
        <Button type="submit" kind="tertiary" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Reply"}
        </Button>
      </Stack>
    </Form>
  );
}

/** Submit a running (RA) bill against an awarded package; the studio site-checks and certifies it. */
export function ContractorRaBillForm({ projectId, packageId, nextBillNo }: { projectId: string; packageId: string; nextBillNo: string }) {
  const [state, action, pending] = useActionState(submitRaBill, null);
  return (
    <Form action={action}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="packageId" value={packageId} />
      <Stack gap={4}>
        <Notice state={state} />
        <FormGrid>
          <TextInput id="ra-billno" name="billNo" labelText="Bill number" defaultValue={nextBillNo} required />
          <TextInput id="ra-gross" name="gross" labelText="Gross amount claimed (₹)" inputMode="decimal" required />
          <TextInput id="ra-start" name="periodStart" labelText="Period from" type="date" required />
          <TextInput id="ra-end" name="periodEnd" labelText="Period to" type="date" required />
        </FormGrid>
        <TextArea id="ra-narrative" name="narrative" labelText="Work covered" rows={3} maxLength={2000} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Submitting…" : "Submit running bill"}
        </Button>
      </Stack>
    </Form>
  );
}
