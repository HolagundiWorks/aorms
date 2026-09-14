"use client";

import { useState } from "react";
import Script from "next/script";
import { Button, InlineNotification, RadioButton, RadioButtonGroup, Stack, Tile } from "@carbon/react";
import { createLicenceOrder, confirmPaymentClientSide } from "../../../lib/actions/platform-payments";
import { EnterpriseEnquiryForm } from "./EnterpriseEnquiryForm";

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
 * 2026-09-14 real pricing restructure — Studio/Professional stay a self-
 * serve plan choice (both flat annual fees, no seats input/per-seat
 * formula), but Enterprise is no longer a flat self-checkout price at
 * all: it moved to "Talk to AORMS" (EnterpriseEnquiryForm, a support-
 * ticket submission an admin follows up on), matching the spec's own
 * positioning of Enterprise as custom/contact-sales pricing rather than
 * a number anyone can self-checkout. The old 20-member Enterprise
 * eligibility gate is gone along with self-serve Enterprise purchase —
 * an admin grants it directly via adminUpdateLicence once a deal closes.
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
  ownerName,
  ownerEmail,
  pricing,
}: {
  studioId: string;
  studioName: string;
  ownerName: string;
  ownerEmail: string;
  pricing: { studioPricePaise: number; professionalPricePaise: number; enterpriseStartingAtPaise: number };
}) {
  const [plan, setPlan] = useState<"STUDIO" | "PROFESSIONAL">("STUDIO");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "creating" | "paying" | "activated">("idle");

  async function handleUpgrade() {
    setError(null);
    setStatus("creating");
    const result = await createLicenceOrder(studioId, plan);
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
      description: `${plan === "STUDIO" ? "Studio" : "Professional"} licence — ${studioName}`,
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
    <Stack gap={5}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <Stack gap={4}>
        <RadioButtonGroup
          legendText="Plan"
          name={`upgrade-plan-${studioId}`}
          valueSelected={plan}
          onChange={(value) => setPlan(value as "STUDIO" | "PROFESSIONAL")}
          orientation="vertical"
        >
          <RadioButton id={`plan-studio-${studioId}`} labelText={`Studio — ${formatRupees(pricing.studioPricePaise)}/year`} value="STUDIO" />
          <RadioButton
            id={`plan-professional-${studioId}`}
            labelText={`Professional — ${formatRupees(pricing.professionalPricePaise)}/year`}
            value="PROFESSIONAL"
          />
        </RadioButtonGroup>
        {error ? <InlineNotification kind="error" title="Couldn't start checkout" subtitle={error} lowContrast hideCloseButton /> : null}
        <Button kind="primary" size="sm" onClick={handleUpgrade} disabled={status !== "idle"}>
          {status === "creating" ? "Preparing…" : status === "paying" ? "Waiting for payment…" : "Upgrade"}
        </Button>
      </Stack>
      <Tile>
        <p className="cds--type-productive-heading-02" style={{ marginBottom: "0.5rem" }}>
          Need Enterprise?
        </p>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "1rem" }}>
          Custom pricing based on team size, offices, and requirements — starting from{" "}
          {formatRupees(pricing.enterpriseStartingAtPaise)}/year.
        </p>
        <EnterpriseEnquiryForm studioId={studioId} studioName={studioName} defaultName={ownerName} defaultEmail={ownerEmail} />
      </Tile>
    </Stack>
  );
}
