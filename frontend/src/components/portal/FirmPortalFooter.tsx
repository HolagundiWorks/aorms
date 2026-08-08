import ArchitectureOutlined from "@mui/icons-material/ArchitectureOutlined";
import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import PowerSettingsNew from "@mui/icons-material/PowerSettingsNew";
import TimelineOutlined from "@mui/icons-material/TimelineOutlined";
import UpdateOutlined from "@mui/icons-material/UpdateOutlined";
import { Box, IconButton, Stack, Tooltip } from "@mui/material";
import { chromeIconSx } from "@hcw/ui-kit";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FloatingCalculator } from "../FloatingCalculator.js";
import { matchShellKey, tooltipWithChord } from "../../lib/keymap.js";
import {
  FIRM_PORTAL_SECTIONS,
  type FirmPortalSection,
} from "./FirmPortalSections.js";

const SECTION_ICON: Record<FirmPortalSection, ReactNode> = {
  updates: <UpdateOutlined />,
  project: <ArchitectureOutlined />,
  progress: <TimelineOutlined />,
  drawings: <FolderOutlined />,
  documents: <DescriptionOutlined />,
};

/**
 * Firm portal taskbar — same soft-neu footer language as staff `AppFooterBar`:
 *   LEFT   — calculator
 *   CENTER — section launchers (Updates · Project · Progress · Drawings · Documents)
 *   RIGHT  — power sign-out
 */
export function FirmPortalFooter({
  sections,
  section,
  onSectionChange,
  onSignOut,
  signingOut,
}: {
  sections: FirmPortalSection[];
  section: FirmPortalSection;
  onSectionChange?: (section: FirmPortalSection) => void;
  onSignOut?: () => void;
  signingOut?: boolean;
}) {
  const [showCalc, setShowCalc] = useState(false);
  const calcTriggerRef = useRef<HTMLButtonElement>(null);
  const tabDefs = FIRM_PORTAL_SECTIONS.filter((s) => sections.includes(s.id));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      matchShellKey(e, { calculator: () => setShowCalc((o) => !o) });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Box
      component="footer"
      className="esti-app-footer esti-portal-footer"
      aria-label="Portal taskbar"
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 1,
        }}
      >
        <Tooltip title={tooltipWithChord("Calculator", "calculator")}>
          <IconButton
            ref={calcTriggerRef}
            color={showCalc ? "primary" : "default"}
            onClick={() => setShowCalc((o) => !o)}
            aria-label="Calculator"
            sx={chromeIconSx}
          >
            <CalculateOutlined />
          </IconButton>
        </Tooltip>
      </Box>

      <Stack
        direction="row"
        spacing={0.5}
        className="esti-app-footer__launcher-anchor"
        sx={{ alignItems: "center" }}
        role="navigation"
        aria-label="Portal sections"
      >
        {tabDefs.map((s) => {
          const active = section === s.id;
          return (
            <Tooltip key={s.id} title={s.label}>
              <IconButton
                onClick={() => onSectionChange?.(s.id)}
                aria-label={s.label}
                aria-current={active ? "page" : undefined}
                color={active ? "primary" : "default"}
                sx={chromeIconSx}
              >
                {SECTION_ICON[s.id]}
              </IconButton>
            </Tooltip>
          );
        })}
      </Stack>

      <Stack
        direction="row"
        spacing={0.5}
        sx={{ alignItems: "center", flex: 1, justifyContent: "flex-end", minWidth: 0 }}
      >
        {onSignOut ? (
          <Tooltip title="Sign out">
            <span>
              <IconButton
                onClick={() => {
                  if (!signingOut) onSignOut();
                }}
                disabled={signingOut}
                aria-label="Sign out"
                sx={chromeIconSx}
              >
                <PowerSettingsNew />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
      </Stack>

      <FloatingCalculator
        open={showCalc}
        onClose={() => setShowCalc(false)}
        triggerRef={calcTriggerRef}
      />
    </Box>
  );
}
