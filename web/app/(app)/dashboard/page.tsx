import { Grid, Column, Tile } from "@carbon/react";

export default function DashboardPage() {
  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Dashboard</h1>
        <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
          Phase 1 foundation — Next.js + TypeScript + Carbon + Supabase Auth are wired up.
          Core ERP modules (clients, projects, proposals, invoices) land in Phase 2.
        </p>
        <Tile style={{ marginTop: "1.5rem" }}>
          You're signed in. This confirms the Supabase Auth → Server Component → Carbon
          UI Shell path works end to end.
        </Tile>
      </Column>
    </Grid>
  );
}
