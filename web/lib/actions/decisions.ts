"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { DECISION_STATES, DECISION_TRANSITIONS, type DecisionState } from "../decisions";

/**
 * CRIF decision register — port of backend/src/modules/decision/router.ts's
 * `create`/`transition` mutations (see migration 0034's header comment for
 * the schema/RLS account). `update` (editing title/rationale/etc. after
 * creation) isn't ported — the register's own state machine already covers
 * the real lifecycle need (open it, send it to the client, lock it), and a
 * decision under review shouldn't have its own record quietly rewritten;
 * a genuinely wrong entry is superseded by a new one, not edited in place.
 */

type ActionState = { error: string } | null;

export async function createDecision(projectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const rationale = String(formData.get("rationale") ?? "").trim();
  const revisionCategory = String(formData.get("revisionCategory") ?? "").trim() || null;
  const revisionSource = String(formData.get("revisionSource") ?? "").trim() || null;
  const impact = String(formData.get("impact") ?? "LOW");
  const ownerName = String(formData.get("ownerName") ?? "").trim() || null;
  const reviewDeadline = String(formData.get("reviewDeadline") ?? "").trim() || null;

  if (!title) return { error: "Title is required." };
  if (!rationale) return { error: "Rationale is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inserted, error } = await supabase
    .from("decisions")
    .insert({
      project_id: projectId,
      title,
      rationale,
      revision_category: revisionCategory,
      revision_source: revisionSource,
      impact,
      owner_name: ownerName,
      review_deadline: reviewDeadline,
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "decision",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, title, impact },
  });

  revalidatePath(`/projects/${projectId}/decisions`);
  return null;
}

/** Staff-side state transition — validated against DECISION_TRANSITIONS
 * before writing, even though RLS already grants staff blanket write access
 * to this table; without this check a staff caller could jump straight from
 * DRAFT to LOCKED, skipping the register's own point (a real client-review
 * step for anything that actually reached the client). */
export async function updateDecisionState(projectId: string, decisionId: string, nextState: string): Promise<{ error?: string }> {
  if (!DECISION_STATES.includes(nextState as DecisionState)) return { error: "Invalid state." };

  const supabase = await createClient();
  const { data: before, error: beforeError } = await supabase
    .from("decisions")
    .select("state")
    .eq("id", decisionId)
    .maybeSingle();
  if (beforeError) return { error: beforeError.message };
  if (!before) return { error: "Decision not found." };

  const fromState = before.state as DecisionState;
  const allowed = DECISION_TRANSITIONS[fromState] ?? [];
  if (!allowed.includes(nextState as DecisionState)) {
    return { error: `Can't move ${fromState} → ${nextState}.` };
  }

  const patch: Record<string, unknown> = { state: nextState, updated_at: new Date().toISOString() };
  if (nextState === "LOCKED") patch.locked_at = new Date().toISOString();
  if (fromState === "LOCKED" && nextState === "OPEN") patch.locked_at = null;

  const { error } = await supabase.from("decisions").update(patch).eq("id", decisionId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "decision",
    p_entity_id: decisionId,
    p_action: "UPDATE",
    p_before: { state: fromState },
    p_after: { state: nextState },
  });

  revalidatePath(`/projects/${projectId}/decisions`);
  return {};
}
