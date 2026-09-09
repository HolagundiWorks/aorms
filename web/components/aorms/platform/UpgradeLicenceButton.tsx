"use client";

import { useState } from "react";
import Script from "next/script";
import { Button, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createLicenceOrder, confirmPaymentClientSide } from "../../../lib/actions/platform-payments";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/**
 * Studio-owner-facing licence purchase — replaces the old self-serve
 * direct-edit form (UpdateLicenceForm is admin-only now, see
 * app/(platform)/admin/licences/page.tsx). Loads Razorpay's Checkout.js
 * once (next/script, afterInteractive — cheap, and this component only
 * renders on the licences page, not app-wide) and opens the payment sheet
 * on click.
 *
 * The `handler` callback below fires only after Razorpay itself confirms
 * the payment succeeded client-side — confirmPaymentClientSide is the
 * fast-path UX update (verifies the signature again server-side, never
 * trusts the browser alone); app/api/razorpay/webhook/route.ts is the
 * durable source of truth and will apply the same update independently if
 * this callback never fires (tab closed mid-flow, etc.).
 */
export function UpgradeLicenceButton({ studioId, studioName }: { studioId: string; studioName: string }) {
  const [plan, setPlan] = useState<"STANDARD" | "PREMIUM">("STANDARD");
  const [seats, setSeats] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "creating" | "paying" | "activated">("idle");

  async function handleUpgrade() {
    setError(null);
    setStatus("creating");
    const result = await createLicenceOrder(studioId, plan, seats);
    if ("error" in result) {
      setError(result.error);
      setStatus("idle");
      return;
    }

    setStatus("paying");
    const rzp = new window.Razorpay({
      key: result.keyId,
      amount: result.amountPaise,
      currency: result.currency,
      order_id: result.orderId,
      name: "AORMS",
      description: `${plan} licence — ${studioName}`,
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const confirmResult = await confirmPaymentClientSide(
          response.razorpay_order_id,
          response.razorpay_payment_id,
          response.razorpay_signature,
        );
        if (confirmResult?.error) {
          setError(confirmResult.error);
          setStatus("idle");
          return;
        }
        setStatus("activated");
      },
      modal: {
        ondismiss: () => setStatus("idle"),
      },
    });
    rzp.open();
  }

  if (status === "activated") {
    return (
      <InlineNotification
        kind="success"
        title="Licence updated"
        subtitle="Refresh to see the new plan — the page will also update shortly."
        lowContrast
        hideCloseButton
      />
    );
  }

  return (
    <Stack gap={4}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Stack gap={2} orientation="horizontal">
        <Select
          id={`upgrade-plan-${studioId}`}
          labelText="Plan"
          value={plan}
          onChange={(e) => setPlan(e.target.value as "STANDARD" | "PREMIUM")}
        >
          <SelectItem value="STANDARD" text="Standard" />
          <SelectItem value="PREMIUM" text="Premium" />
        </Select>
        <TextInput
          id={`upgrade-seats-${studioId}`}
          labelText="Seats"
          type="number"
          min={1}
          value={String(seats)}
          onChange={(e) => setSeats(Math.max(1, Number(e.target.value) || 1))}
        />
      </Stack>
      {error ? <InlineNotification kind="error" title="Couldn't start checkout" subtitle={error} lowContrast hideCloseButton /> : null}
      <Button kind="primary" size="sm" onClick={handleUpgrade} disabled={status !== "idle"}>
        {status === "creating" ? "Preparing…" : status === "paying" ? "Waiting for payment…" : "Upgrade"}
      </Button>
    </Stack>
  );
}
