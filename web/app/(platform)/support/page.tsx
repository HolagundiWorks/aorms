import NextLink from "next/link";
import { Column, Grid } from "@carbon/react";
import { SupportTicketForm } from "../../../components/aorms/platform/SupportTicketForm";
import { PageHeader } from "../../../components/aorms/PageHeader";

/**
 * Contact HelpDeX (2026-09-10) — the public entry point to the AORMS
 * Platform's support-ticket area. Deliberately not nested under any one
 * of the three portal headers (IdentityPortalHeader/ConnectDexPortalHeader/
 * SysDexPortalHeader) — a Studio member, a Company member, or a prospect
 * with neither may all land here, same reasoning as /platform-login being
 * portal-neutral. Gets its own minimal standalone heading instead, same
 * treatment as /platform-login/platform-signup.
 */
export default function SupportPage() {
  return (
    <Grid>
      <Column sm={4} md={6} lg={8} style={{ margin: "0 auto" }}>
        <NextLink href="/" aria-label="AORMS home" style={{ display: "inline-block", marginBottom: "1.5rem" }}>
          <img src="/aorms-logo.png" alt="AORMS" style={{ height: "28px", width: "auto" }} />
        </NextLink>
        <PageHeader
          title="Contact HelpDeX"
          description="Tell us what's going on — a platform admin will review your request and follow up by email."
        />
        <SupportTicketForm />
      </Column>
    </Grid>
  );
}
