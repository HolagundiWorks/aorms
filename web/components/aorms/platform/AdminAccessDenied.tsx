import { Column, Grid, InlineNotification } from "@carbon/react";
import { PageHeader } from "../PageHeader";

/**
 * Shared "not a platform admin" gate for every page under
 * app/(platform)/admin/ — same InlineNotification pattern
 * app/(app)/audit-log/page.tsx already established for a role-gated page
 * ("Owner access required"), not a notFound()/404: this tells a
 * signed-in-but-unauthorized platform user plainly why they can't see the
 * page, matching this codebase's existing convention for permission gates
 * (as opposed to record-not-found gates, which do use notFound()).
 */
export function AdminAccessDenied({ title }: { title: string }) {
  return (
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
  );
}
