"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextArea } from "@carbon/react";
import { submitSupportTicket, type SupportActionState } from "../../../lib/actions/support";

/**
 * "Talk to AORMS" — Enterprise's contact flow (2026-09-14 pricing
 * restructure). Enterprise moved off self-serve Razorpay checkout
 * entirely (custom/"starting at" pricing, no flat self-checkout amount —
 * see lib/actions/platform-payments.ts's header comment), so this reuses
 * the existing HelpDeX support-ticket pipeline (submitSupportTicket,
 * already built and already routes to platform-admin triage) rather than
 * inventing new contact infra — category/subject are fixed, name/email
 * come from the signed-in studio owner's own account (no separate
 * sign-in needed, this only renders on /licences which already requires
 * one), and the only field the owner actually fills in is the message.
 */
export function EnterpriseEnquiryForm({
  studioId,
  studioName,
  defaultName,
  defaultEmail,
}: {
  studioId: string;
  studioName: string;
  defaultName: string;
  defaultEmail: string;
}) {
  const [state, formAction, pending] = useActionState<SupportActionState, FormData>(submitSupportTicket, null);

  if (state?.success) {
    return <InlineNotification kind="success" title="Sent" subtitle={state.success} lowContrast hideCloseButton />;
  }

  return (
    <Form action={formAction}>
      <input type="hidden" name="name" value={defaultName} />
      <input type="hidden" name="email" value={defaultEmail} />
      <input type="hidden" name="category" value="BILLING" />
      <input type="hidden" name="subject" value={`Enterprise plan enquiry — ${studioName} (${studioId})`} />
      <Stack gap={4}>
        <TextArea
          id="enterprise-enquiry-message"
          name="message"
          labelText="What should we know about your practice?"
          placeholder="Team size, offices, what you're looking for from Enterprise…"
          rows={3}
          required
        />
        {state?.error ? <InlineNotification kind="error" title="Couldn't send" subtitle={state.error} lowContrast hideCloseButton /> : null}
        <Button type="submit" kind="tertiary" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Talk to AORMS →"}
        </Button>
      </Stack>
    </Form>
  );
}
