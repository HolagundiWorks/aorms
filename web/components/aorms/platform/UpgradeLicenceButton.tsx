"use client";

import { useState } from "react";
import Script from "next/script";
import { Button, InlineNotification, Stack, TextInput } from "@carbon/react";
import { createLicenceOrder, confirmPaymentClientSide } from "../../../lib/actions/platform-payments";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/** ₹, no decimals — every price here is a whole-rupee figure. */
function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/**
 * Studio-owner-facing licence purchase — replaces the old self-serve
 * direct-edit form (UpdateLicenceForm is admin-only now, see
 * app/(platform)/admin/licences/page.tsx). Loads Razorpay's Checkout.js
 * once (next/script, afterInteractive — cheap, and this component only
 * renders on the licences page, not app-wide) and opens the payment sheet
 * on click.
 *
 * 2026-09-13: dropped the plan Select — AORMS Firm is the only paid Studio
 * plan now (see platform-payments.ts's createLicenceOrder). Added a live
 * price preview from `pricing` (read by the server-rendered /licences page
 * and passed down) — the exploration for this change found there was
 * previously no rupee amount shown anywhere before Razorpay's own modal
 * opened; this closes that real, pre-existing gap.
 *
 * The `handler` callback below fires only after Razorpay itself confirms
 * the payment succeeded client-side — confirmPaymentClientSide is the
 * fast-path UX update (verifies the signature again server-side, never
 * trusts the browser alone); app/api/razorpay/webhook/route.ts is the
 * durable source of truth and will apply the same update independently if
 * this callback never fires (tab closed mid-flow, etc.).
 */
export function UpgradeLicenceButton({
  studioId,
  studioName,
  pricing,
}: {
  studioId: string;
  studioName: string;
  pricing: { basePricePaise: number; pricePerSeatMonthlyPaise: number };
}) {
  const [seats, setSeats] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "creating" | "paying" | "activated">("idle");

  const estimatedTotalPaise = pricing.basePricePaise + pricing.pricePerSeatMonthlyPaise * 12 * seats;

  async function handleUpgrade() {
    setError(null);
    setStatus("creating");
    const result = await createLicenceOrder(studioId, seats);
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
      description: `AORMS Firm licence — ${studioName}`,
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
      <TextInput
        id={`upgrade-seats-${studioId}`}
        labelText="Seats"
        type="number"
        min={1}
        value={String(seats)}
        onChange={(e) => setSeats(Math.max(1, Number(e.target.value) || 1))}
      />
      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
        {formatRupees(pricing.basePricePaise)} base + {formatRupees(pricing.pricePerSeatMonthlyPaise)}/user/month × {seats} user
        {seats === 1 ? "" : "s"}, billed annually — <strong>{formatRupees(estimatedTotalPaise)}/year total</strong>
      </p>
      {error ? <InlineNotification kind="error" title="Couldn't start checkout" subtitle={error} lowContrast hideCloseButton /> : null}
      <Button kind="primary" size="sm" onClick={handleUpgrade} disabled={status !== "idle"}>
        {status === "creating" ? "Preparing…" : status === "paying" ? "Waiting for payment…" : "Upgrade"}
      </Button>
    </Stack>
  );
}
