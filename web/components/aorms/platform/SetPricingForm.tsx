"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { adminSetPricing, type PaymentActionState } from "../../../lib/actions/platform-payments";

/**
 * One row's price, in rupees for the input (friendlier than asking an
 * admin to type paise) — adminSetPricing converts to paise server-side.
 * Uncontrolled input with a `key` from the caller (see admin/pricing/
 * page.tsx), same reason UpdateLicenceForm needs one: without it, saving
 * once wouldn't refresh the displayed value from the next server read.
 */
export function SetPricingForm({ plan, pricePerSeatPaise }: { plan: "STANDARD" | "PREMIUM"; pricePerSeatPaise: number }) {
  const [state, formAction, pending] = useActionState<PaymentActionState, FormData>(adminSetPricing, null);

  return (
    <Form action={formAction}>
      <input type="hidden" name="plan" value={plan} />
      <Stack gap={4}>
        <TextInput
          id={`pricing-${plan}`}
          name="pricePerSeatRupees"
          labelText={`${plan} — price per seat per 30 days (₹)`}
          type="number"
          min={1}
          step="0.01"
          defaultValue={String(pricePerSeatPaise / 100)}
        />
        {state?.error ? <InlineNotification kind="error" title="Couldn't save" subtitle={state.error} lowContrast hideCloseButton /> : null}
        <Button type="submit" kind="tertiary" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save price"}
        </Button>
      </Stack>
    </Form>
  );
}
