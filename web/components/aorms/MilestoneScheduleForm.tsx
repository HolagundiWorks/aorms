"use client";

import { useActionState } from "react";
import { Button, Form, Select, SelectItem, TextInput } from "@carbon/react";
import { updateMilestoneSchedule } from "../../lib/actions/pmc-milestones";

/** Duration + predecessor link for one milestone — feeds the contractor's critical-path view. */
export function MilestoneScheduleForm({
  id, durationDays, predecessorId, depType, lagDays, options,
}: {
  id: string; durationDays: number | null; predecessorId: string | null; depType: string; lagDays: number;
  options: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(updateMilestoneSchedule, null);
  return (
    <Form action={action} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
      <input type="hidden" name="id" value={id} />
      <TextInput id={`dur-${id}`} name="durationDays" labelText="Days" size="sm" inputMode="numeric" defaultValue={durationDays ?? ""} style={{ inlineSize: "4.5rem" }} />
      <Select id={`pred-${id}`} name="predecessorId" labelText="After" size="sm" defaultValue={predecessorId ?? ""}>
        <SelectItem value="" text="— none —" />
        {options.filter((o) => o.id !== id).map((o) => <SelectItem key={o.id} value={o.id} text={o.label} />)}
      </Select>
      <Select id={`dep-${id}`} name="depType" labelText="Link" size="sm" defaultValue={depType}>
        {["FS", "SS", "FF", "SF"].map((t) => <SelectItem key={t} value={t} text={t} />)}
      </Select>
      <TextInput id={`lag-${id}`} name="lagDays" labelText="Lag" size="sm" inputMode="numeric" defaultValue={lagDays} style={{ inlineSize: "4rem" }} />
      <Button type="submit" size="sm" kind="tertiary" disabled={pending}>{pending ? "…" : "Save"}</Button>
      {state && "error" in state && <span className="cds--type-helper-text-01" style={{ color: "var(--cds-support-error)" }}>{state.error}</span>}
    </Form>
  );
}
