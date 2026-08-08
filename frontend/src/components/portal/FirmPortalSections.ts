import type { ReactNode } from "react";

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
