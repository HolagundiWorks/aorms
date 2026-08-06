import { ActionDockProvider } from "@hcw/ui-kit";
import { Box } from "@mui/material";
import { type ReactNode, useEffect } from "react";
import { useLpReveal } from "../../lib/use-lp-reveal.js";
import { LandingContours } from "./LandingContours.js";
import { MarketingConversionDock, type MarketingConversionDockVariant } from "./MarketingConversionDock.js";
import { MarketingFooter } from "./MarketingFooter.js";
import { MarketingNeuFrame } from "./MarketingTopBar.js";

/**
 * Marketing shell — soft-neu top bar + stage + AnalogueClock + ActionDock (conversion).
 * Left SoftRail retired; same chrome as the platform landing.
 */
export function MarketingShell({
  children,
  contours,
  wiki,
  tagline: _tagline,
  vertical = "platform",
  footerVariant,
  visitCount,
  showFooter = true,
  showConversionDock,
  conversionDockVariant = "default",
}: {
  children: ReactNode;
  contours?: boolean;
  wiki?: boolean;
  tagline?: string;
  /** Default rail tagline when `tagline` is omitted (wiki uses its own default). */
  vertical?: "platform" | "architecture";
  footerVariant?: "platform" | "architecture";
  visitCount?: number | null;
  showFooter?: boolean;
  showConversionDock?: boolean;
  /** Platform `/` uses app picker CTAs; other pages use Create account + Sign in. */
  conversionDockVariant?: MarketingConversionDockVariant;
}) {
  return (
    <ActionDockProvider>
      <MarketingShellInner
        contours={contours}
        wiki={wiki}
        footerVariant={footerVariant ?? vertical}
        visitCount={visitCount}
        showFooter={showFooter}
        showConversionDock={showConversionDock ?? true}
        conversionDockVariant={conversionDockVariant}
      >
        {children}
      </MarketingShellInner>
    </ActionDockProvider>
  );
}

function MarketingShellInner({
  children,
  contours,
  footerVariant,
  visitCount,
  showFooter,
  showConversionDock,
  conversionDockVariant,
}: {
  children: ReactNode;
  contours?: boolean;
  wiki?: boolean;
  footerVariant: "platform" | "architecture";
  visitCount?: number | null;
  showFooter: boolean;
  showConversionDock: boolean;
  conversionDockVariant: MarketingConversionDockVariant;
}) {
  useLpReveal();

  useEffect(() => {
    // Close any leftover mobile-rail overflow locks from older shell versions.
    document.body.style.overflow = "";
  }, []);

  const showDock = showConversionDock;

  return (
    <MarketingNeuFrame mainId="lp2-main">
      <Box
        className={[
          "lp2-shell",
          "esti-lp",
          "esti-lp-neu",
          showDock ? "lp2-shell--conversion-dock" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          width: 1,
          px: { xs: 1.5, md: 2 },
          pb: showDock ? 10 : 4,
        }}
      >
        <Box
          className="esti-dash-stage lp2-stage"
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          {contours ? (
            <div className="lp2-stage__contours" aria-hidden>
              <LandingContours />
            </div>
          ) : null}
          <div className="lp2-content">
            {children}
            {showFooter ? (
              <MarketingFooter visitCount={visitCount} variant={footerVariant} />
            ) : null}
          </div>
        </Box>
      </Box>
      {showDock ? <MarketingConversionDock variant={conversionDockVariant} /> : null}
    </MarketingNeuFrame>
  );
}
