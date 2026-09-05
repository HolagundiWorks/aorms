"use client";

import { useActionState } from "react";
import { Button, Checkbox, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { convertLead, type ConvertActionState } from "../../lib/actions/leads";

type ClientOption = { id: string; name: string };
const initialState: ConvertActionState = null;

/**
 * COA Regulations 1989 conflict-of-interest check (SOP-01/02/26) must be
 * confirmed before a lead becomes a draft project — this checkbox is a UI
 * convenience, but convertLead() re-checks it server-side regardless, so
 * unchecking it and submitting anyway is still rejected.
 */
export function ConvertLeadForm({ leadId, clients }: { leadId: string; clients: ClientOption[] }) {
  const [state, formAction, pending] = useActionState(convertLead, initialState);

  return (
    <Form action={formAction}>
      <input type="hidden" name="leadId" value={leadId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not convert lead" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <Select id="clientId" name="clientId" labelText="Existing client (optional)" defaultValue="">
          <SelectItem value="" text="— Create a new client from this lead —" />
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id} text={c.name} />
          ))}
        </Select>
        <TextInput id="projectTitle" name="projectTitle" labelText="Project title" required />
        <TextInput id="projectType" name="projectType" labelText="Project type" placeholder="e.g. Residential Architecture" required />
        <Select id="workType" name="workType" labelText="Work type" defaultValue="ARCHITECTURE">
          <SelectItem value="ARCHITECTURE" text="Architecture" />
          <SelectItem value="INTERIOR" text="Interior" />
          <SelectItem value="LANDSCAPE" text="Landscape" />
          <SelectItem value="MISC" text="Misc" />
        </Select>
        <Checkbox
          id="conflictCheckDone"
          name="conflictCheckDone"
          labelText="I confirm the COA conflict-of-interest check has been completed (SOP-01/02/26) — no other architect is already engaged on this commission without a written release."
        />
        <TextArea id="conflictCheckNotes" name="conflictCheckNotes" labelText="Conflict check notes" rows={2} />
        <Button type="submit" disabled={pending}>
          {pending ? "Converting…" : "Convert to project"}
        </Button>
      </Stack>
    </Form>
  );
}
