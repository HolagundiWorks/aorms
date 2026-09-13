"use client";

/**
 * Inline one-click resolutions for the dashboard's Action Queue
 * (2026-09-13 restructure) — kept to the three kinds that already have a
 * real, unambiguous "done" state to move to: Task -> DONE, Approval ->
 * APPROVED, Decision -> ACCEPTED (a valid CRIF transition from
 * CLIENT_REVIEW — see lib/decisions.ts's DECISION_TRANSITIONS). Client
 * and consultant requests deliberately get no quick action here: no
 * staff-side "resolve this open request" write path exists anywhere in
 * this app for `portal_submissions`/`consultant_submissions` today (only
 * the client's own `acknowledgeItem`, which inserts a *new* submission
 * rather than closing the open one) — inventing a resolve action just for
 * this button would be scope creep past what the app actually models, so
 * those two kinds stay View-only, same as everywhere else in the app.
 *
 * Same shape as pulse/MissingParamActions.tsx: a plain useTransition +
 * direct Server Action call, no client-side optimistic list removal —
 * each action's own `revalidatePath("/pulse")` (tasks.ts/approvals.ts/
 * decisions.ts) is what makes the item actually disappear from the queue
 * on the next render, via Next's automatic Server Component refresh after
 * a Server Action resolves.
 */

import { useTransition } from "react";
import { Button } from "@carbon/react";
import { CheckmarkFilled } from "@carbon/icons-react";
import { updateTaskStatus } from "../../../lib/actions/tasks";
import { updateApprovalStatus } from "../../../lib/actions/approvals";
import { updateDecisionState } from "../../../lib/actions/decisions";

export function MarkTaskDoneButton({ taskId }: { taskId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      kind="ghost"
      size="sm"
      renderIcon={CheckmarkFilled}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await updateTaskStatus(taskId, "DONE");
        })
      }
    >
      {isPending ? "Marking done…" : "Mark done"}
    </Button>
  );
}

export function ApproveButton({ approvalId }: { approvalId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      kind="ghost"
      size="sm"
      renderIcon={CheckmarkFilled}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await updateApprovalStatus(approvalId, "APPROVED");
        })
      }
    >
      {isPending ? "Approving…" : "Approve"}
    </Button>
  );
}

export function AcceptDecisionButton({ projectId, decisionId }: { projectId: string; decisionId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      kind="ghost"
      size="sm"
      renderIcon={CheckmarkFilled}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await updateDecisionState(projectId, decisionId, "ACCEPTED");
        })
      }
    >
      {isPending ? "Accepting…" : "Accept"}
    </Button>
  );
}
