/**
 * ESTI Pulse — the recompute pass that ties Modules 1, 2, 5, and 6
 * together (2026-09-12). Plain module, no "use server" — its first
 * argument is a Supabase client instance (not serializable), same
 * reasoning as lib/platform/licence-payment.ts. Callable both from the
 * bearer-secured cron route (app/api/pulse/recompute/route.ts) and an
 * on-demand Server Action, so "wait 15 minutes to test" is never the
 * only way to see it work.
 *
 * Reads real data only — no fabricated context. "Site/client impact" is
 * computed at the PROJECT level (any decisions currently in
 * CLIENT_REVIEW on that project) rather than a true per-task link, since
 * `decisions` has no task_id FK in this schema — an honest
 * simplification, not a fabricated relationship.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeConfidenceScore, computeTaskPriority, bandForScore, type TaskScoringInput } from "./scoring";
import { detectMissingParams } from "./missing-params";

export type RecomputeSummary = {
  tasksScanned: number;
  tasksChanged: number;
  missingParamsOpened: number;
  missingParamsResolved: number;
};

export async function recomputeTaskScores(supabase: SupabaseClient, today: string): Promise<RecomputeSummary> {
  const summary: RecomputeSummary = { tasksScanned: 0, tasksChanged: 0, missingParamsOpened: 0, missingParamsResolved: 0 };

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, project_id, priority, status, due_date, updated_at, created_at, assignee_id, classification, priority_score, confidence_score")
    .neq("status", "DONE");
  const taskRows = tasks ?? [];
  if (taskRows.length === 0) return summary;
  summary.tasksScanned = taskRows.length;

  const taskIds = taskRows.map((t) => t.id);
  const projectIds = [...new Set(taskRows.map((t) => t.project_id).filter((id): id is string => !!id))];

  const [{ data: openDeps }, { data: activeParams }, { data: decisions }, { data: invoices }] = await Promise.all([
    supabase.from("task_dependencies").select("task_id").eq("dependency_type", "BLOCKS").eq("status", "OPEN").in("task_id", taskIds),
    // "Active" = not yet dismissed (OPEN/CONFIRMED/BLOCKED, i.e. anything
    // but NOT_REQUIRED) — needed so a param a person already CONFIRMED
    // doesn't get silently re-inserted as a duplicate the moment the same
    // underlying condition (e.g. still no due date) is detected again.
    supabase.from("task_missing_params").select("id, task_id, parameter_type, status").in("status", ["OPEN", "CONFIRMED", "BLOCKED"]).in("task_id", taskIds),
    projectIds.length
      ? supabase.from("decisions").select("project_id, state, impact").in("project_id", projectIds)
      : Promise.resolve({ data: [] as { project_id: string; state: string; impact: string }[] }),
    projectIds.length
      ? supabase.from("invoices").select("project_id, grand_total_paise, paid_paise").in("project_id", projectIds)
      : Promise.resolve({ data: [] as { project_id: string; grand_total_paise: number; paid_paise: number }[] }),
  ]);

  const openDepCountByTask = new Map<string, number>();
  for (const d of openDeps ?? []) openDepCountByTask.set(d.task_id, (openDepCountByTask.get(d.task_id) ?? 0) + 1);

  const activeParamsByTask = new Map<string, { id: string; parameterType: string; status: string }[]>();
  for (const p of activeParams ?? []) {
    const list = activeParamsByTask.get(p.task_id) ?? [];
    list.push({ id: p.id, parameterType: p.parameter_type, status: p.status });
    activeParamsByTask.set(p.task_id, list);
  }

  const IMPACT_RANK: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
  const projectClientReview = new Map<string, boolean>();
  const projectMaxImpact = new Map<string, "LOW" | "MEDIUM" | "HIGH">();
  for (const d of decisions ?? []) {
    if (d.state === "CLIENT_REVIEW") {
      projectClientReview.set(d.project_id, true);
      const current = projectMaxImpact.get(d.project_id);
      if (!current || IMPACT_RANK[d.impact] > IMPACT_RANK[current]) {
        projectMaxImpact.set(d.project_id, d.impact as "LOW" | "MEDIUM" | "HIGH");
      }
    }
  }

  const projectOutstanding = new Map<string, number>();
  for (const inv of invoices ?? []) {
    const outstanding = (inv.grand_total_paise ?? 0) - (inv.paid_paise ?? 0);
    projectOutstanding.set(inv.project_id, (projectOutstanding.get(inv.project_id) ?? 0) + outstanding);
  }

  for (const task of taskRows) {
    const openBlockingDepCount = openDepCountByTask.get(task.id) ?? 0;
    const activeParamsForTask = activeParamsByTask.get(task.id) ?? [];
    const openParamsForTask = activeParamsForTask.filter((p) => p.status === "OPEN");

    const confidenceInput: TaskScoringInput = {
      id: task.id,
      priority: task.priority,
      status: task.status,
      dueDate: task.due_date,
      updatedAt: task.updated_at,
      createdAt: task.created_at,
      assigneeId: task.assignee_id,
      classification: task.classification,
      openBlockingDepCount,
      openMissingParamCount: openParamsForTask.length,
      hasClientReviewDecision: task.project_id ? (projectClientReview.get(task.project_id) ?? false) : false,
      maxLinkedDecisionImpact: task.project_id ? (projectMaxImpact.get(task.project_id) ?? null) : null,
      projectOutstandingPaise: task.project_id ? (projectOutstanding.get(task.project_id) ?? 0) : 0,
    };

    const confidenceScore = computeConfidenceScore(confidenceInput, today);
    const priorityScore = computeTaskPriority(confidenceInput, confidenceScore, today);

    // Reconcile missing parameters — resolve ones no longer detected,
    // insert newly-detected ones. Detection reuses the same real inputs.
    const detected = detectMissingParams(
      { status: task.status, dueDate: task.due_date, assigneeId: task.assignee_id, updatedAt: task.updated_at, openBlockingDepCount },
      today,
    );
    const detectedTypes = new Set(detected.map((d) => d.parameterType));
    // Dedup against ALL active statuses (not just OPEN) — a CONFIRMED/
    // BLOCKED row for a parameter type already covers that gap; only an
    // OPEN row for a type no longer detected gets auto-resolved, since a
    // person already made a call on the CONFIRMED/BLOCKED ones.
    const activeTypes = new Set(activeParamsForTask.map((p) => p.parameterType));

    const toResolve = openParamsForTask.filter((p) => !detectedTypes.has(p.parameterType as never));
    if (toResolve.length > 0) {
      await supabase
        .from("task_missing_params")
        .update({ status: "NOT_REQUIRED", resolved_at: new Date().toISOString() })
        .in("id", toResolve.map((p) => p.id));
      summary.missingParamsResolved += toResolve.length;
    }

    const toInsert = detected.filter((d) => !activeTypes.has(d.parameterType));
    if (toInsert.length > 0) {
      await supabase.from("task_missing_params").insert(
        toInsert.map((d) => ({ task_id: task.id, parameter_type: d.parameterType, description: d.description })),
      );
      summary.missingParamsOpened += toInsert.length;
    }

    // Only write if something actually changed — avoids a no-op log row
    // and an unnecessary updated_at bump on every task, every cycle.
    if (task.priority_score !== priorityScore || task.confidence_score !== confidenceScore) {
      const band = bandForScore(priorityScore);
      const reason = `Priority ${task.priority_score ?? 0}→${priorityScore} (${band}), confidence ${task.confidence_score ?? 100}→${confidenceScore}. Factors: ${openBlockingDepCount} open blocking dep(s), ${openParamsForTask.length} open gap(s)${confidenceInput.hasClientReviewDecision ? ", pending client review" : ""}.`;

      await supabase.from("tasks").update({ priority_score: priorityScore, confidence_score: confidenceScore }).eq("id", task.id);
      await supabase.from("task_priority_log").insert({
        task_id: task.id,
        old_priority_score: task.priority_score,
        new_priority_score: priorityScore,
        old_confidence_score: task.confidence_score,
        new_confidence_score: confidenceScore,
        reason,
      });
      summary.tasksChanged++;
    }
  }

  return summary;
}
