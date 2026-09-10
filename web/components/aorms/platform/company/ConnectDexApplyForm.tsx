"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { submitConnectDexApplication, type ConnectDexActionState } from "../../../../lib/actions/connectdex";

/**
 * The connect form — first step of the ConnectDeX Partners onboarding
 * pipeline (platform/supabase/migrations/0013_connectdex_onboarding.sql).
 * No account, no session — a prospective partner has neither yet.
 * Submitting lands the application as PENDING in /admin/connectdex for a
 * platform admin to review; nothing here creates a login.
 */
export function ConnectDexApplyForm() {
  const [state, formAction, pending] = useActionState<ConnectDexActionState, FormData>(submitConnectDexApplication, null);

  if (state?.success) {
    return <InlineNotification kind="success" title="Application submitted" subtitle={state.success} lowContrast hideCloseButton />;
  }

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        <TextInput id="company-name" name="companyName" labelText="Company name" placeholder="Acme Building Materials" required />
        <TextInput id="contact-name" name="contactName" labelText="Contact name" required />
        <TextInput id="email" name="email" labelText="Email" type="email" autoComplete="email" required />
        <TextInput id="phone" name="phone" labelText="Phone (optional)" />
        <Stack gap={5} orientation="horizontal">
          <TextInput id="city" name="city" labelText="City" />
          <TextInput id="state" name="state" labelText="State" />
        </Stack>
        <Select id="category" name="category" labelText="Category" defaultValue="">
          <SelectItem value="" text="Choose one" disabled />
          <SelectItem value="BUILDING_MATERIAL" text="Building material" />
          <SelectItem value="INTERIOR_MATERIAL" text="Interior material" />
          <SelectItem value="FINISH" text="Finish" />
          <SelectItem value="OTHER" text="Other" />
        </Select>
        <TextArea id="message" name="message" labelText="Anything else we should know? (optional)" rows={3} />
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't submit" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" renderIcon={ArrowRight} disabled={pending}>
          {pending ? "Submitting…" : "Submit application"}
        </Button>
      </Stack>
    </Form>
  );
}
