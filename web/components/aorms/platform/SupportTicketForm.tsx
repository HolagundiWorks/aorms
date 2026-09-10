"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { submitSupportTicket, type SupportActionState } from "../../../lib/actions/support";

/**
 * Contact HelpDeX — the public support-ticket submit form (2026-09-10).
 * No auth required, same "no account yet" posture as ConnectDexApplyForm:
 * a Studio or Company person (or a prospect with neither) may need help
 * before they have — or while they can't reach — an active session.
 */
export function SupportTicketForm() {
  const [state, formAction, pending] = useActionState<SupportActionState, FormData>(submitSupportTicket, null);

  if (state?.success) {
    return <InlineNotification kind="success" title="Request submitted" subtitle={state.success} lowContrast hideCloseButton />;
  }

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        <TextInput id="name" name="name" labelText="Your name" required />
        <TextInput id="email" name="email" labelText="Email" type="email" autoComplete="email" required />
        <Select id="category" name="category" labelText="Category" defaultValue="">
          <SelectItem value="" text="Choose one" disabled />
          <SelectItem value="ACCOUNT" text="Account" />
          <SelectItem value="BILLING" text="Billing" />
          <SelectItem value="TECHNICAL" text="Technical" />
          <SelectItem value="OTHER" text="Other" />
        </Select>
        <TextInput id="subject" name="subject" labelText="Subject" required />
        <TextArea id="message" name="message" labelText="Message" rows={4} required />
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't submit" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" renderIcon={ArrowRight} disabled={pending}>
          {pending ? "Submitting…" : "Submit request"}
        </Button>
      </Stack>
    </Form>
  );
}
