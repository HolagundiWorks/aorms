"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { deriveWallFinishes } from "../../lib/actions/takeoff";

const LABEL: Record<string, string> = { PLASTER: "Plaster", PAINTING: "Painting" };

/** Derives Plaster + Painting rows from this masonry wall (see
 * deriveWallFinishes()'s own header comment for what this does and
 * deliberately doesn't copy). */
export function DeriveWallFinishesButton({ takeoffItemId, projectId }: { takeoffItemId: string; projectId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string[] | null>(null);
  const [isPending, startTransition] = useTransition();

  if (done !== null) {
    return (
      <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
        {done.length === 0 ? "Already derived" : `Added ${done.map((c) => LABEL[c] ?? c).join(" + ")}`}
      </span>
    );
  }

  return (
    <div>
      <Button
        size="sm"
        kind="tertiary"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await deriveWallFinishes(takeoffItemId, projectId);
            if (res.error) setError(res.error);
            else setDone(res.created ?? []);
          });
        }}
      >
        {isPending ? "Deriving…" : "Derive Plaster + Paint"}
      </Button>
      {error && <InlineNotification kind="error" title="Couldn't derive" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
