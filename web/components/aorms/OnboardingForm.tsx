"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { saveOnboarding } from "../../lib/actions/onboarding";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export type OnboardingValues = {
  billing_address: string | null;
  gstin: string | null;
  pan: string | null;
  communication_preference: string | null;
  authorized_reps: { name: string; designation?: string | null; phone?: string | null }[];
} | null;

export function OnboardingForm({ projectId, values }: { projectId: string; values: OnboardingValues }) {
  const boundAction = saveOnboarding.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not save onboarding" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <TextArea id="billingAddress" name="billingAddress" labelText="Billing address" rows={2} defaultValue={values?.billing_address ?? ""} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))", gap: "1rem" }}>
          <TextInput id="gstin" name="gstin" labelText="GSTIN" defaultValue={values?.gstin ?? ""} />
          <TextInput id="pan" name="pan" labelText="PAN" defaultValue={values?.pan ?? ""} />
          <Select id="communicationPreference" name="communicationPreference" labelText="Communication preference" defaultValue={values?.communication_preference ?? ""}>
            <SelectItem value="" text="— Select —" />
            <SelectItem value="EMAIL" text="Email" />
            <SelectItem value="WHATSAPP" text="WhatsApp" />
            <SelectItem value="PHONE" text="Phone" />
            <SelectItem value="PORTAL" text="Client portal" />
          </Select>
        </div>

        <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
          Add an authorized representative (appends to the list)
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))", gap: "1rem" }}>
          <TextInput id="repName" name="repName" labelText="Name" />
          <TextInput id="repDesignation" name="repDesignation" labelText="Designation" />
          <TextInput id="repPhone" name="repPhone" labelText="Phone" />
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save onboarding"}
        </Button>
      </Stack>
    </Form>
  );
}
