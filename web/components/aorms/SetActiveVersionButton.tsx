"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { setActiveSpecCatalogVersion } from "../../lib/actions/spec-catalog";

export function SetActiveVersionButton({ versionId }: { versionId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Button
        size="sm"
        kind="tertiary"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await setActiveSpecCatalogVersion(versionId);
            if (res.error) setError(res.error);
          });
        }}
      >
        {isPending ? "Activating…" : "Set active"}
      </Button>
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
