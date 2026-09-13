"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { adminSetPricing, type PaymentActionState } from "../../../lib/actions/platform-payments";

/**
 * One plan's price, in rupees for the input (friendlier than asking an
 * admin to type paise) — adminSetPricing converts to paise server-side.
 * Uncontrolled input with a `key` from the caller (see admin/pricing/
 * page.tsx), same reason UpdateLicenceForm needs one: without it, saving
 * once wouldn't refresh the displayed value from the next server read.
 *
 * 2026-09-14: dropped the per-seat-monthly field entirely — Pro/
 * Enterprise's ₹199/user/month component (added 2026-09-13, migration
 * 0017) was fully retired the same day (migration 0019, confirmed with
 * the user: both Studio plans are flat annual fees, no per-seat billing
 * at all). `adminSetPricing` still accepts and stores
 * `pricePerSeatMonthlyRupees` (defaulting to 0 when absent, exactly what
 * this form no longer sends) rather than being narrowed itself, so a
 * future per-seat plan wouldn't need to re-litigate that action's shape.
 */
export function SetPricingForm({
  plan,
  basePricePaise,
}: {
  plan: "AORMS_IDENTITY" | "PRO" | "ENTERPRISE";
  basePricePaise: number;
}) {
  const [state, formAction, pending] = useActionState<PaymentActionState, FormData>(adminSetPricing, null);
  const planLabel = plan === "PRO" ? "Studio Pro" : plan === "ENTERPRISE" ? "Studio Enterprise" : "AORMS Identity";

  return (
    <Form action={formAction}>
      <input type="hidden" name="plan" value={plan} />
      <Stack gap={4}>
        <TextInput
          id={`pricing-base-${plan}`}
          name="basePriceRupees"
          labelText={plan === "AORMS_IDENTITY" ? `${planLabel} — one-time fee (₹)` : `${planLabel} — price per year (₹)`}
          type="number"
          min={1}
          step="0.01"
          defaultValue={String(basePricePaise / 100)}
        />
        {state?.error ? <InlineNotification kind="error" title="Couldn't save" subtitle={state.error} lowContrast hideCloseButton /> : null}
        <Button type="submit" kind="tertiary" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save price"}
        </Button>
      </Stack>
    </Form>
  );
}
