import { Grid, Column } from "@carbon/react";

/**
 * AORMS Platform login/signup — a genuinely separate session boundary from
 * the firm app's own (app)/(auth) groups (a different Supabase project,
 * see lib/platform/*). Deliberately NOT gated behind firm auth: a personal
 * AORMS-U- identity can exist independently of any one firm relationship.
 * Same minimal centered-column shell as (auth)/layout.tsx.
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", padding: "2rem 1rem" }}>
      <Grid style={{ width: "100%" }}>
        <Column sm={4} md={6} lg={8} style={{ margin: "0 auto" }}>
          {children}
        </Column>
      </Grid>
    </div>
  );
}
