import LogoutIcon from "@mui/icons-material/Logout";
import {
  Button,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { RADIUS } from "@hcw/ui-kit";
import type { ReactNode } from "react";
import { PortalNeuFrame } from "./PortalNeuFrame.js";
import { COMPOSITION_RHYTHM } from "../../lib/composition.js";
import { AORMS_PORTALS } from "../../lib/product-nomenclature.js";

const R8 = `${RADIUS}px`;

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

/** Updates always; other tabs only when a panel body is wired (S8/S10 honesty). */
export function visibleFirmPortalSections(
  panels?: Partial<Record<FirmPortalSection, ReactNode>> | null,
): FirmPortalSection[] {
  const ids: FirmPortalSection[] = ["updates"];
  if (!panels) return ids;
  for (const s of FIRM_PORTAL_SECTIONS) {
    if (s.id === "updates") continue;
    if (panels[s.id] != null) ids.push(s.id);
  }
  return ids;
}

export function FirmPortalShell({
  companyName,
  portalLabel,
  onSignOut,
  signingOut,
  section = "updates",
  onSectionChange,
  sections = FIRM_PORTAL_SECTIONS.map((s) => s.id),
  children,
}: {
  companyName?: string;
  portalLabel: string;
  onSignOut?: () => void;
  signingOut?: boolean;
  section?: FirmPortalSection;
  onSectionChange?: (section: FirmPortalSection) => void;
  /** Which chrome tabs to show — omit unused tabs instead of Alert stubs. */
  sections?: FirmPortalSection[];
  children: ReactNode;
}) {
  const tabDefs = FIRM_PORTAL_SECTIONS.filter((s) => sections.includes(s.id));
  const tabValue = sections.includes(section) ? section : "updates";

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
                {AORMS_PORTALS.external.suiteEyebrow} · {portalLabel}
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
                sx={{ flexShrink: 0, minHeight: 40, borderRadius: R8 }}
              >
                Sign out
              </Button>
            ) : null}
          </Stack>

          {tabDefs.length > 1 ? (
            <Tabs
              value={tabValue}
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
                  borderRadius: R8,
                },
              }}
            >
              {tabDefs.map((s) => (
                <Tab key={s.id} value={s.id} label={s.label} />
              ))}
            </Tabs>
          ) : null}
        </Stack>
      }
    >
      {children}
    </PortalNeuFrame>
  );
}
