"use client";

import { useEffect } from "react";
import { Button, Column, Grid, InlineNotification } from "@carbon/react";

/**
 * Route-level error boundary (Next.js error.tsx convention) for every page
 * under the authenticated app shell — catches an unhandled exception in a
 * Server or Client Component render (not a Supabase query error handled
 * inline, which every page already surfaces as its own <InlineNotification>)
 * and shows a recoverable Carbon error state instead of Next's raw dev
 * overlay / a blank prod page. Must be a Client Component per Next's
 * convention (error.tsx boundaries render below the point of failure, so
 * they can't be server-rendered themselves).
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Grid style={{ padding: "2rem" }}>
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
