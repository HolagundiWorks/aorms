import { useState, type ReactNode } from "react";
import {
  FirmPortalShell,
  type FirmPortalSection,
} from "./FirmPortalShell.js";
import {
  FirmPortalSectionProvider,
  FirmPortalStage,
} from "./FirmPortalSection.js";

/**
 * Client / consultant / contractor / site portals — firm-branded soft neu shell.
 * Section nav: Updates · Project · Progress · Drawings · Documents.
 * Updates shows full stage children; other tabs use optional panels or hub placeholders.
 * Canon: docs/esti/PORTAL-SYNC-BRIDGE.md
 */
export function ExternalPortalShell({
  companyName,
  portalLabel,
  onSignOut,
  signingOut,
  section: sectionProp,
  onSectionChange,
  panels,
  children,
}: {
  companyName?: string;
  portalLabel: string;
  onSignOut?: () => void;
  signingOut?: boolean;
  section?: FirmPortalSection;
  onSectionChange?: (section: FirmPortalSection) => void;
  /** Optional per-tab bodies (Progress / Drawings / Documents…). */
  panels?: Partial<Record<FirmPortalSection, ReactNode>>;
  children: ReactNode;
}) {
  const [internalSection, setInternalSection] = useState<FirmPortalSection>("updates");
  const section = sectionProp ?? internalSection;
  const setSection = onSectionChange ?? setInternalSection;

  return (
    <FirmPortalShell
      companyName={companyName}
      portalLabel={portalLabel}
      onSignOut={onSignOut}
      signingOut={signingOut}
      section={section}
      onSectionChange={setSection}
    >
      <FirmPortalSectionProvider section={section}>
        <FirmPortalStage panels={panels}>{children}</FirmPortalStage>
      </FirmPortalSectionProvider>
    </FirmPortalShell>
  );
}
