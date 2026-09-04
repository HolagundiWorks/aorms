"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { publishRepoSource, unpublishRepoSource } from "../../lib/actions/knowledge-bank";

export function RepoSourceActions({ sourceId, status }: { sourceId: string; status: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      const res = await publishRepoSource(sourceId);
      if (res.error) setError(res.error);
    });
  }

  function handleUnpublish() {
    setError(null);
    startTransition(async () => {
      const res = await unpublishRepoSource(sourceId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {status === "PUBLISHED" ? (
          <Button size="sm" kind="tertiary" disabled={isPending} onClick={handleUnpublish}>
            {isPending ? "Working…" : "Unpublish"}
          </Button>
        ) : (
          <Button size="sm" disabled={isPending} onClick={handlePublish}>
            {isPending ? "Working…" : "Publish"}
          </Button>
        )}
      </div>
      {error && (
        <div style={{ marginTop: "0.5rem" }}>
          <InlineNotification kind="error" title="Could not update" subtitle={error} hideCloseButton lowContrast />
        </div>
      )}
    </div>
  );
}
