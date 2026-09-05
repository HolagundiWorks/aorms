"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createLead } from "../../lib/actions/leads";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

const LEAD_SOURCES: Record<string, string> = {
  WALK_IN: "Walk-in",
  WEBSITE: "Website",
  WHATSAPP: "WhatsApp",
  REFERRAL: "Referral",
  COLD_OUTREACH: "Cold outreach",
  EXISTING_CLIENT: "Existing client",
  SOCIAL_MEDIA: "Social media",
};

export function NewLeadForm() {
  const [state, formAction, pending] = useActionState(createLead, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add lead" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))", gap: "1rem" }}>
          <TextInput id="clientName" name="clientName" labelText="Client name" required />
          <Select id="leadSource" name="leadSource" labelText="Lead source" defaultValue="WEBSITE">
            {Object.entries(LEAD_SOURCES).map(([code, label]) => (
              <SelectItem key={code} value={code} text={label} />
            ))}
          </Select>
          <TextInput id="phone" name="phone" labelText="Phone" />
          <TextInput id="email" name="email" labelText="Email" type="email" />
          <TextInput id="projectType" name="projectType" labelText="Project type" placeholder="e.g. Residential" />
          <TextInput id="siteLocation" name="siteLocation" labelText="Site location" />
          <TextInput id="city" name="city" labelText="City" />
        </div>
        <TextInput id="notes" name="notes" labelText="Notes" />
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add lead"}
        </Button>
      </Stack>
    </Form>
  );
}
