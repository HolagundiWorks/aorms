/**
 * Operational fatigue trackers — proxy signals for load under time pressure.
 * Not a medical or wellness diagnosis. Emits `ux.fatigue_signal` so products
 * can offer {@link VOICE} pause/calm copy or COGA calm — never force stop.
 *
 * Observes existing KPI events (interrupt · capacity_warn · decision · orient)
 * when {@link installFatigueTracking} runs (called from package entry).
 */
import { FATIGUE, VOICE } from "./tokens.js";
import { addUxEventObserver, logUxEvent, } from "./uxEvents.js";
const state = {
    startedAt: null,
    interruptAt: [],
    capacityWarnAt: [],
    pendingDecisionIds: new Set(),
    pendingOpenedAt: new Map(),
    orientSamples: [],
    lastSignalAt: new Map(),
};
let latestOffer = null;
const offerSubs = new Set();
export function getLatestFatigueOffer() {
    return latestOffer;
}
export function clearLatestFatigueOffer() {
    latestOffer = null;
    offerSubs.forEach((fn) => fn(null));
}
export function subscribeFatigueOffer(fn) {
    offerSubs.add(fn);
    return () => {
        offerSubs.delete(fn);
    };
}
function setLatestOffer(offer) {
    latestOffer = offer;
    offerSubs.forEach((fn) => fn(offer));
}
let installed = false;
function pruneOlderThan(times, windowMs, now) {
    const floor = now - windowMs;
    return times.filter((t) => t >= floor);
}
/** Start (or restart) a fatigue-observation session. */
export function startFatigueSession(now = Date.now()) {
    state.startedAt = now;
    state.interruptAt = [];
    state.capacityWarnAt = [];
    state.pendingDecisionIds.clear();
    state.pendingOpenedAt.clear();
    state.orientSamples = [];
    state.lastSignalAt.clear();
}
/** Clear session state (tests / logout). */
export function resetFatigueSession() {
    state.startedAt = null;
    state.interruptAt = [];
    state.capacityWarnAt = [];
    state.pendingDecisionIds.clear();
    state.pendingOpenedAt.clear();
    state.orientSamples = [];
    state.lastSignalAt.clear();
    setLatestOffer(null);
}
export function getFatigueSnapshot(now = Date.now()) {
    const hourAgo = now - 60 * 60 * 1000;
    const interruptsLastHour = state.interruptAt.filter((t) => t >= hourAgo).length;
    return {
        sessionStartedAt: state.startedAt,
        sessionActiveMs: state.startedAt != null ? now - state.startedAt : 0,
        interruptsLastHour,
        capacityWarnsInWindow: pruneOlderThan(state.capacityWarnAt, FATIGUE.capacityWarnWindowMs, now).length,
        pendingDecisions: state.pendingDecisionIds.size,
        orientSampleCount: state.orientSamples.length,
    };
}
/** Invitational copy for a fatigue kind — product may show as soft banner. */
export function suggestFatigueCopy(kind) {
    if (kind === "session_duration" || kind === "decision_backlog" || kind === "long_pending_decision") {
        return VOICE.fatiguePauseOffer;
    }
    return VOICE.fatigueCalmOffer;
}
export function evaluateFatigue(now = Date.now()) {
    const out = [];
    const snap = getFatigueSnapshot(now);
    if (snap.interruptsLastHour >= FATIGUE.interruptPerHourWarn) {
        out.push({
            kind: "interrupt_density",
            level: snap.interruptsLastHour >= FATIGUE.interruptPerHourWarn * 1.5 ? "elevated" : "watch",
            detail: { interruptsLastHour: snap.interruptsLastHour },
        });
    }
    if (snap.capacityWarnsInWindow >= FATIGUE.capacityWarnBurst) {
        out.push({
            kind: "capacity_burst",
            level: "elevated",
            detail: { capacityWarnsInWindow: snap.capacityWarnsInWindow },
        });
    }
    if (snap.sessionActiveMs >= FATIGUE.sessionActiveMsWarn) {
        out.push({
            kind: "session_duration",
            level: snap.sessionActiveMs >= FATIGUE.sessionActiveMsWarn * 1.5 ? "elevated" : "watch",
            detail: { sessionActiveMs: snap.sessionActiveMs },
        });
    }
    if (snap.pendingDecisions >= FATIGUE.pendingDecisionsWarn) {
        out.push({
            kind: "decision_backlog",
            level: "watch",
            detail: { pendingDecisions: snap.pendingDecisions },
        });
    }
    for (const [id, opened] of state.pendingOpenedAt) {
        const openMs = now - opened;
        if (openMs >= FATIGUE.longPendingDecisionMs) {
            out.push({
                kind: "long_pending_decision",
                level: "watch",
                detail: { id, openMs },
            });
            break;
        }
    }
    if (state.orientSamples.length >= 4) {
        const mid = Math.floor(state.orientSamples.length / 2);
        const earlier = state.orientSamples.slice(0, mid);
        const later = state.orientSamples.slice(mid);
        const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
        const a0 = avg(earlier);
        const a1 = avg(later);
        if (a0 > 0 && a1 / a0 >= 1.5) {
            out.push({
                kind: "orient_slowing",
                level: "watch",
                detail: { earlierMs: a0, laterMs: a1 },
            });
        }
    }
    return out;
}
function emitIfCooled(assessment, now) {
    const last = state.lastSignalAt.get(assessment.kind) ?? 0;
    if (now - last < FATIGUE.signalCooldownMs)
        return;
    state.lastSignalAt.set(assessment.kind, now);
    const offer = suggestFatigueCopy(assessment.kind);
    const row = { ...assessment, offer, at: now };
    setLatestOffer(row);
    logUxEvent("ux.fatigue_signal", {
        kind: assessment.kind,
        level: assessment.level,
        offer,
        ...(assessment.detail ?? {}),
    });
}
/** Evaluate and emit cooled `ux.fatigue_signal` events. Returns assessments found. */
export function pulseFatigueSession(now = Date.now()) {
    if (state.startedAt == null)
        startFatigueSession(now);
    const found = evaluateFatigue(now);
    for (const a of found)
        emitIfCooled(a, now);
    return found;
}
function observe(name, payload) {
    if (name === "ux.fatigue_signal")
        return;
    const now = Date.now();
    if (state.startedAt == null)
        startFatigueSession(now);
    if (name === "ux.interrupt") {
        const kind = payload.kind;
        if (kind === "ambient")
            return;
        state.interruptAt = pruneOlderThan([...state.interruptAt, now], 60 * 60 * 1000, now);
    }
    if (name === "ux.capacity_warn") {
        state.capacityWarnAt = pruneOlderThan([...state.capacityWarnAt, now], FATIGUE.capacityWarnWindowMs, now);
    }
    if (name === "ux.decision") {
        const id = String(payload.id ?? "");
        const decisionState = payload.state;
        if (!id)
            return;
        if (decisionState === "pending") {
            state.pendingDecisionIds.add(id);
            if (!state.pendingOpenedAt.has(id))
                state.pendingOpenedAt.set(id, now);
        }
        else {
            state.pendingDecisionIds.delete(id);
            state.pendingOpenedAt.delete(id);
        }
    }
    if (name === "ux.orient" && typeof payload.msToFourAnswers === "number") {
        state.orientSamples.push(payload.msToFourAnswers);
        if (state.orientSamples.length > 12)
            state.orientSamples.shift();
    }
    pulseFatigueSession(now);
}
/** Wire observer once — safe to call repeatedly. */
export function installFatigueTracking() {
    if (installed)
        return;
    installed = true;
    addUxEventObserver(observe);
}
/** Test-only. */
export function resetFatigueTrackingInstall() {
    installed = false;
}
//# sourceMappingURL=fatigue.js.map