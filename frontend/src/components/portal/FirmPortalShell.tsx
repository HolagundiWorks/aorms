import LogoutIcon from "@mui/icons-material/Logout";
import {
  Button,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import { PortalNeuFrame } from "./PortalNeuFrame.js";
import { COMPOSITION_RHYTHM } from "../../lib/composition.js";

/** Firm portal IA — read-mostly; thin writes stay inside section bodies. */
export type FirmPortalSection =
  | "updates"
  | "project"
  | "progress"
  | "drawings"
  | "documents";

export const FIRM_PORTAL_SECTIONS: {
  id: FirmPortalSection;
  label: string;
}[] = [
  { id: "updates", label: "Updates" },
  { id: "project", label: "Project" },
  { id: "progress", label: "Progress" },
  { id: "drawings", label: "Drawings" },
  { id: "documents", label: "Documents" },
];

/**
 * Firm-branded portal chrome (P0) — soft neu top bar, firm identity, section nav.
 * No staff ribbon / ActionDock. Data must come from hub published records only.
 * Canon: docs/esti/PORTAL-SYNC-BRIDGE.md · AORMS-SURFACE-URLS.md
 */
export function FirmPortalShell({
  companyName,
  portalLabel,
  onSignOut,
  signingOut,
  section = "updates",
  onSectionChange,
  children,
}: {
  companyName?: string;
  portalLabel: string;
  onSignOut?: () => void;
  signingOut?: boolean;
  section?: FirmPortalSection;
  onSectionChange?: (section: FirmPortalSection) => void;
  children: ReactNode;
}) {
  return (
    <PortalNeuFrame
      topBar={
        <Stack spacing={COMPOSITION_RHYTHM.sm} sx={{ width: "100%", minWidth: 0 }}>
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
                {companyName ?? portalLabel}
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

          <Tabs
            value={section}
            onChange={(_, value: FirmPortalSection) => onSectionChange?.(value)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Portal sections"
            sx={{
              minHeight: 40,
              "& .MuiTab-root": {
                minHeight: 40,
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "8px",
              },
            }}
          >
            {FIRM_PORTAL_SECTIONS.map((s) => (
              <Tab key={s.id} value={s.id} label={s.label} />
            ))}
          </Tabs>
        </Stack>
      }
    >
      {children}
    </PortalNeuFrame>
  );
}
