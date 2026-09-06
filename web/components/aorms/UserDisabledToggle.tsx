"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { toggleUserDisabled } from "../../lib/actions/users";

export function UserDisabledToggle({ userId, disabled }: { userId: string; disabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Button
        size="sm"
        kind={disabled ? "tertiary" : "danger--tertiary"}
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await toggleUserDisabled(userId, !disabled);
            if (res.error) setError(res.error);
          });
        }}
      >
        {isPending ? "Working…" : disabled ? "Enable" : "Disable"}
      </Button>
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
