"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import type { ConnectDexActionState } from "../../../../lib/actions/connectdex";

/**
 * One small generic button for the three single-id admin actions on
 * /admin/connectdex (Invite/Reject an application, Verify a company) —
 * same "client component wraps a plain-id Server Action via useTransition"
 * pattern as LeaveCompanyButton.tsx, generalized instead of writing three
 * near-identical files.
 */
export function ConnectDexActionButton({
  id,
  label,
  pendingLabel,
  kind = "tertiary",
  confirmMessage,
  action,
}: {
  id: string;
  label: string;
  pendingLabel: string;
  kind?: "primary" | "tertiary" | "danger--tertiary";
  confirmMessage?: string;
  action: (id: string) => Promise<ConnectDexActionState>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Button
        kind={kind}
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (confirmMessage && !window.confirm(confirmMessage)) return;
          setError(null);
          startTransition(async () => {
            const res = await action(id);
            if (res?.error) setError(res.error);
          });
        }}
      >
        {isPending ? pendingLabel : label}
      </Button>
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast style={{ marginTop: "0.5rem" }} />}
    </div>
  );
}
