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
 * The individual counterpart to UpgradeLicenceButton — AORMS Identity
 * verification, a flat ONE-TIME fee (2026-09-13: was an annual plan,
 * corrected — see lib/actions/platform-payments.ts's createIdentityOrder
 * header). `eligible` (hours >= the 100h threshold, computed by the
 * caller) just controls whether the button is enabled — the real gate is
 * still server-side in createIdentityOrder, this is only so the button
 * doesn't invite a doomed click before that threshold. Once purchased,
 * this component isn't rendered at all (see identity/page.tsx) — nothing
 * to renew, ever.
 */
export function PurchaseIdentityButton({ basePricePaise, eligible }: { basePricePaise: number; eligible: boolean }) {
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
      description: "AORMS Identity — verification (one-time)",
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
        title="AORMS Identity verified"
        subtitle="Permanent — refresh to see it reflected here."
        lowContrast
        hideCloseButton
      />
    );
  }

  return (
    <Stack gap={4}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      {error ? <InlineNotification kind="error" title="Couldn't start checkout" subtitle={error} lowContrast hideCloseButton /> : null}
      <Button kind="primary" size="sm" onClick={handlePurchase} disabled={!eligible || status !== "idle"}>
        {status === "creating"
          ? "Preparing…"
          : status === "paying"
            ? "Waiting for payment…"
            : `Verify — ${formatRupees(basePricePaise)} one-time`}
      </Button>
    </Stack>
  );
}
