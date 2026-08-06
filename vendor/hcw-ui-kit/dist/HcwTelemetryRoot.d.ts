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
import { type ReactNode } from "react";
export type HcwTelemetryRootProps = {
    children: ReactNode;
    /** Start fatigue session on mount (default true). */
    startSession?: boolean;
    /** Render {@link FatigueOfferBanner} above children. */
    fatigueOffer?: boolean;
    onEnableCalm?: () => void;
    onDismissFatigue?: () => void;
};
export declare function HcwTelemetryRoot({ children, startSession, fatigueOffer, onEnableCalm, onDismissFatigue, }: HcwTelemetryRootProps): import("react").JSX.Element;
export default HcwTelemetryRoot;
//# sourceMappingURL=HcwTelemetryRoot.d.ts.map