import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { Surface, RADIUS } from "@hcw/ui-kit";
import { HcwAttribution } from "./brand/HcwAttribution.js";
import { MarketingFooter } from "./landing/MarketingFooter.js";
import { LandingContours } from "./landing/LandingContours.js";
import { COMPOSITION_RHYTHM } from "../lib/composition.js";

/**
 * Unauthenticated auth shell — centered soft-neu card on Fog Gray (no glass rail).
 * Brand lives in the card; stage is atmosphere only (contours + soft blobs).
 * Spacing: COMPOSITION_RHYTHM · docs/esti/COMPOSITION-PRINCIPLES.md
 */
export function AuthRailLayout({
  rail,
  stage,
  variant: _variant = "workspace",
  showMarketingFooter = true,
  footerVariant = "architecture",
  visitCount,
}: {
  /** Sign-in / recovery form content — centered soft neu card. */
  rail: ReactNode;
  /** Optional custom stage atmosphere; defaults to LandingContours. */
  stage?: ReactNode;
  /** @deprecated Kept for call-site compat — stage no longer carries product copy. */
  variant?: "workspace" | "portal" | "external" | "admin";
  showMarketingFooter?: boolean;
  footerVariant?: "platform" | "architecture";
  visitCount?: number | null;
}) {
  return (
    <div className="esti-auth-shell">
      <a href="#esti-auth-main" className="esti-skip-link">
        Skip to main content
      </a>
      <div className="esti-auth-blobs" aria-hidden>
        <div className="esti-auth-blob esti-auth-blob--a" />
        <div className="esti-auth-blob esti-auth-blob--b" />
        <div className="esti-auth-blob esti-auth-blob--c" />
      </div>

      <Box
        className="esti-neu-dash esti-auth-dash"
        sx={{
          flex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <Box
          aria-hidden
          className="esti-auth-stage-bg"
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            opacity: 0.4,
          }}
        >
          {stage ?? <LandingContours />}
        </Box>

        <Box
          component="main"
          id="esti-auth-main"
          tabIndex={-1}
          sx={{
            position: "relative",
            zIndex: 1,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            p: { xs: COMPOSITION_RHYTHM.md, md: COMPOSITION_RHYTHM.lg },
            gap: COMPOSITION_RHYTHM.md,
          }}
        >
          <Surface
            layer="soft"
            className="esti-auth-card"
            sx={{
              width: "100%",
              maxWidth: COMPOSITION_RHYTHM.authCardMaxPx,
              borderRadius: `${RADIUS}px`,
              p: { xs: COMPOSITION_RHYTHM.md, sm: COMPOSITION_RHYTHM.lg },
              display: "flex",
              flexDirection: "column",
              gap: COMPOSITION_RHYTHM.md,
            }}
          >
            <Box className="esti-auth-card__body" sx={{ minWidth: 0, width: 1, flex: 1 }}>
              {rail}
            </Box>
            <HcwAttribution variant="auth" logoTone="on-light" />
          </Surface>
        </Box>
      </Box>

      {showMarketingFooter ? (
        <MarketingFooter variant={footerVariant} visitCount={visitCount} />
      ) : null}
    </div>
  );
}
