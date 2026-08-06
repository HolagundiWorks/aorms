import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { Surface } from "@hcw/ui-kit";
import { HcwAttribution } from "./brand/HcwAttribution.js";
import { MarketingFooter } from "./landing/MarketingFooter.js";
import { AuthStageCanvas, type AuthStageVariant } from "./AuthStageCanvas.js";

/**
 * Unauthenticated auth shell — centered soft-neu card (no glass rail).
 * Stage atmosphere remains editorial background only.
 */
export function AuthRailLayout({
  rail,
  stage,
  variant = "workspace",
  showMarketingFooter = true,
  footerVariant = "architecture",
  visitCount,
}: {
  /** Sign-in / recovery form content — centered soft neu card. */
  rail: ReactNode;
  /** Optional custom stage; defaults to {@link AuthStageCanvas}. */
  stage?: ReactNode;
  variant?: AuthStageVariant;
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
          aria-hidden={variant === "external"}
          className="esti-auth-stage-bg"
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            pointerEvents: "none",
            opacity: 0.55,
          }}
        >
          {stage ?? <AuthStageCanvas variant={variant} />}
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
            p: { xs: 2, md: 4 },
            gap: 2,
          }}
        >
          <Surface
            layer="soft"
            className="esti-auth-card"
            sx={{
              width: "100%",
              maxWidth: 420,
              p: 2.5,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            <Box sx={{ minWidth: 0, width: 1, flex: 1 }}>{rail}</Box>
            <HcwAttribution variant="auth" />
          </Surface>
        </Box>
      </Box>

      {showMarketingFooter ? (
        <MarketingFooter variant={footerVariant} visitCount={visitCount} />
      ) : null}
    </div>
  );
}
