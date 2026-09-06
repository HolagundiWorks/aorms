"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { removeBbsMember, regenerateBbsMember } from "../../lib/actions/bbs";

export function BbsMemberActions({ memberId, bbsId }: { memberId: string; bbsId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRegenerate() {
    setError(null);
    startTransition(async () => {
      const res = await regenerateBbsMember(memberId, bbsId);
      if (res.error) setError(res.error);
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await removeBbsMember(memberId, bbsId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <Button size="sm" kind="tertiary" disabled={isPending} onClick={handleRegenerate}>
        {isPending ? "Working…" : "Regenerate"}
      </Button>
      <Button size="sm" kind="danger--tertiary" disabled={isPending} onClick={handleDelete}>
        Delete
      </Button>
      {error && (
        <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />
      )}
    </div>
  );
}
