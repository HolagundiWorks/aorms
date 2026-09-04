import { Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { SoftSurface } from "../components/landing/SoftSurface.js";
import { AORMS_PLATFORM, HUMAN_CENTRIC_WORKS } from "../lib/product-nomenclature.js";

/**
 * Shown when marketing-only soft launch blocks /login and related auth routes.
 */
export function ComingSoonAuth() {
  return (
    <MarketingShell contours>
      <Box sx={{ maxWidth: 560, mx: "auto", py: { xs: 6, md: 10 } }}>
        <SoftSurface sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.12em" }}>
              Soft launch
            </Typography>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
              Sign-in coming soon
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {AORMS_PLATFORM.name} web-based office hub is live — sign in from the landing
              page. This particular area is not available yet.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 1 }}>
              <Button component={RouterLink} to="/#sign-in" variant="contained" color="primary">
                Sign in
              </Button>
              <Button component={RouterLink} to="/downloads" variant="text" color="inherit">
                Downloads
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Questions?{" "}
              <Box
                component="a"
                href={`mailto:${HUMAN_CENTRIC_WORKS.email}`}
                sx={{ color: "inherit" }}
              >
                {HUMAN_CENTRIC_WORKS.email}
              </Box>
            </Typography>
          </Stack>
        </SoftSurface>
      </Box>
    </MarketingShell>
  );
}
