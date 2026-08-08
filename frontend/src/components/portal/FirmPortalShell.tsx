import { Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { PortalNeuFrame } from "./PortalNeuFrame.js";
import { FirmPortalFooter } from "./FirmPortalFooter.js";
import {
  FIRM_PORTAL_SECTIONS,
  visibleFirmPortalSections,
  type FirmPortalSection,
} from "./FirmPortalSections.js";
import { COMPOSITION_RHYTHM } from "../../lib/composition.js";
import { AORMS_PORTALS } from "../../lib/product-nomenclature.js";

export type { FirmPortalSection };
export { FIRM_PORTAL_SECTIONS, visibleFirmPortalSections };

/**
 * Firm-branded portal chrome — soft top identity bar + taskbar footer
 * (calc · section nav · power sign-out), matching staff `AppFooterBar` language.
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
  const tabValue = sections.includes(section) ? section : "updates";

  return (
    <PortalNeuFrame
      topBar={
        <Stack
          direction="row"
          spacing={COMPOSITION_RHYTHM.sm}
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
        </Stack>
      }
      footer={
        <FirmPortalFooter
          sections={sections}
          section={tabValue}
          onSectionChange={onSectionChange}
          onSignOut={onSignOut}
          signingOut={signingOut}
        />
      }
    >
      {children}
    </PortalNeuFrame>
  );
}
