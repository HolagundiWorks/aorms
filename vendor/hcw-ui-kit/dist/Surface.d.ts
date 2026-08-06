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
import { type BoxProps } from "@mui/material";
import { type SurfaceLayer } from "./tokens.js";
export type { SurfaceLayer };
export declare function Surface({ layer, sx, ...rest }: {
    layer?: SurfaceLayer;
} & BoxProps): import("react").JSX.Element;
export default Surface;
//# sourceMappingURL=Surface.d.ts.map