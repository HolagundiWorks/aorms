import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Surface — depth primitive. Pick the layer by ROLE (Constitution Art. V):
 *
 *   layer="flat"         → information at rest
 *   layer="soft"         → soft raised neu (objects / chrome)
 *   layer="glass"        → @deprecated alias of soft raised (opaque)
 *   layer="clearGlass"   → @deprecated alias of soft raised
 *   layer="headingGlass" → @deprecated soft raised + accent left rule
 *
 * Global corner radius: {@link RADIUS} (8px). No glass / blur / transparency.
 */
import { Box } from "@mui/material";
import { LAYERS, RADIUS } from "./tokens.js";
const CORNER = { borderRadius: RADIUS };
export function Surface({ layer = "flat", sx, ...rest }) {
    return (_jsx(Box, { className: "hcw-surface", sx: [LAYERS[layer], CORNER, ...(sx == null ? [] : Array.isArray(sx) ? sx : [sx]), CORNER], ...rest }));
}
export default Surface;
//# sourceMappingURL=Surface.js.map