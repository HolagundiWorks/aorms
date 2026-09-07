"use client";

import { useActionState } from "react";
import { Button, Select, SelectItem } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { sendTakeoffItemToEstimate, type SendTakeoffActionState } from "../../lib/actions/estimates";

const initialState: SendTakeoffActionState = null;

/**
 * A compact "send this take-off row's computed quantity to an Estimate"
 * control — see lib/actions/estimates.ts's sendTakeoffItemToEstimate for
 * what it actually writes (rate 0, linked_item_id set to this take-off
 * row — priced afterward on the Estimate itself, same as any other line).
 */
export function SendTakeoffToEstimateButton({
  takeoffItemId,
  projectId,
  estimates,
}: {
  takeoffItemId: string;
  projectId: string;
  estimates: { id: string; ref: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState(sendTakeoffItemToEstimate, initialState);

  if (estimates.length === 0) {
    return (
      <span className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
        No estimates yet
      </span>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", alignItems: "flex-end", gap: "0.25rem" }}>
      <input type="hidden" name="takeoffItemId" value={takeoffItemId} />
      <input type="hidden" name="projectId" value={projectId} />
      <Select id={`send-${takeoffItemId}`} name="estimateId" labelText="" hideLabel size="sm" defaultValue="">
        <SelectItem value="" text="Send to…" />
        {estimates.map((e) => (
          <SelectItem key={e.id} value={e.id} text={`${e.ref} — ${e.title}`} />
        ))}
      </Select>
      <Button
        type="submit"
        kind="ghost"
        size="sm"
        hasIconOnly
        iconDescription="Send to estimate"
        renderIcon={ArrowRight}
        disabled={pending}
      />
      {state?.error ? (
        <span className="cds--type-helper-text-01" style={{ color: "var(--cds-support-error)" }}>
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
