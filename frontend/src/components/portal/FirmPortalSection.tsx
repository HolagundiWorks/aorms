import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { type FirmPortalSection } from "./FirmPortalShell.js";

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

/**
 * Stage body for firm portals: Updates = children; other tabs = wired panels only.
 * Unused tabs are hidden in chrome (`visibleFirmPortalSections`) — no Alert stubs.
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
  return null;
}
