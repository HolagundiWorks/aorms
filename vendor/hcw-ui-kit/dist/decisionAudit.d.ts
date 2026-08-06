/**
 * Decision / freeze audit — explainability contract (evaluation V5 kit half).
 * Kit keeps a session ring + emits `ux.audit`; product attaches
 * {@link setDecisionAuditSink} to persist for 6+ month reconstruction.
 *
 *   setDecisionAuditSink((row) => api.post("/ux/audit", row));
 *   recordDecisionAudit({ decisionId, action: "frozen", reason, chosen });
 */
export type DecisionAuditAction = "opened" | "frozen" | "rejected" | "revised";
export type DecisionAuditRecord = {
    id: string;
    decisionId: string;
    action: DecisionAuditAction;
    at: number;
    question?: string;
    recommendation?: string;
    chosen?: string;
    reason?: string;
    actorId?: string;
    surfaceId?: string;
    /** Free-form product fields (keep JSON-serialisable). */
    meta?: Record<string, unknown>;
};
export type DecisionAuditSink = (record: DecisionAuditRecord) => void;
/** Product persistence (DB / analytics). Session ring still fills without a sink. */
export declare function setDecisionAuditSink(next: DecisionAuditSink | null): void;
export declare function recordDecisionAudit(input: Omit<DecisionAuditRecord, "id" | "at"> & {
    at?: number;
    id?: string;
}): DecisionAuditRecord;
/** Convenience — freeze with reason (commercial / judgment trail). */
export declare function recordFreezeAudit(decisionId: string, fields?: Omit<DecisionAuditRecord, "id" | "at" | "decisionId" | "action">): DecisionAuditRecord;
/**
 * Freeze a decision end-to-end: KPI `ux.decision` frozen + durable audit row.
 * Prefer this at dock RIGHT commit over calling the two APIs separately.
 */
export declare function freezeDecision(decisionId: string, fields?: Omit<DecisionAuditRecord, "id" | "at" | "decisionId" | "action"> & {
    msOpen?: number;
}): DecisionAuditRecord;
/** Open / focus a pending decision (KPI + audit). */
export declare function openDecision(decisionId: string, fields?: Omit<DecisionAuditRecord, "id" | "at" | "decisionId" | "action">): DecisionAuditRecord;
export declare function listSessionDecisionAudits(): readonly DecisionAuditRecord[];
export declare function exportSessionDecisionAudits(): DecisionAuditRecord[];
/** Test-only. */
export declare function resetDecisionAudit(): void;
//# sourceMappingURL=decisionAudit.d.ts.map