"use client";

import { useEffect } from "react";
import { Button, Column, Grid, InlineNotification } from "@carbon/react";

/**
 * Shared route-level error boundary body (Next.js `error.tsx` convention)
 * — reused across every route group that has its own layout shell (the
 * Client/Collaborator/Contractor Portals, the AORMS Platform, the auth
 * pages), the same way `(app)/error.tsx` already covers the office hub.
 * Catches an unhandled exception in a Server or Client Component render
 * (not a Supabase query error handled inline, which every page already
 * surfaces as its own `<InlineNotification>`) and shows a recoverable
 * Carbon error state instead of Next's raw dev overlay / a blank prod page.
 *
 * Each route group's own `error.tsx` file must still exist at that exact
 * path (Next's convention, not just a re-export trick) but can be a thin
 * wrapper — the "use client" boundary this component itself carries is
 * what satisfies Next's requirement that error boundaries render below the
 * point of failure, so they can't be server-rendered.
 */
export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <InlineNotification
          kind="error"
          title="Something went wrong"
          subtitle={error.message || "An unexpected error occurred."}
          hideCloseButton
          lowContrast
        />
        <div style={{ marginTop: "1rem" }}>
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </Column>
    </Grid>
  );
}
