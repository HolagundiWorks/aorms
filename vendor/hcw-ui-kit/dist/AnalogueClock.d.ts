/**
 * AnalogueClock — recessed neumorphic face, thin markers, live hands.
 * Product mounts fixed bottom-right; footer digital TrayClock stays separate.
 */
import { type BoxProps } from "@mui/material";
export type AnalogueClockProps = {
    /** Outer diameter in px (default 120). */
    size?: number;
    /** Show seconds hand (default true). */
    showSeconds?: boolean;
} & Omit<BoxProps, "children">;
export declare function AnalogueClock({ size, showSeconds, sx, ...rest }: AnalogueClockProps): import("react").JSX.Element;
export default AnalogueClock;
//# sourceMappingURL=AnalogueClock.d.ts.map