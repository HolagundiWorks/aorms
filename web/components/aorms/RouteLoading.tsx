import { Column, Grid, SkeletonPlaceholder, SkeletonText } from "@carbon/react";

/**
 * Shared route-level loading UI (Next.js `loading.tsx` convention) —
 * reused across every route group that has its own layout shell (the
 * Client/Collaborator/Contractor Portals, the AORMS Platform), the same
 * way `(app)/loading.tsx` already covers the office hub. Shown while a
 * Server Component page is fetching its data, so navigating between pages
 * shows a Carbon skeleton instead of a blank content pane. No client
 * directive needed — unlike `RouteNotFound`/`RouteError`, nothing here is
 * interactive.
 */
export function RouteLoading() {
  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <div style={{ marginBottom: "1.5rem" }}>
          <SkeletonText heading width="40%" />
        </div>
        <SkeletonPlaceholder style={{ width: "100%", height: "12rem" }} />
      </Column>
    </Grid>
  );
}
