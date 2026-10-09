"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { setVersionClientVisible } from "../../lib/actions/aqc";

export function AqcReleaseButton({ versionId, visible }: { versionId: string; visible: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <Button size="sm" kind={visible ? "ghost" : "tertiary"} disabled={pending} onClick={() => { setError(null); start(async () => { const r = await setVersionClientVisible(versionId, !visible); if (r.error) setError(r.error); }); }}>
        {pending ? "Saving…" : visible ? "Withdraw from client" : "Release to client"}
      </Button>
      {error && <InlineNotification kind="error" title={error} hideCloseButton lowContrast />}
    </div>
  );
}
