import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * FatigueOfferBanner — soft, dismissible offer when operational-load proxies fire.
 * Never blocks work. Prefer COGA calm / pause; P0 safety interrupts stay separate.
 *
 *   <FatigueOfferBanner onEnableCalm={() => setCoga("calm")} />
 *   // or controlled:
 *   <FatigueOfferBanner signal={assessment} offer={suggestFatigueCopy(kind)} />
 */
import { Alert, AlertTitle, Box, Button } from "@mui/material";
import { useEffect, useState } from "react";
import { clearLatestFatigueOffer, getLatestFatigueOffer, subscribeFatigueOffer, } from "./fatigue.js";
import { VOICE } from "./tokens.js";
export function FatigueOfferBanner({ signal, offer, title = "A lighter pace may help", onEnableCalm, onDismiss, calmLabel = "Try calm mode", dismissLabel = VOICE.cancelLabel, }) {
    const [auto, setAuto] = useState(() => getLatestFatigueOffer());
    useEffect(() => subscribeFatigueOffer(setAuto), []);
    const active = signal !== undefined ? signal : auto;
    if (!active)
        return null;
    const body = offer ?? active.offer ?? VOICE.fatiguePauseOffer;
    return (_jsx(Box, { sx: { mb: 2 }, role: "status", "data-fatigue-kind": active.kind, "data-fatigue-level": active.level, children: _jsxs(Alert, { severity: "info", variant: "outlined", onClose: () => {
                clearLatestFatigueOffer();
                onDismiss?.();
            }, action: _jsxs(Box, { sx: { display: "flex", gap: 0.5, alignItems: "center" }, children: [onEnableCalm ? (_jsx(Button, { color: "inherit", size: "small", onClick: () => {
                            onEnableCalm();
                            clearLatestFatigueOffer();
                        }, children: calmLabel })) : null, _jsx(Button, { color: "inherit", size: "small", onClick: () => {
                            clearLatestFatigueOffer();
                            onDismiss?.();
                        }, children: dismissLabel })] }), children: [_jsx(AlertTitle, { children: title }), body] }) }));
}
export default FatigueOfferBanner;
//# sourceMappingURL=FatigueOfferBanner.js.map