"use client";

import { useTransition } from "react";
import { Select, SelectItem } from "@carbon/react";
import { updateDecisionState } from "../../lib/actions/decisions";
import { DECISION_STATES, DECISION_STATE_LABEL } from "../../lib/decisions";

/** Same idiom as ApprovalStatusSelect — shows every state, the server
 * action rejects a jump DECISION_TRANSITIONS doesn't allow. */
export function DecisionStateSelect({ projectId, decisionId, state }: { projectId: string; decisionId: string; state: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      id={`decision-state-${decisionId}`}
      labelText="Decision state"
      hideLabel
      size="sm"
      value={state}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          void updateDecisionState(projectId, decisionId, next);
        });
      }}
    >
      {DECISION_STATES.map((s) => (
        <SelectItem key={s} value={s} text={DECISION_STATE_LABEL[s]} />
      ))}
    </Select>
  );
}
