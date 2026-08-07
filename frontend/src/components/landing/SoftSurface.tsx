import { Surface } from "@hcw/ui-kit";
import type { ComponentProps } from "react";

type SurfaceProps = ComponentProps<typeof Surface>;

/** Soft Surface alias — always elevated (neumorphic raised). */
export function SoftSurface({ className, layer = "soft", ...rest }: SurfaceProps) {
  const cls = ["hcw-surface", className].filter(Boolean).join(" ");
  return <Surface layer={layer} className={cls} {...rest} />;
}
