import LogoutIcon from "@mui/icons-material/Logout";
import { Button, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { AORMS_PORTALS } from "../../lib/product-nomenclature.js";
import { PortalNeuFrame } from "./PortalNeuFrame.js";

/**
 * Client / consultant / contractor / site portals — no-rail soft neu frame.
 * Identity + sign-out in the top bar; stage scrolls below. No ActionDock.
 */
export function ExternalPortalShell({
  companyName,
  portalLabel,
  onSignOut,
  signingOut,
  children,
}: {
  companyName?: string;
  portalLabel: string;
  onSignOut?: () => void;
  signingOut?: boolean;
  children: ReactNode;
}) {
  return (
    <PortalNeuFrame
      topBar={
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            minWidth: 0,
            minHeight: 40,
          }}
        >
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
              {portalLabel}
            </Typography>
            <Typography
              variant="subtitle1"
              component="p"
              sx={{ m: 0, fontWeight: 700, wordBreak: "break-word" }}
            >
              {companyName ?? AORMS_PORTALS.studio.railFallback}
            </Typography>
          </Stack>
          {onSignOut ? (
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<LogoutIcon />}
              disabled={signingOut}
              onClick={() => {
                if (!signingOut) onSignOut();
              }}
              sx={{ flexShrink: 0, minHeight: 40, borderRadius: "8px" }}
            >
              Sign out
            </Button>
          ) : null}
        </Stack>
      }
    >
      {children}
    </PortalNeuFrame>
  );
}
