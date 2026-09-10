"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { adminTriggerPasswordReset } from "../../../lib/actions/admin-accounts";

/**
 * SysDeX Accounts — "Send password reset" per row. Unlike
 * ConnectDexActionButton (error-only), this shows the success message too
 * (which email address the reset actually went to) — worth confirming
 * inline since there's no other feedback the email delivery worked.
 */
export function SendPasswordResetButton({ accountId, accountLabel }: { accountId: string; accountLabel: string }) {
  const [result, setResult] = useState<{ error?: string; success?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Button
        kind="tertiary"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(`Send a password reset email to ${accountLabel}?`)) return;
          setResult(null);
          startTransition(async () => {
            const res = await adminTriggerPasswordReset(accountId);
            setResult(res);
          });
        }}
      >
        {isPending ? "Sending…" : "Send password reset"}
      </Button>
      {result?.error && (
        <InlineNotification kind="error" title="Failed" subtitle={result.error} hideCloseButton lowContrast style={{ marginTop: "0.5rem" }} />
      )}
      {result?.success && (
        <InlineNotification kind="success" title="Sent" subtitle={result.success} hideCloseButton lowContrast style={{ marginTop: "0.5rem" }} />
      )}
    </div>
  );
}
