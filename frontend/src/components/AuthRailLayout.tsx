import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { AnalogueClock, Surface, RADIUS, colors } from "@hcw/ui-kit";
import { HcwAttribution } from "./brand/HcwAttribution.js";
import { MarketingFooter } from "./landing/MarketingFooter.js";
import { MarketingTopBar } from "./landing/MarketingTopBar.js";
import { LandingEntourage } from "./landing/LandingEntourage.js";
import { COMPOSITION_RHYTHM } from "../lib/composition.js";
import {
  MARKETING_CONTENT_GUTTER,
  marketingContentColumnSx,
} from "../lib/marketing-layout.js";

/**
 * Unauthenticated auth shell — landing MarketingTopBar + Fog Gray entourage +
 * soft-neu card. Ambient AnalogueClock (no Pomodoro). Logos → landing.
 */
export function AuthRailLayout({
  rail,
  stage,
  variant: _variant = "workspace",
  showMarketingFooter = true,
  footerVariant = "architecture",
  visitCount,
  /** Horizontal brand|form card (login). Stacked is the default for short forms. */
  layout = "stack",
}: {
  /** Sign-in / recovery form content — centered soft neu card. */
  rail: ReactNode;
  /** Optional custom stage atmosphere; defaults to LandingEntourage. */
  stage?: ReactNode;
  /** @deprecated Kept for call-site compat — stage no longer carries product copy. */
  variant?: "workspace" | "portal" | "external" | "admin";
  showMarketingFooter?: boolean;
  footerVariant?: "platform" | "architecture";
  visitCount?: number | null;
  layout?: "stack" | "horizontal";
}) {
  const wide = layout === "horizontal";

  return (
    <div
      className="esti-auth-shell esti-lp-neu"
      style={{ backgroundColor: colors.background }}
    >
      <a href="#esti-auth-main" className="esti-skip-link">
        Skip to main content
      </a>

      <MarketingTopBar />

      <Box
        className="esti-auth-dash"
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          backgroundColor: colors.background,
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
            overflow: "hidden",
          }}
        >
          {stage ?? <LandingEntourage count={14} seed={41} />}
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
            px: { xs: MARKETING_CONTENT_GUTTER.xs, md: MARKETING_CONTENT_GUTTER.md },
            py: { xs: COMPOSITION_RHYTHM.md, md: COMPOSITION_RHYTHM.lg },
            gap: COMPOSITION_RHYTHM.md,
            boxSizing: "border-box",
          }}
        >
          <Surface
            layer="soft"
            className={`esti-auth-card${wide ? " esti-auth-card--horizontal" : ""}`}
            sx={{
              ...(wide
                ? marketingContentColumnSx
                : {
                    width: "100%",
                    maxWidth: COMPOSITION_RHYTHM.authCardMaxPx,
                  }),
              borderRadius: `${RADIUS}px`,
              p: wide ? 0 : { xs: COMPOSITION_RHYTHM.md, sm: COMPOSITION_RHYTHM.lg },
              display: "flex",
              flexDirection: "column",
              gap: wide ? 0 : COMPOSITION_RHYTHM.md,
              overflow: "hidden",
            }}
          >
            <Box className="esti-auth-card__body" sx={{ minWidth: 0, width: 1, flex: 1 }}>
              {rail}
            </Box>
            {wide ? (
              <Box
                className="esti-auth-card__foot"
                sx={{
                  px: COMPOSITION_RHYTHM.md,
                  py: 1.5,
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                <HcwAttribution variant="auth" logoTone="on-light" />
              </Box>
            ) : (
              <HcwAttribution variant="auth" logoTone="on-light" />
            )}
          </Surface>
        </Box>
      </Box>

      <Box
        className="esti-auth-clock"
        sx={{
          position: "fixed",
          right: { xs: 16, md: 24 },
          bottom: { xs: 16, md: 24 },
          zIndex: 40,
          pointerEvents: "none",
        }}
        aria-hidden
      >
        <AnalogueClock size={72} />
      </Box>

      {showMarketingFooter ? (
        <MarketingFooter variant={footerVariant} visitCount={visitCount} />
      ) : null}
    </div>
  );
}
