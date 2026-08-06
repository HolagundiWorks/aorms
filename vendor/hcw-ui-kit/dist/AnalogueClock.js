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
    const now = useNow(showSeconds ? 1000 : 15_000);
    const h = now.getHours() % 12;
    const m = now.getMinutes();
    const s = now.getSeconds();
    const hourDeg = h * 30 + m * 0.5;
    const minDeg = m * 6 + s * 0.1;
    const secDeg = s * 6;
    const face = size * 0.78;
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
            }, children: [[0, 90, 180, 270].map((deg) => (_jsx(Box, { sx: {
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: 1.5,
                        height: face * 0.12,
                        ml: "-0.75px",
                        mt: `${-face * 0.06}px`,
                        backgroundColor: colors.borderStrong,
                        transformOrigin: `50% ${face / 2}px`,
                        transform: `rotate(${deg}deg) translateY(${-face / 2 + face * 0.08}px)`,
                        borderRadius: RADIUS / 4,
                    } }, deg))), _jsx(Hand, { length: face * 0.28, width: 2.5, deg: hourDeg, color: colors.ink }), _jsx(Hand, { length: face * 0.38, width: 2, deg: minDeg, color: colors.ink }), showSeconds ? _jsx(Hand, { length: face * 0.42, width: 1, deg: secDeg, color: colors.accent }) : null, _jsx(Box, { sx: {
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        backgroundColor: colors.ink,
                        transform: "translate(-50%, -50%)",
                    } })] }) }));
}
function Hand({ length, width, deg, color, }) {
    return (_jsx(Box, { sx: {
            position: "absolute",
            left: "50%",
            top: "50%",
            width,
            height: length,
            ml: `${-width / 2}px`,
            mt: `${-length}px`,
            backgroundColor: color,
            borderRadius: width,
            transformOrigin: "50% 100%",
            transform: `rotate(${deg}deg)`,
        } }));
}
export default AnalogueClock;
//# sourceMappingURL=AnalogueClock.js.map