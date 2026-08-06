export type LoadInputs = {
    /** Concurrent chrome chunks vs Cowan. */
    workingChunks?: number;
    /** Judgment+blocker+error interrupts in the last active hour. */
    interruptsLastHour?: number;
    /** Open pending decisions. */
    pendingDecisions?: number;
};
/**
 * Relative orientation-time multiplier vs a calm baseline (1.0).
 * Heuristic only — not a published predictive model.
 */
export declare function estimateOrientMultiplier(input: LoadInputs): number;
/** Suggest whether a product dashboard should flag “load risk”. */
export declare function isLoadRisk(input: LoadInputs): boolean;
//# sourceMappingURL=calibration.d.ts.map