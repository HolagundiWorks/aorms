import { Box, Button, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { AormsLogo } from "../AormsLogo.js";
import { MarketingHomeLink } from "../landing/MarketingHomeLink.js";
import { AORMS_PORTALS } from "../../lib/product-nomenclature.js";
import { COMPOSITION_RHYTHM } from "../../lib/composition.js";
import { PortalNeuFrame } from "./PortalNeuFrame.js";

export type PortalNavKey = "account" | "company" | "licensing" | "workspace";

const NAV: { key: PortalNavKey; label: string; href: string; external?: boolean }[] = [
  { key: "account", label: AORMS_PORTALS.account.personal, href: "/account" },
  { key: "company", label: AORMS_PORTALS.account.company, href: "/company-account" },
  { key: "licensing", label: AORMS_PORTALS.account.licensing, href: "/platform-admin" },
  {
    key: "workspace",
    label: AORMS_PORTALS.studio.navLabel,
    href: `${AORMS_PORTALS.studio.url}/login`,
    external: true,
  },
];

/**
 * AORMS account / company / licensing hub — no-rail soft neu frame.
 * Horizontal nav in the top bar; stage scrolls below.
 */
export function PortalShell({
  active,
  children,
  showCompanyNav = false,
  showLicensingNav = false,
  footer,
}: {
  active: PortalNavKey;
  children: ReactNode;
  /** Show company nav link (owners). */
  showCompanyNav?: boolean;
  /** Show licensing console link (platform admins). */
  showLicensingNav?: boolean;
  /** Sign-out / tray actions — right side of the top bar. */
  footer?: ReactNode;
}) {
  const location = useLocation();
  const isAdminHost =
    /^\/platform-admin/.test(location.pathname) || /^admin\./.test(window.location.hostname);

  const links = NAV.filter((item) => {
    if (item.key === "company" && !showCompanyNav) return false;
    if (item.key === "licensing" && !showLicensingNav) return false;
    return true;
  });

  return (
    <PortalNeuFrame
      topBar={
        <>
          <Stack
            direction="row"
            spacing={COMPOSITION_RHYTHM.sm}
            sx={{ alignItems: "center", justifyContent: "space-between", width: "100%", minWidth: 0 }}
          >
            <Stack
              direction="row"
              spacing={COMPOSITION_RHYTHM.sm}
              sx={{ alignItems: "center", minWidth: 0 }}
            >
              <MarketingHomeLink
                style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}
              >
                <AormsLogo variant="rail" />
              </MarketingHomeLink>
              <Typography
                variant="caption"
                color="text.secondary"
                className="esti-label esti-label--secondary"
                sx={{ display: { xs: "none", sm: "block" }, letterSpacing: "0.04em" }}
              >
                {AORMS_PORTALS.account.hubCaption}
              </Typography>
            </Stack>
            {footer ? <Box sx={{ flexShrink: 0 }}>{footer}</Box> : null}
          </Stack>

          <Stack
            component="nav"
            aria-label="Account navigation"
            direction="row"
            spacing={COMPOSITION_RHYTHM.xs}
            useFlexGap
            sx={{ flexWrap: "wrap", alignItems: "center", width: "100%", gap: 0.5 }}
          >
            {links.map((item) => {
              const selected = item.key === active;
              const href =
                item.key === "licensing" && isAdminHost ? "/platform-admin" : item.href;
              return (
                <Button
                  key={item.key}
                  component={item.external ? "a" : RouterLink}
                  {...(item.external ? { href } : { to: href })}
                  size="small"
                  variant={selected ? "contained" : "text"}
                  color={selected ? "primary" : "inherit"}
                  aria-current={selected ? "page" : undefined}
                  sx={{ borderRadius: "8px", textTransform: "none", minHeight: 44 }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Stack>
        </>
      }
    >
      {children}
    </PortalNeuFrame>
  );
}
