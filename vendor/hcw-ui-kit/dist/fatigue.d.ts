/**
 * Operational fatigue trackers — proxy signals for load under time pressure.
 * Not a medical or wellness diagnosis. Emits `ux.fatigue_signal` so products
 * can offer {@link VOICE} pause/calm copy or COGA calm — never force stop.
 *
 * Observes existing KPI events (interrupt · capacity_warn · decision · orient)
 * when {@link installFatigueTracking} runs (called from package entry).
 */
export type FatigueKind = "interrupt_density" | "capacity_burst" | "session_duration" | "decision_backlog" | "long_pending_decision" | "orient_slowing";
export type FatigueLevel = "watch" | "elevated";
export type FatigueAssessment = {
    kind: FatigueKind;
    level: FatigueLevel;
    detail?: Record<string, unknown>;
};
export type FatigueOffer = FatigueAssessment & {
    offer: string;
    at: number;
};
export declare function getLatestFatigueOffer(): FatigueOffer | null;
export declare function clearLatestFatigueOffer(): void;
export declare function subscribeFatigueOffer(fn: (offer: FatigueOffer | null) => void): () => void;
/** Start (or restart) a fatigue-observation session. */
export declare function startFatigueSession(now?: number): void;
/** Clear session state (tests / logout). */
export declare function resetFatigueSession(): void;
export declare function getFatigueSnapshot(now?: number): {
    sessionStartedAt: number | null;
    sessionActiveMs: number;
    interruptsLastHour: number;
    capacityWarnsInWindow: number;
    pendingDecisions: number;
    orientSampleCount: number;
};
/** Invitational copy for a fatigue kind — product may show as soft banner. */
export declare function suggestFatigueCopy(kind: FatigueKind): string;
export declare function evaluateFatigue(now?: number): FatigueAssessment[];
/** Evaluate and emit cooled `ux.fatigue_signal` events. Returns assessments found. */
export declare function pulseFatigueSession(now?: number): FatigueAssessment[];
/** Wire observer once — safe to call repeatedly. */
export declare function installFatigueTracking(): void;
/** Test-only. */
export declare function resetFatigueTrackingInstall(): void;
//# sourceMappingURL=fatigue.d.ts.map