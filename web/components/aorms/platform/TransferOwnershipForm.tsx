"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification, Select, SelectItem } from "@carbon/react";
import { transferStudioOwnership } from "../../../lib/actions/platform";

type Member = { accountId: string; label: string };

/**
 * Owner-only, on /studios/[studioId] — a clean single-owner handoff, not
 * just adding a co-owner (MembershipRoleSelect already covers "make
 * someone else an additional OWNER" without demoting anyone). Confirms
 * via window.confirm given losing owner status is not casually reversible
 * (same pattern LeaveStudioButton already uses for its own irreversible
 * action).
 */
export function TransferOwnershipForm({ studioId, otherActiveMembers }: { studioId: string; otherActiveMembers: Member[] }) {
  const [target, setTarget] = useState(otherActiveMembers[0]?.accountId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (otherActiveMembers.length === 0) {
    return (
      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
        Invite another member before you can transfer ownership to them.
      </p>
    );
  }

  if (done) {
    return (
      <InlineNotification kind="success" title="Ownership transferred" subtitle="Refresh to see the new owner." lowContrast hideCloseButton />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "24rem" }}>
      <Select id="transfer-target" labelText="New owner" value={target} onChange={(e) => setTarget(e.target.value)}>
        {otherActiveMembers.map((m) => (
          <SelectItem key={m.accountId} value={m.accountId} text={m.label} />
        ))}
      </Select>
      {error ? <InlineNotification kind="error" title="Couldn't transfer" subtitle={error} lowContrast hideCloseButton /> : null}
      <Button
        kind="danger--tertiary"
        size="sm"
        disabled={isPending || !target}
        onClick={() => {
          const label = otherActiveMembers.find((m) => m.accountId === target)?.label ?? "this member";
          if (!window.confirm(`Transfer ownership to ${label}? You'll become a regular member.`)) return;
          setError(null);
          startTransition(async () => {
            const res = await transferStudioOwnership(studioId, target);
            if (res.error) setError(res.error);
            else setDone(true);
          });
        }}
      >
        {isPending ? "Transferring…" : "Transfer ownership"}
      </Button>
    </div>
  );
}
