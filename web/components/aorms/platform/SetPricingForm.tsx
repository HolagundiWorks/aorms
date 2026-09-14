"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { adminSetPricing, type PaymentActionState } from "../../../lib/actions/platform-payments";

const PLAN_LABEL: Record<string, string> = {
  AORMS_IDENTITY: "AORMS Identity",
  FREE: "Free",
  STUDIO: "Studio",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

/**
 * One plan's price, in rupees for the input (friendlier than asking an
 * admin to type paise) — adminSetPricing converts to paise server-side.
 * Uncontrolled input with a `key` from the caller (see admin/pricing/
 * page.tsx), same reason UpdateLicenceForm needs one: without it, saving
 * once wouldn't refresh the displayed value from the next server read.
 *
 * 2026-09-14 real pricing restructure: plan set widened from
 * AORMS_IDENTITY/PRO/ENTERPRISE to AORMS_IDENTITY/FREE/STUDIO/
 * PROFESSIONAL/ENTERPRISE. FREE's input is disabled — it's permanently
 * ₹0, not admin-editable (adminSetPricing rejects a non-zero FREE price
 * server-side too, this is just the UI reflecting that). ENTERPRISE is
 * labeled "starting at" — it's a reference figure for the landing page/
 * sales conversations, not a self-serve checkout amount (Enterprise
 * moved to a "Talk to AORMS" contact flow, see UpgradeLicenceButton.tsx).
 */
export function SetPricingForm({
  plan,
  basePricePaise,
}: {
  plan: "AORMS_IDENTITY" | "FREE" | "STUDIO" | "PROFESSIONAL" | "ENTERPRISE";
  basePricePaise: number;
}) {
  const [state, formAction, pending] = useActionState<PaymentActionState, FormData>(adminSetPricing, null);
  const planLabel = PLAN_LABEL[plan] ?? plan;
  const priceLabel =
    plan === "AORMS_IDENTITY"
      ? `${planLabel} — one-time fee (₹)`
      : plan === "ENTERPRISE"
        ? `${planLabel} — starting at, per year (₹)`
        : plan === "FREE"
          ? `${planLabel} — fixed at ₹0`
          : `${planLabel} — price per year (₹)`;

  return (
    <Form action={formAction}>
      <input type="hidden" name="plan" value={plan} />
      <Stack gap={4}>
        <TextInput
          id={`pricing-base-${plan}`}
          name="basePriceRupees"
          labelText={priceLabel}
          type="number"
          min={0}
          step="0.01"
          disabled={plan === "FREE"}
          defaultValue={String(basePricePaise / 100)}
        />
        {state?.error ? <InlineNotification kind="error" title="Couldn't save" subtitle={state.error} lowContrast hideCloseButton /> : null}
        <Button type="submit" kind="tertiary" size="sm" disabled={pending || plan === "FREE"}>
          {pending ? "Saving…" : "Save price"}
        </Button>
      </Stack>
    </Form>
  );
}
