import { ProgressIndicator, ProgressStep } from "@carbon/react";
import { decisionProgressSteps, type DecisionState } from "../../lib/decisions";

/** Visualizes a decision's CRIF state as a step tracker — see
 * `decisionProgressSteps`'s own header comment for what it simplifies. */
export function DecisionProgress({ state }: { state: DecisionState }) {
  const steps = decisionProgressSteps(state);
  return (
    <ProgressIndicator spaceEqually>
      {steps.map((step) => (
        <ProgressStep key={step.label} label={step.label} complete={step.complete} current={step.current} invalid={step.invalid} />
      ))}
    </ProgressIndicator>
  );
}
