/**
 * Standalone sign-in page for the non-marketing (firm product) build variant
 * (`VITE_PUBLIC_SITE=false`), where there is no landing page to embed sign-in
 * into. Reuses the same `LandingAuth` panel the public marketing site embeds
 * at `/#sign-in` — one auth implementation, two placements.
 */
import { Grid, Column } from "@carbon/react";
import { LandingAuth } from "../components/landing/LandingAuth.js";
import { AormsLogo } from "../components/AormsLogo.js";

export function AuthPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", padding: "2rem 1rem" }}>
      <Grid style={{ width: "100%" }}>
        <Column sm={4} md={6} lg={8} style={{ margin: "0 auto" }}>
          <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "center" }}>
            <AormsLogo />
          </div>
          <LandingAuth />
        </Column>
      </Grid>
    </div>
  );
}
