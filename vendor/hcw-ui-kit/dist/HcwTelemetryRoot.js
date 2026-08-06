import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * HcwTelemetryRoot — optional product bootstrap for KPI session + fatigue offer.
 * Compose under {@link KitRoot}. Does not replace theme/locale.
 *
 *   <KitRoot coga={coga}>
 *     <HcwTelemetryRoot fatigueOffer onEnableCalm={() => setCoga("calm")}>
 *       <App />
 *     </HcwTelemetryRoot>
 *   </KitRoot>
 */
import { useEffect } from "react";
import { FatigueOfferBanner } from "./FatigueOfferBanner.js";
import { startFatigueSession } from "./fatigue.js";
export function HcwTelemetryRoot({ children, startSession = true, fatigueOffer = false, onEnableCalm, onDismissFatigue, }) {
    useEffect(() => {
        if (startSession)
            startFatigueSession();
    }, [startSession]);
    return (_jsxs(_Fragment, { children: [fatigueOffer ? (_jsx(FatigueOfferBanner, { onEnableCalm: onEnableCalm, onDismiss: onDismissFatigue })) : null, children] }));
}
export default HcwTelemetryRoot;
//# sourceMappingURL=HcwTelemetryRoot.js.map