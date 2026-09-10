"use client";

import { useState } from "react";
import Script from "next/script";
import { Button, InlineNotification, Stack } from "@carbon/react";
import { createConnectDexOnboardingOrder, confirmConnectDexPaymentClientSide } from "../../../../lib/actions/connectdex";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/**
 * Final step of the ConnectDeX Partners onboarding pipeline — mirrors
 * UpgradeLicenceButton.tsx's Razorpay Checkout flow exactly, but for a
 * single flat fee (no plan/seats choice — the amount is read server-side
 * from connectdex_settings). Shown on /companies/[companyId] while status
 * is PENDING_PAYMENT.
 */
export function PayConnectDexFeeButton({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "creating" | "paying" | "activated">("idle");

  async function handlePay() {
    setError(null);
    setStatus("creating");
    const result = await createConnectDexOnboardingOrder(companyId);
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
      description: `ConnectDeX Partners onboarding fee — ${companyName}`,
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const confirmResult = await confirmConnectDexPaymentClientSide(
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
        title="Payment received"
        subtitle="You're onboarded — refresh to see your active ConnectDeX Partners profile."
        lowContrast
        hideCloseButton
      />
    );
  }

  return (
    <Stack gap={4}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      {error ? <InlineNotification kind="error" title="Couldn't start checkout" subtitle={error} lowContrast hideCloseButton /> : null}
      <Button kind="primary" onClick={handlePay} disabled={status !== "idle"}>
        {status === "creating" ? "Preparing…" : status === "paying" ? "Waiting for payment…" : "Pay onboarding fee"}
      </Button>
    </Stack>
  );
}
