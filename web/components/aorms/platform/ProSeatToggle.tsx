"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification, Tag } from "@carbon/react";
import { assignProSeat, revokeProSeat } from "../../../lib/actions/platform";

/**
 * Owner-only PRO seat control on /studios/[studioId] — a member is either
 * on one of the studio's paid Pro/Enterprise seats (PRO) or not (BASIC,
 * the free default). `disableAssign` (no free seats left) just disables the
 * button for a clean UX — the real cap check is server-side in
 * assignProSeat, this can't be bypassed by re-enabling the button in
 * devtools.
 */
export function ProSeatToggle({
  studioId,
  membershipId,
  accountId,
  isProAssigned,
  disableAssign,
}: {
  studioId: string;
  membershipId: string;
  accountId: string;
  isProAssigned: boolean;
  disableAssign: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      {isProAssigned ? (
        <Button
          kind="tertiary"
          size="sm"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await revokeProSeat(studioId, membershipId, accountId);
              if (res.error) setError(res.error);
            });
          }}
        >
          {isPending ? "Revoking…" : "Revoke PRO"}
        </Button>
      ) : (
        <Button
          kind="primary"
          size="sm"
          disabled={isPending || disableAssign}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await assignProSeat(studioId, membershipId, accountId);
              if (res.error) setError(res.error);
            });
          }}
        >
          {isPending ? "Assigning…" : "Assign PRO seat"}
        </Button>
      )}
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}

export function ProSeatTag({ isProAssigned }: { isProAssigned: boolean }) {
  return (
    <Tag type={isProAssigned ? "green" : "cool-gray"} size="sm">
      {isProAssigned ? "PRO" : "BASIC"}
    </Tag>
  );
}
