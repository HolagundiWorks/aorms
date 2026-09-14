import type { Metadata } from "next";
import { Stack } from "@carbon/react";
import { HUMAN_CENTRIC_WORKS } from "../../../lib/marketing-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How AORMS collects, uses, and protects your data.",
  alternates: { canonical: "https://aorms.in/privacy" },
};

const LAST_UPDATED = "September 14, 2026";

/**
 * Privacy Policy (2026-09-14, explicit direction: "add privacy policy").
 * Written to match what this codebase actually does — real hosting
 * region, real AI posture (self-hosted Ollama, no third-party model
 * training) — already established elsewhere on this page and in
 * CLAUDE.md, not generic boilerplate claiming things unverified for this
 * product (no compliance certification is claimed here that hasn't
 * actually been obtained). Standard section set for a B2B SaaS privacy
 * policy; update LAST_UPDATED whenever this file changes materially.
 */
export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>
        <p className="cds--type-caption-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
          Last updated: {LAST_UPDATED}
        </p>
      </div>

      <Stack gap={6}>
        <Section title="1. Who this policy covers">
          <p>
            This policy applies to {HUMAN_CENTRIC_WORKS.legalName}&apos;s AORMS office-management platform, including the AORMS
            Office Hub, the AORMS Platform (Identity, Studio, and ConnectDeX Partners accounts), and the ESTI AI agent. It covers
            data collected from architecture practices (&ldquo;Studios&rdquo;), their staff, their clients using a client portal,
            and material/interior suppliers using ConnectDeX Partners.
          </p>
        </Section>

        <Section title="2. What we collect">
          <p>Account and identity data you provide directly: name, email, phone, role, and firm details at signup.</p>
          <p>
            Operational data your Studio enters into the hub in the course of running its practice: client records, project and
            task data, proposals, invoices, drawings, and similar business records. This data belongs to your Studio, not to us.
          </p>
          <p>Usage data: sign-in activity, feature usage, and error logs, used to operate and improve the service.</p>
        </Section>

        <Section title="3. How we use it">
          <p>To provide the service you signed up for — running the office hub, generating documents, and processing payments.</p>
          <p>
            To power ESTI, AORMS&apos; built-in AI agent. ESTI answers only from your own Studio&apos;s data, using a
            self-hosted AI model — your data is never sent to a third-party AI provider and never used to train a public model.
          </p>
          <p>To communicate with you about your account, billing, and material changes to this service.</p>
        </Section>

        <Section title="4. Where your data is hosted">
          <p>
            Studio data is hosted in AWS&apos;s Mumbai region (ap-south-1). We do not move a Studio&apos;s operational data
            outside India as a matter of course.
          </p>
        </Section>

        <Section title="5. Who we share it with">
          <p>
            We do not sell your data. We share it only with the infrastructure providers necessary to run the service (cloud
            hosting, payment processing) and only to the extent needed to provide that function, or where required by law.
          </p>
          <p>
            A client using a client portal sees only the data your Studio explicitly shares with that portal — never another
            client&apos;s or Studio&apos;s records.
          </p>
        </Section>

        <Section title="6. Your rights">
          <p>
            You can request a copy of your account data, ask us to correct inaccuracies, or ask us to delete your account,
            subject to what we&apos;re required to retain for legal or accounting purposes (for example, GST-relevant financial
            records). Contact us at{" "}
            <a href={`mailto:${HUMAN_CENTRIC_WORKS.email}`} className="cds--link">
              {HUMAN_CENTRIC_WORKS.email}
            </a>{" "}
            to exercise any of these.
          </p>
        </Section>

        <Section title="7. Data retention">
          <p>
            We retain account and operational data for as long as your Studio&apos;s account is active, and for a reasonable
            period after closure to meet legal, tax, and accounting obligations.
          </p>
        </Section>

        <Section title="8. Cookies">
          <p>
            We use session cookies necessary to keep you signed in and to remember basic preferences. We do not use
            third-party advertising or tracking cookies.
          </p>
        </Section>

        <Section title="9. Changes to this policy">
          <p>
            We&apos;ll update the &ldquo;Last updated&rdquo; date above whenever this policy changes materially, and where a
            change is significant we&apos;ll notify Studio owners directly.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions about this policy or your data can be sent to{" "}
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
      <Stack gap={3} style={{ marginTop: "0.75rem" }}>
        {Array.isArray(children) ? (
          children.map((child, i) => (
            <p key={i} className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
              {child}
            </p>
          ))
        ) : (
          <div className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            {children}
          </div>
        )}
      </Stack>
    </div>
  );
}
