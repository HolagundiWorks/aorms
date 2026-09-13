"use client";

import { useState } from "react";
import Script from "next/script";
import { Button, InlineNotification, RadioButton, RadioButtonGroup, Stack } from "@carbon/react";
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

const ENTERPRISE_MIN_MEMBERS = 20;

/**
 * Studio-owner-facing licence purchase — replaces the old self-serve
 * direct-edit form (UpdateLicenceForm is admin-only now, see
 * app/(platform)/admin/licences/page.tsx). Loads Razorpay's Checkout.js
 * once (next/script, afterInteractive — cheap, and this component only
 * renders on the licences page, not app-wide) and opens the payment sheet
 * on click.
 *
 * 2026-09-14: back to a plan choice (Pro vs Enterprise, migration 0019
 * split AORMS Firm into these two named tiers) — but both flat annual
 * fees now, no seats input or per-seat formula at all (that entire
 * concept was retired the same migration). Enterprise is disabled with
 * an inline hint below 20 active members, mirroring the same gate
 * createLicenceOrder enforces server-side (this is just a clean-UX
 * short-circuit, not the real check).
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
  activeMemberCount,
  pricing,
}: {
  studioId: string;
  studioName: string;
  activeMemberCount: number;
  pricing: { proPricePaise: number; enterprisePricePaise: number };
}) {
  const enterpriseEligible = activeMemberCount >= ENTERPRISE_MIN_MEMBERS;
  const [plan, setPlan] = useState<"PRO" | "ENTERPRISE">("PRO");
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
      description: `Studio ${plan === "PRO" ? "Pro" : "Enterprise"} licence — ${studioName}`,
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
      <RadioButtonGroup
        legendText="Plan"
        name={`upgrade-plan-${studioId}`}
        valueSelected={plan}
        onChange={(value) => setPlan(value as "PRO" | "ENTERPRISE")}
        orientation="vertical"
      >
        <RadioButton id={`plan-pro-${studioId}`} labelText={`Pro — ${formatRupees(pricing.proPricePaise)}/year`} value="PRO" />
        <RadioButton
          id={`plan-enterprise-${studioId}`}
          labelText={`Enterprise — ${formatRupees(pricing.enterprisePricePaise)}/year`}
          value="ENTERPRISE"
          disabled={!enterpriseEligible}
        />
      </RadioButtonGroup>
      {!enterpriseEligible && (
        <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
          Enterprise needs {ENTERPRISE_MIN_MEMBERS}+ active team members — this studio has {activeMemberCount}.
        </p>
      )}
      {error ? <InlineNotification kind="error" title="Couldn't start checkout" subtitle={error} lowContrast hideCloseButton /> : null}
      <Button kind="primary" size="sm" onClick={handleUpgrade} disabled={status !== "idle"}>
        {status === "creating" ? "Preparing…" : status === "paying" ? "Waiting for payment…" : "Upgrade"}
      </Button>
    </Stack>
  );
}
