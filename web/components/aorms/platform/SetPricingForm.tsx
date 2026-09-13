"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { adminSetPricing, type PaymentActionState } from "../../../lib/actions/platform-payments";

/**
 * One plan's price, in rupees for the inputs (friendlier than asking an
 * admin to type paise) — adminSetPricing converts to paise server-side.
 * Uncontrolled inputs with a `key` from the caller (see admin/pricing/
 * page.tsx), same reason UpdateLicenceForm needs one: without it, saving
 * once wouldn't refresh the displayed value from the next server read.
 *
 * 2026-09-13: two figures per plan now, not one — `basePriceRupees` (the
 * flat annual fee both AORMS_IDENTITY and AORMS_FIRM have) and
 * `pricePerSeatMonthlyRupees` (AORMS_FIRM's ₹199/user/month rate; hidden
 * for AORMS_IDENTITY, which has no seat concept at all — the field simply
 * isn't rendered, so the action's own "default to 0 if absent" handles it,
 * see platform-payments.ts's adminSetPricing).
 */
export function SetPricingForm({
  plan,
  basePricePaise,
  pricePerSeatMonthlyPaise,
}: {
  plan: "AORMS_IDENTITY" | "AORMS_FIRM";
  basePricePaise: number;
  pricePerSeatMonthlyPaise: number;
}) {
  const [state, formAction, pending] = useActionState<PaymentActionState, FormData>(adminSetPricing, null);
  const planLabel = plan === "AORMS_FIRM" ? "AORMS Firm" : "AORMS Identity";

  return (
    <Form action={formAction}>
      <input type="hidden" name="plan" value={plan} />
      <Stack gap={4}>
        <TextInput
          id={`pricing-base-${plan}`}
          name="basePriceRupees"
          labelText={`${planLabel} — base price per year (₹)`}
          type="number"
          min={1}
          step="0.01"
          defaultValue={String(basePricePaise / 100)}
        />
        {plan === "AORMS_FIRM" && (
          <TextInput
            id={`pricing-seat-${plan}`}
            name="pricePerSeatMonthlyRupees"
            labelText="Price per seat per month (₹)"
            type="number"
            min={0}
            step="0.01"
            defaultValue={String(pricePerSeatMonthlyPaise / 100)}
          />
        )}
        {state?.error ? <InlineNotification kind="error" title="Couldn't save" subtitle={state.error} lowContrast hideCloseButton /> : null}
        <Button type="submit" kind="tertiary" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save price"}
        </Button>
      </Stack>
    </Form>
  );
}
