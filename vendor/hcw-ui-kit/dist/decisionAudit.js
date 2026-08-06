/**
 * Decision / freeze audit — explainability contract (evaluation V5 kit half).
 * Kit keeps a session ring + emits `ux.audit`; product attaches
 * {@link setDecisionAuditSink} to persist for 6+ month reconstruction.
 *
 *   setDecisionAuditSink((row) => api.post("/ux/audit", row));
 *   recordDecisionAudit({ decisionId, action: "frozen", reason, chosen });
 */
import { logDecision, logUxEvent } from "./uxEvents.js";
const SESSION_CAP = 200;
let seq = 0;
let session = [];
let sink = null;
/** Product persistence (DB / analytics). Session ring still fills without a sink. */
export function setDecisionAuditSink(next) {
    sink = next;
}
export function recordDecisionAudit(input) {
    const row = {
        ...input,
        id: input.id ?? `audit-${++seq}`,
        at: input.at ?? Date.now(),
    };
    session = [...session, row].slice(-SESSION_CAP);
    sink?.(row);
    logUxEvent("ux.audit", {
        decisionId: row.decisionId,
        action: row.action,
        at: row.at,
        surfaceId: row.surfaceId,
    });
    return row;
}
/** Convenience — freeze with reason (commercial / judgment trail). */
export function recordFreezeAudit(decisionId, fields = {}) {
    return recordDecisionAudit({ decisionId, action: "frozen", ...fields });
}
/**
 * Freeze a decision end-to-end: KPI `ux.decision` frozen + durable audit row.
 * Prefer this at dock RIGHT commit over calling the two APIs separately.
 */
export function freezeDecision(decisionId, fields = {}) {
    const { msOpen, ...auditFields } = fields;
    logDecision(decisionId, "frozen", msOpen);
    return recordFreezeAudit(decisionId, auditFields);
}
/** Open / focus a pending decision (KPI + audit). */
export function openDecision(decisionId, fields = {}) {
    logDecision(decisionId, "pending");
    return recordDecisionAudit({ decisionId, action: "opened", ...fields });
}
export function listSessionDecisionAudits() {
    return session;
}
export function exportSessionDecisionAudits() {
    return session.map((r) => ({ ...r, meta: r.meta ? { ...r.meta } : undefined }));
}
/** Test-only. */
export function resetDecisionAudit() {
    session = [];
    seq = 0;
    sink = null;
}
//# sourceMappingURL=decisionAudit.js.map