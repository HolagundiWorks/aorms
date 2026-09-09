"use client";

import { useTransition } from "react";
import { Dropdown } from "@carbon/react";
import { updateDecisionState } from "../../lib/actions/decisions";
import { DECISION_STATES, DECISION_STATE_LABEL, type DecisionState } from "../../lib/decisions";

/**
 * Replaces DecisionStateSelect's plain `Select` with Carbon's `Dropdown` —
 * same idiom (shows every state, the server action rejects a jump
 * DECISION_TRANSITIONS doesn't allow), a richer listbox control instead
 * of a native `<select>`. Lives inside each decision's AccordionItem now.
 */
export function DecisionStateDropdown({ projectId, decisionId, state }: { projectId: string; decisionId: string; state: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Dropdown<DecisionState>
      id={`decision-state-${decisionId}`}
      titleText="Decision state"
      hideLabel
      size="sm"
      label={DECISION_STATE_LABEL[state as DecisionState] ?? state}
      items={[...DECISION_STATES]}
      itemToString={(item) => (item ? DECISION_STATE_LABEL[item] : "")}
      selectedItem={state as DecisionState}
      disabled={isPending}
      onChange={({ selectedItem }) => {
        if (!selectedItem || selectedItem === state) return;
        startTransition(() => {
          void updateDecisionState(projectId, decisionId, selectedItem);
        });
      }}
    />
  );
}
