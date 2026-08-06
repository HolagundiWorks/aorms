import { type FatigueOffer } from "./fatigue.js";
export type FatigueOfferBannerProps = {
    /** Controlled signal; defaults to latest emitted `ux.fatigue_signal`. */
    signal?: FatigueOffer | null;
    offer?: string;
    title?: string;
    onEnableCalm?: () => void;
    onDismiss?: () => void;
    calmLabel?: string;
    dismissLabel?: string;
};
export declare function FatigueOfferBanner({ signal, offer, title, onEnableCalm, onDismiss, calmLabel, dismissLabel, }: FatigueOfferBannerProps): import("react").JSX.Element | null;
export default FatigueOfferBanner;
//# sourceMappingURL=FatigueOfferBanner.d.ts.map