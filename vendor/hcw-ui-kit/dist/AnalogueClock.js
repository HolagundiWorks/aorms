import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * AnalogueClock — recessed neumorphic face, thin markers, live hands.
 * Product mounts fixed bottom-right; footer digital TrayClock stays separate.
 */
import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { NEU_FILL, NEU_INSET, colors, RADIUS } from "./tokens.js";
function useNow(ms = 1000) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), ms);
        return () => window.clearInterval(id);
    }, [ms]);
    return now;
}
export function AnalogueClock({ size = 120, showSeconds = true, sx, ...rest }) {
    // Sub-second tick keeps the minute hand aligned with real time (m*6 + s*0.1).
    const now = useNow(showSeconds ? 250 : 15_000);
    const h = now.getHours() % 12;
    const m = now.getMinutes();
    const s = now.getSeconds() + now.getMilliseconds() / 1000;
    const hourDeg = h * 30 + m * 0.5 + s * (0.5 / 60);
    const minDeg = m * 6 + s * 0.1;
    const secDeg = s * 6;
    const face = size * 0.78;
    const tickLen = face * 0.1;
    const tickReach = face * 0.42;
    return (_jsx(Box, { role: "img", "aria-label": `Analogue clock showing ${now.toLocaleTimeString()}`, sx: {
            width: size,
            height: size,
            borderRadius: "50%",
            backgroundColor: NEU_FILL,
            boxShadow: NEU_INSET,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            ...sx,
        }, ...rest, children: _jsxs(Box, { sx: {
                position: "relative",
                width: face,
                height: face,
                borderRadius: "50%",
                backgroundColor: colors.layer01,
                boxShadow: "4px 4px 10px rgba(20,21,23,0.12), -4px -4px 10px rgba(255,255,255,0.9)",
            }, children: [[0, 90, 180, 270].map((deg) => (_jsx(Box, { "aria-hidden": true, sx: {
                        position: "absolute",
                        left: "50%",
                        bottom: "50%",
                        width: "1.5px",
                        height: `${tickLen}px`,
                        ml: "-0.75px",
                        backgroundColor: colors.borderStrong,
                        transformOrigin: "50% 100%",
                        transform: `rotate(${deg}deg) translateY(-${tickReach - tickLen}px)`,
                        borderRadius: `${RADIUS / 4}px`,
                    } }, deg))), _jsx(Hand, { length: face * 0.28, width: 2.5, deg: hourDeg, color: colors.ink }), _jsx(Hand, { length: face * 0.38, width: 2, deg: minDeg, color: colors.ink }), showSeconds ? _jsx(Hand, { length: face * 0.42, width: 1, deg: secDeg, color: colors.accent }) : null, _jsx(Box, { "aria-hidden": true, sx: {
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        backgroundColor: colors.ink,
                        transform: "translate(-50%, -50%)",
                        zIndex: 1,
                    } })] }) }));
}
/** Hand grows upward from the dial centre; rotate(0) = 12 o'clock. */
function Hand({ length, width, deg, color, }) {
    return (_jsx(Box, { "aria-hidden": true, sx: {
            position: "absolute",
            left: "50%",
            bottom: "50%",
            width: `${width}px`,
            height: `${length}px`,
            ml: `${-width / 2}px`,
            backgroundColor: color,
            borderRadius: `${width}px`,
            transformOrigin: "50% 100%",
            transform: `rotate(${deg}deg)`,
            willChange: "transform",
        } }));
}
export default AnalogueClock;
//# sourceMappingURL=AnalogueClock.js.map