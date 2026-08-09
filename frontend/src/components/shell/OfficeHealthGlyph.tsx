import { HealthGlassOrb } from "@hcw/ui-kit";
import type { ZoneState } from "../dashboard/zoneState.js";

/**
 * Office-health indicator — thin app wrapper over kit `HealthGlassOrb`.
 * Pure neumorphism: always `flat` (glass/blur banned on staff chrome).
 */
export function OfficeHealthGlyph({
  state,
  size = 14,
  title,
}: {
  state: ZoneState;
  size?: number;
  title?: string;
}) {
  return (
    <HealthGlassOrb
      state={state}
      size={size}
      title={title ?? `Office health: ${state}`}
      variant="flat"
    />
  );
}
