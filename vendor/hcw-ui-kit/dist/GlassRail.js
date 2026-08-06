import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * SoftRail — rail · stage spatial shell for portals / auth (opaque neumorphism).
 * Prefer this over {@link GlassRail} (deprecated alias).
 *
 * Widths/paddings come from {@link LAYOUT}.
 */
import { Box } from "@mui/material";
import { Surface } from "./Surface.js";
import { colors, LAYOUT } from "./tokens.js";
export function SoftRail({ rail, children, railAriaLabel = "Navigation", mainId = "esti-main", 
/** @deprecated Ignored — both map to opaque soft. Kept for GlassRail API parity. */
glass: _glass = "frost", sx, ...rest }) {
    void _glass;
    return (_jsxs(Box, { sx: {
            display: "flex",
            alignItems: "stretch",
            minHeight: "100vh",
            backgroundColor: colors.background,
            flexDirection: { xs: "column", md: "row" },
            ...sx,
        }, ...rest, children: [_jsx(Surface, { layer: "soft", component: "aside", "aria-label": railAriaLabel, sx: {
                    flex: { xs: "none", md: `0 0 ${LAYOUT.railWidth}px` },
                    width: { xs: "100%", md: LAYOUT.railWidth },
                    minHeight: { xs: 0, md: "100vh" },
                    position: { xs: "static", md: "sticky" },
                    top: 0,
                    alignSelf: { md: "flex-start" },
                    p: LAYOUT.railPadding,
                    borderInlineEnd: { md: `1px solid ${colors.borderSubtle}` },
                    borderBottom: { xs: `1px solid ${colors.borderSubtle}`, md: "none" },
                }, children: rail }), _jsx(Box, { component: "main", id: mainId, tabIndex: -1, sx: {
                    flex: 1,
                    minWidth: 0,
                    minHeight: { xs: "auto", md: "100vh" },
                    overflow: { xs: "visible", md: "auto" },
                    p: { xs: LAYOUT.stagePaddingXs, md: LAYOUT.stagePaddingMd },
                    pb: { xs: LAYOUT.stagePaddingBottomXs, md: LAYOUT.stagePaddingBottomMd },
                }, children: children })] }));
}
/** @deprecated Use {@link SoftRail}. Opaque soft alias of the former glass rail. */
export const GlassRail = SoftRail;
//# sourceMappingURL=GlassRail.js.map