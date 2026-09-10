"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { submitConnectDexOnboardingForm, type ConnectDexActionState } from "../../../../lib/actions/connectdex";
import { FormGrid } from "../../FormGrid";

/**
 * The onboarding form — second step of the ConnectDeX Partners pipeline,
 * filled in by the newly-invited owner once signed in
 * (platform/supabase/migrations/0013_connectdex_onboarding.sql). Shown on
 * /companies/[companyId] in place of the normal profile view while
 * status is PENDING_ONBOARDING.
 */
export function ConnectDexOnboardingForm({ companyId }: { companyId: string }) {
  const [state, formAction, pending] = useActionState<ConnectDexActionState, FormData>(submitConnectDexOnboardingForm, null);

  return (
    <Form action={formAction}>
      <input type="hidden" name="companyId" value={companyId} />
      <Stack gap={5}>
        <FormGrid>
          <TextInput id="onboarding-gstin" name="gstin" labelText="GSTIN (optional)" />
          <TextInput id="onboarding-pan" name="pan" labelText="PAN (optional)" />
          <TextInput id="onboarding-address1" name="addressLine1" labelText="Address line 1" required />
          <TextInput id="onboarding-address2" name="addressLine2" labelText="Address line 2 (optional)" />
          <TextInput id="onboarding-city" name="city" labelText="City" required />
          <TextInput id="onboarding-district" name="district" labelText="District (optional)" />
          <TextInput id="onboarding-state" name="state" labelText="State" required />
          <TextInput id="onboarding-pincode" name="pincode" labelText="PIN code (optional)" />
          <TextInput id="onboarding-email" name="email" labelText="Business email (optional)" type="email" />
          <TextInput id="onboarding-phone" name="phone" labelText="Business phone (optional)" />
        </FormGrid>
        {state?.error ? <InlineNotification kind="error" title="Couldn't save" subtitle={state.error} lowContrast hideCloseButton /> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit for verification"}
        </Button>
      </Stack>
    </Form>
  );
}
