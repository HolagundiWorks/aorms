"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { declineInvitation } from "../../lib/actions/contractor-portal";

export function ContractorDeclineButton({ invitationId }: { invitationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Button
        size="sm"
        kind="danger--tertiary"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await declineInvitation(invitationId);
            if (res.error) setError(res.error);
          });
        }}
      >
        {isPending ? "Declining…" : "Decline invitation"}
      </Button>
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
