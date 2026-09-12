"use client";

import { useTransition } from "react";
import { Button } from "@carbon/react";
import { CheckmarkFilled, Locked } from "@carbon/icons-react";
import { resolveMissingParam } from "../../../lib/actions/pulse";

/** Module 2 disposition — a team member confirms a gap has been filled
 * (CONFIRMED), flags it as blocked on something else (BLOCKED), or marks
 * it not applicable (NOT_REQUIRED). All three remove it from the open
 * list; recompute won't re-flag NOT_REQUIRED items as long as the same
 * gap condition persists... actually it will, since detection only
 * checks current state — CONFIRMED is the durable "handled" marker to
 * reach for once the real due date/assignee/dependency is fixed. */
export function MissingParamActions({ paramId }: { paramId: string }) {
  const [isPending, startTransition] = useTransition();

  function act(status: string) {
    startTransition(async () => {
      await resolveMissingParam(paramId, status);
    });
  }

  return (
    <div style={{ display: "flex", gap: "0.375rem" }}>
      <Button kind="ghost" size="sm" renderIcon={CheckmarkFilled} disabled={isPending} onClick={() => act("CONFIRMED")}>
        Confirm
      </Button>
      <Button kind="ghost" size="sm" renderIcon={Locked} disabled={isPending} onClick={() => act("NOT_REQUIRED")}>
        Not required
      </Button>
    </div>
  );
}
