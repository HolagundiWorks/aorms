import type { ReactNode } from "react";
import { Tag } from "@carbon/react";

/**
 * Wave 2 adapter — kit `StatusDot` API → stock Carbon `<Tag>`.
 *
 * Drop-in for `@hcw/ui-kit`'s StatusDot so call-sites migrate by import swap
 * (docs/esti/CARBON-MIGRATION.md § Wave 2). Per § 0 (pure Carbon) this renders
 * a stock `Tag` — the kit's dot+label becomes a Carbon status tag. The kit's
 * named colours map 1:1 onto Carbon Tag `type`s; unknown/raw colours fall back
 * to `gray` (Tag does not take arbitrary colours — no forking).
 */
export type StatusShape = "circle" | "triangle" | "square";

type TagType =
  | "red" | "magenta" | "purple" | "blue" | "cyan" | "teal" | "green"
  | "gray" | "cool-gray" | "warm-gray" | "high-contrast" | "outline";

const TAG_TYPES = new Set<TagType>([
  "red", "magenta", "purple", "blue", "cyan", "teal", "green",
  "gray", "cool-gray", "warm-gray", "high-contrast", "outline",
]);

export function StatusDot({
  color = "gray",
  label,
  size = "sm",
}: {
  color?: string;
  label: ReactNode;
  size?: "sm" | "md";
  /** Accepted for API parity with the kit; Carbon Tag has no shape channel. */
  shape?: StatusShape;
}) {
  const type: TagType = TAG_TYPES.has(color as TagType) ? (color as TagType) : "gray";
  return (
    <Tag type={type} size={size === "md" ? "md" : "sm"}>
      {label}
    </Tag>
  );
}

/** API-parity shim for the kit helper — maps a severity to a nominal shape. */
export function statusShapeFor(severity: string): StatusShape {
  if (severity === "error" || severity === "critical") return "triangle";
  if (severity === "warning") return "square";
  return "circle";
}

export default StatusDot;
