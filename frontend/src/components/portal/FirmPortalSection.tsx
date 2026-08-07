import { Alert, Stack, Typography } from "@mui/material";
import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  FIRM_PORTAL_SECTIONS,
  type FirmPortalSection,
} from "./FirmPortalShell.js";

const FirmPortalSectionContext = createContext<FirmPortalSection>("updates");

export function FirmPortalSectionProvider({
  section,
  children,
}: {
  section: FirmPortalSection;
  children: ReactNode;
}) {
  return (
    <FirmPortalSectionContext.Provider value={section}>
      {children}
    </FirmPortalSectionContext.Provider>
  );
}

export function useFirmPortalSection(): FirmPortalSection {
  return useContext(FirmPortalSectionContext);
}

/** Render children only when the active portal tab matches `id`. */
export function PortalSection({
  id,
  children,
}: {
  id: FirmPortalSection;
  children: ReactNode;
}) {
  const section = useFirmPortalSection();
  if (section !== id) return null;
  return <>{children}</>;
}

const SECTION_HINT: Record<FirmPortalSection, string> = {
  updates: "Activity and status from hub metadata.",
  project: "Project summary and status from published meta.",
  progress: "Phase progress % and progress reports.",
  drawings: "READY drawings and issued transmittals.",
  documents: "Final docs and numbers — invoices, RA, estimate totals, approvals.",
};

/**
 * Stage body for firm portals: full children on Updates; other tabs show the
 * mapped slot when provided, else a hub-data placeholder (D4 follow-on).
 */
export function FirmPortalStage({
  children,
  panels,
}: {
  children: ReactNode;
  panels?: Partial<Record<FirmPortalSection, ReactNode>>;
}) {
  const section = useFirmPortalSection();
  if (section === "updates") return <>{children}</>;
  const panel = panels?.[section];
  if (panel) return <>{panel}</>;
  const label = FIRM_PORTAL_SECTIONS.find((s) => s.id === section)?.label ?? section;
  return (
    <Alert severity="info" variant="outlined" sx={{ borderRadius: "8px" }}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {SECTION_HINT[section]} Fed from hub published records only (
          <code>esti_meta_event</code> / <code>esti_sync_record</code>).
        </Typography>
      </Stack>
    </Alert>
  );
}
