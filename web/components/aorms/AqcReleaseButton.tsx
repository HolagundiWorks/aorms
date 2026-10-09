"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { setVersionClientVisible, setVersionContractorVisible } from "../../lib/actions/aqc";

export function AqcReleaseButton({ versionId, visible, audience = "client" }: { versionId: string; visible: boolean; audience?: "client" | "contractor" }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <Button size="sm" kind={visible ? "ghost" : "tertiary"} disabled={pending} onClick={() => { setError(null); start(async () => { const r = await (audience === "client" ? setVersionClientVisible : setVersionContractorVisible)(versionId, !visible); if (r.error) setError(r.error); }); }}>
        {pending ? "Saving…" : visible ? `Withdraw from ${audience}` : `Release to ${audience}`}
      </Button>
      {error && <InlineNotification kind="error" title={error} hideCloseButton lowContrast />}
    </div>
  );
}
