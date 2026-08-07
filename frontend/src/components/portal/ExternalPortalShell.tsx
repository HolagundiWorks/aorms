import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FirmPortalShell,
  visibleFirmPortalSections,
  type FirmPortalSection,
} from "./FirmPortalShell.js";
import {
  FirmPortalSectionProvider,
  FirmPortalStage,
} from "./FirmPortalSection.js";

/**
 * Client / consultant / contractor / site portals — firm-branded soft neu shell.
 * Chrome tabs: Updates always; Project · Progress · Drawings · Documents only when
 * a panel body is passed (hide empties — ROADMAP S8 prep / S10).
 * Canon: docs/esti/PORTAL-SYNC-BRIDGE.md · docs/esti/FIRM-PORTAL-SECTIONS.md
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
  /** Per-tab bodies — omitting a key hides that chrome tab. */
  panels?: Partial<Record<FirmPortalSection, ReactNode>>;
  children: ReactNode;
}) {
  const [internalSection, setInternalSection] = useState<FirmPortalSection>("updates");
  const section = sectionProp ?? internalSection;
  const setSection = onSectionChange ?? setInternalSection;
  const sections = useMemo(() => visibleFirmPortalSections(panels), [panels]);

  useEffect(() => {
    if (!sections.includes(section)) setSection("updates");
  }, [section, sections, setSection]);

  const active = sections.includes(section) ? section : "updates";

  return (
    <FirmPortalShell
      companyName={companyName}
      portalLabel={portalLabel}
      onSignOut={onSignOut}
      signingOut={signingOut}
      section={active}
      onSectionChange={setSection}
      sections={sections}
    >
      <FirmPortalSectionProvider section={active}>
        <FirmPortalStage panels={panels}>{children}</FirmPortalStage>
      </FirmPortalSectionProvider>
    </FirmPortalShell>
  );
}
