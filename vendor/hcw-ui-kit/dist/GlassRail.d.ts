/**
 * SoftRail — rail · stage spatial shell for portals / auth (opaque neumorphism).
 * Prefer this over {@link GlassRail} (deprecated alias).
 *
 * Widths/paddings come from {@link LAYOUT}.
 */
import { type BoxProps } from "@mui/material";
import type { ReactNode } from "react";
export declare function SoftRail({ rail, children, railAriaLabel, mainId, 
/** @deprecated Ignored — both map to opaque soft. Kept for GlassRail API parity. */
glass: _glass, sx, ...rest }: {
    rail: ReactNode;
    children: ReactNode;
    railAriaLabel?: string;
    mainId?: string;
    glass?: "frost" | "clear";
} & Omit<BoxProps, "children">): import("react").JSX.Element;
/** @deprecated Use {@link SoftRail}. Opaque soft alias of the former glass rail. */
export declare const GlassRail: typeof SoftRail;
//# sourceMappingURL=GlassRail.d.ts.map