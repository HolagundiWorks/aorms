"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { acknowledgeItem } from "../../lib/actions/portal";

export function PortalAcknowledgeButton({
  projectId,
  objectType,
  objectId,
  subject,
}: {
  projectId: string;
  objectType: string;
  objectId: string | null;
  subject: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (done) return <span className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>Acknowledged</span>;

  return (
    <div>
      <Button
        size="sm"
        kind="ghost"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await acknowledgeItem(projectId, objectType, objectId, subject);
            if (res.error) setError(res.error);
            else setDone(true);
          });
        }}
      >
        {isPending ? "Acknowledging…" : "Acknowledge"}
      </Button>
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
