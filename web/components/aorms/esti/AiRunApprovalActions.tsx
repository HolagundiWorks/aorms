"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification, Stack } from "@carbon/react";

type Action = { label: string; kind: "primary" | "danger--ghost" | "tertiary"; action: () => Promise<{ error?: string }> };

/**
 * Approval-state buttons for one ai_runs row — DRAFT → APPROVED/REJECTED →
 * ISSUED, mirroring the old backend's updateRun mutation. Each `actions`
 * entry is a Server Action already bound to (runId, nextState) by the
 * server page, same pattern as RemoveLineItemButton.
 */
export function AiRunApprovalActions({ actions }: { actions: Action[] }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (actions.length === 0) return null;

  return (
    <Stack gap={3}>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {actions.map((a) => (
          <Button
            key={a.label}
            size="sm"
            kind={a.kind}
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await a.action();
                if (res.error) setError(res.error);
              });
            }}
          >
            {a.label}
          </Button>
        ))}
      </div>
      {error && <InlineNotification kind="error" title="Couldn't update" subtitle={error} hideCloseButton lowContrast />}
    </Stack>
  );
}
