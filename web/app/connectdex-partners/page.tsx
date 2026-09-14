import type { Metadata } from "next";
import { Column, Grid, Tile } from "@carbon/react";
import { ConnectDexCtas } from "../../components/aorms/LandingButtons";
import { CONNECTDEX, COMPANY_IDENTITY } from "../../lib/marketing-content";

export const metadata: Metadata = {
  title: CONNECTDEX.name,
  description: CONNECTDEX.tagline,
  alternates: { canonical: "https://aorms.in/connectdex-partners" },
};

/**
 * ConnectDeX Partners — full marketing page (2026-09-14, explicit
 * direction: "keep [the landing page's ConnectDeX section] small, move
 * all the connectdex info into a separate page"). This is the content
 * that used to live in full on app/page.tsx's own #connectdex section —
 * moved here verbatim, the landing page now carries only a short teaser
 * linking to this page. See CONNECTDEX/COMPANY_IDENTITY's own header
 * comments in marketing-content.ts for what these entities actually are.
 */
export default function ConnectDexPartnersPage() {
  return (
    <Grid>
      <Column sm={4} md={8} lg={16} style={{ marginBottom: "2rem" }}>
        <p
          className="cds--type-productive-heading-01"
          style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--cds-text-secondary)" }}
        >
          {CONNECTDEX.name}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginTop: "0.5rem" }}>
          Building materials? List your catalogue.
        </h1>
        <p className="cds--type-body-02" style={{ marginTop: "0.75rem", maxWidth: 640, color: "var(--cds-text-secondary)" }}>
          {CONNECTDEX.tagline}. A separate identity type from a Studio — for material and interior suppliers, not
          architecture practices. Every Studio on AORMS can discover your catalogue through the Materials directory.
        </p>
      </Column>
      {COMPANY_IDENTITY.map((f) => (
        <Column key={f.title} sm={4} md={4} lg={5} style={{ marginBottom: "1rem" }}>
          <Tile style={{ height: "100%" }}>
            <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-support-info)" }}>
              {f.eyebrow}
            </p>
            <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.5rem" }}>
              {f.title}
            </h3>
            <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
              {f.body}
            </p>
          </Tile>
        </Column>
      ))}
      <Column sm={4} md={8} lg={16} style={{ marginTop: "0.5rem" }}>
        <ConnectDexCtas />
      </Column>
    </Grid>
  );
}
