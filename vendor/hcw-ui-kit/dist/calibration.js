/**
 * Explanatory (not yet calibrated) orientation-impact estimates.
 * Use for hypothesis dashboards; replace coefficients after V3 studies
 * (docs/esti/HCW-UX-CALIBRATION.md).
 */
import { CAPACITY, FATIGUE, INTERRUPTION } from "./tokens.js";
/**
 * Relative orientation-time multiplier vs a calm baseline (1.0).
 * Heuristic only — not a published predictive model.
 */
export function estimateOrientMultiplier(input) {
    let m = 1;
    const chunks = input.workingChunks ?? 0;
    if (chunks > CAPACITY.workingMemoryChunks) {
        m += 0.12 * (chunks - CAPACITY.workingMemoryChunks);
    }
    const interrupts = input.interruptsLastHour ?? 0;
    if (interrupts > FATIGUE.interruptPerHourWarn) {
        m += 0.08 * (interrupts - FATIGUE.interruptPerHourWarn);
    }
    else if (interrupts > INTERRUPTION.maxConcurrentToasts) {
        m += 0.03 * interrupts;
    }
    const pending = input.pendingDecisions ?? 0;
    if (pending > FATIGUE.pendingDecisionsWarn) {
        m += 0.05 * (pending - FATIGUE.pendingDecisionsWarn);
    }
    return Math.min(2.5, Math.round(m * 100) / 100);
}
/** Suggest whether a product dashboard should flag “load risk”. */
export function isLoadRisk(input) {
    return estimateOrientMultiplier(input) >= 1.25;
}
//# sourceMappingURL=calibration.js.map