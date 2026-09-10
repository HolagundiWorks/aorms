import { Column, Grid } from "@carbon/react";
import { ConnectDexApplyForm } from "../../../components/aorms/platform/company/ConnectDexApplyForm";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { ConnectDexPortalHeader } from "../../../components/aorms/platform/PortalHeaders";

/**
 * ConnectDeX Partners — the connect form, first step of the gated
 * onboarding pipeline (2026-09-10, replacing Company's old instant
 * self-serve creation entirely — see platform/supabase/migrations/
 * 0013_connectdex_onboarding.sql). No auth required, same as
 * /platform-signup — a prospective partner has no account yet.
 */
export default function ConnectDexApplyPage() {
  return (
    <>
      <ConnectDexPortalHeader />
      <Grid>
        <Column sm={4} md={6} lg={8} style={{ margin: "0 auto" }}>
          <PageHeader
            title="Apply to become a ConnectDeX Partner"
            description="Tell us about your business — a platform admin will review your application and follow up by email."
          />
          <ConnectDexApplyForm />
        </Column>
      </Grid>
    </>
  );
}
