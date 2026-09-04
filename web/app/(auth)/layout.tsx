import { Grid, Column } from "@carbon/react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
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
