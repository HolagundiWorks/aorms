import { Column, Grid, InlineNotification } from "@carbon/react";
import { PageHeader } from "../PageHeader";
import { SysDexPortalHeader } from "./PortalHeaders";

/**
 * Shared "not a platform admin" gate for every page under
 * app/(platform)/admin/ — same InlineNotification pattern
 * app/(app)/audit-log/page.tsx already established for a role-gated page
 * ("Owner access required"), not a notFound()/404: this tells a
 * signed-in-but-unauthorized platform user plainly why they can't see the
 * page, matching this codebase's existing convention for permission gates
 * (as opposed to record-not-found gates, which do use notFound()).
 *
 * Renders the SysDeX header itself (2026-09-10) rather than each admin
 * page's own early-return branch doing it — this is the ONE place a
 * non-admin visiting any /admin/* page lands, so it's also the one place
 * that needs to.
 */
export function AdminAccessDenied({ title }: { title: string }) {
  return (
    <>
      <SysDexPortalHeader />
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <PageHeader title={title} />
          <InlineNotification
            kind="error"
            title="Admin access required"
            subtitle="This area is restricted to AORMS Platform administrators."
            hideCloseButton
            lowContrast
          />
        </Column>
      </Grid>
    </>
  );
}
