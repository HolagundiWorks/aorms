import type { Metadata } from "next";
import { Stack } from "@carbon/react";
import { HUMAN_CENTRIC_WORKS } from "../../../lib/marketing-content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern use of the AORMS platform.",
  alternates: { canonical: "https://aorms.in/legal" },
};

const LAST_UPDATED = "September 14, 2026";

/**
 * Terms of Service (2026-09-14, explicit direction: "add legal
 * section"). Reflects the account model actually described on the
 * landing page's own Pricing section (Basic identity / Pro subscription,
 * Individual vs Studio accounts, no trial) rather than generic
 * boilerplate that would drift from what the product says elsewhere.
 * Standard section set for a B2B SaaS terms page; update LAST_UPDATED
 * whenever this file changes materially.
 */
export default function LegalTermsPage() {
  return (
    <Stack gap={7}>
      <div>
        <p
          className="cds--type-productive-heading-01"
          style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
        >
          Legal
        </p>
        <h1 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
          Terms of Service
        </h1>
        <p className="cds--type-caption-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
          Last updated: {LAST_UPDATED}
        </p>
      </div>

      <Stack gap={6}>
        <Section title="1. Accounts">
          <p>
            AORMS has two separate account types: an individual AORMS Identity (a person&apos;s own portable account) and a
            Studio account (an architecture practice&apos;s own account). Each starts on Basic — the identity exists, with no
            feature access — and gains full feature access, plus a verified checkmark, on Pro. An individual&apos;s Pro status
            is granted by the Studio they work at, from that Studio&apos;s own paid plan; it is never purchased directly by an
            individual.
          </p>
        </Section>

        <Section title="2. Subscriptions and billing">
          <p>
            A Studio account is billed for its own Pro or Enterprise subscription, at the rate shown on{" "}
            <a href="/" className="cds--link">
              aorms.in
            </a>{" "}
            at the time of purchase. There is no trial period — Basic is free and unlimited in time; upgrading to Pro or
            Enterprise takes effect immediately and is billed annually in advance. Cancelling stops renewal but does not
            refund the current period.
          </p>
        </Section>

        <Section title="3. Your data">
          <p>
            Client, project, financial, and other operational records you enter belong to your Studio. We do not claim
            ownership of it, and we do not use it to train any third-party AI model. See our{" "}
            <a href="/privacy" className="cds--link">
              Privacy Policy
            </a>{" "}
            for how it is stored and handled.
          </p>
        </Section>

        <Section title="4. Acceptable use">
          <p>
            You agree not to use AORMS to store or process unlawful content, attempt to breach the security of the platform,
            or resell access to the hub without our written agreement.
          </p>
        </Section>

        <Section title="5. Service availability">
          <p>
            We aim to keep the service available at all times but do not guarantee uninterrupted access. We are not liable
            for losses arising from planned maintenance or events outside our reasonable control.
          </p>
        </Section>

        <Section title="6. Termination">
          <p>
            You may close your account at any time. We may suspend or terminate an account for breach of these terms or
            non-payment, with notice where practicable.
          </p>
        </Section>

        <Section title="7. Limitation of liability">
          <p>
            To the extent permitted by law, {HUMAN_CENTRIC_WORKS.legalName}&apos;s liability for any claim relating to the
            service is limited to the fees paid for that service in the twelve months preceding the claim.
          </p>
        </Section>

        <Section title="8. Governing law">
          <p>These terms are governed by the laws of India, with courts in Karnataka having jurisdiction.</p>
        </Section>

        <Section title="9. Changes to these terms">
          <p>
            We&apos;ll update the &ldquo;Last updated&rdquo; date above whenever these terms change materially, and where a
            change is significant we&apos;ll notify Studio owners directly.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions about these terms can be sent to{" "}
            <a href={`mailto:${HUMAN_CENTRIC_WORKS.email}`} className="cds--link">
              {HUMAN_CENTRIC_WORKS.email}
            </a>
            . {HUMAN_CENTRIC_WORKS.attribution} · {HUMAN_CENTRIC_WORKS.location}.
          </p>
        </Section>
      </Stack>
    </Stack>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: "1px solid var(--cds-border-subtle)", paddingTop: "1.5rem" }}>
      <h2 className="cds--type-productive-heading-03">{title}</h2>
      <div className="cds--type-body-01" style={{ marginTop: "0.75rem", color: "var(--cds-text-secondary)" }}>
        {children}
      </div>
    </div>
  );
}
