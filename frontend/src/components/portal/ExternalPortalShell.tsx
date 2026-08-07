import { useState, type ReactNode } from "react";
import {
  FirmPortalShell,
  type FirmPortalSection,
} from "./FirmPortalShell.js";

/**
 * Client / consultant / contractor / site portals — firm-branded soft neu shell.
 * Section nav: Updates · Project · Progress · Drawings · Documents.
 * No ActionDock. Canon: docs/esti/PORTAL-SYNC-BRIDGE.md
 */
export function ExternalPortalShell({
  companyName,
  portalLabel,
  onSignOut,
  signingOut,
  section: sectionProp,
  onSectionChange,
  children,
}: {
  companyName?: string;
  portalLabel: string;
  onSignOut?: () => void;
  signingOut?: boolean;
  /** Controlled section; defaults to internal Updates state. */
  section?: FirmPortalSection;
  onSectionChange?: (section: FirmPortalSection) => void;
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
      {children}
    </FirmPortalShell>
  );
}
