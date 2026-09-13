"use client";

import { useState } from "react";
import Script from "next/script";
import { Button, InlineNotification, Stack } from "@carbon/react";
import { createIdentityOrder, confirmIdentityPaymentClientSide } from "../../../lib/actions/platform-payments";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/**
 * The individual counterpart to UpgradeLicenceButton — AORMS Identity, a
 * flat annual fee, no seats/plan choice at all (see
 * lib/actions/platform-payments.ts's createIdentityOrder). Same Razorpay
 * Checkout.js flow, `label` swaps between "Purchase" (never bought before,
 * or lapsed) and "Renew" (currently active) purely for copy — the checkout
 * mechanics are identical either way (extends expires_at by a year from
 * `now` or the current expiry, whichever is later).
 */
export function PurchaseIdentityButton({ basePricePaise, isRenewal }: { basePricePaise: number; isRenewal: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "creating" | "paying" | "activated">("idle");

  async function handlePurchase() {
    setError(null);
    setStatus("creating");
    const result = await createIdentityOrder();
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
      description: "AORMS Identity — annual plan",
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const confirmResult = await confirmIdentityPaymentClientSide(
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
        title="AORMS Identity activated"
        subtitle="Refresh to see the new plan — the page will also update shortly."
        lowContrast
        hideCloseButton
      />
    );
  }

  return (
    <Stack gap={4}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      {error ? <InlineNotification kind="error" title="Couldn't start checkout" subtitle={error} lowContrast hideCloseButton /> : null}
      <Button kind="primary" size="sm" onClick={handlePurchase} disabled={status !== "idle"}>
        {status === "creating"
          ? "Preparing…"
          : status === "paying"
            ? "Waiting for payment…"
            : `${isRenewal ? "Renew" : "Purchase"} — ${formatRupees(basePricePaise)}/year`}
      </Button>
    </Stack>
  );
}
