import { Box } from "@mui/material";
import { type ReactNode, useEffect } from "react";
import { useLpReveal } from "../../lib/use-lp-reveal.js";
import { LandingContours } from "./LandingContours.js";
import { MarketingFooter } from "./MarketingFooter.js";
import { MarketingLandingDock } from "./MarketingLandingDock.js";
import { MarketingNeuFrame } from "./MarketingTopBar.js";

/**
 * Marketing shell — soft-neu brand header + Fog Gray stage + landing action dock
 * (Calculator · Blog · Downloads · Home). Opaque neu — no glass/blur chrome.
 */
export function MarketingShell({
  children,
  contours,
  wiki: _wiki,
  tagline: _tagline,
  vertical = "platform",
  footerVariant,
  visitCount,
  showFooter = true,
}: {
  children: ReactNode;
  contours?: boolean;
  wiki?: boolean;
  tagline?: string;
  vertical?: "platform" | "architecture";
  footerVariant?: "platform" | "architecture";
  visitCount?: number | null;
  showFooter?: boolean;
}) {
  useLpReveal();

  useEffect(() => {
    document.body.style.overflow = "";
  }, []);

  const foot = footerVariant ?? vertical;

  return (
    <MarketingNeuFrame mainId="lp2-main">
      <Box
        className="esti-lp esti-lp-neu esti-mkt-shell"
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          width: 1,
          px: { xs: 1.5, md: 2 },
          pb: 10,
          bgcolor: "background.default",
        }}
      >
        <Box
          className="esti-dash-stage esti-mkt-stage"
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            bgcolor: "background.default",
          }}
        >
          {contours ? (
            <div className="lp2-stage__contours" aria-hidden>
              <LandingContours />
            </div>
          ) : null}
          <div className="esti-mkt-content">
            {children}
            {showFooter ? (
              <MarketingFooter visitCount={visitCount} variant={foot} />
            ) : null}
          </div>
        </Box>
      </Box>
      <MarketingLandingDock sections={[]} />
    </MarketingNeuFrame>
  );
}
