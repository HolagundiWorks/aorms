"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { respondToDecision } from "../../lib/actions/portal";

/** Client Portal's respond-to-decision control — mirrors
 * PortalApprovalResponse; only rendered for a CLIENT_REVIEW decision (the
 * page itself checks that; respond_to_decision() re-checks it server-side
 * too, so this isn't the real gate). */
export function PortalDecisionResponse({ decisionId, projectId }: { decisionId: string; projectId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (done) {
    return (
      <span className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
        You responded: {done}
      </span>
    );
  }

  function respond(response: string) {
    setError(null);
    startTransition(async () => {
      const res = await respondToDecision(decisionId, response, projectId);
      if (res.error) setError(res.error);
      else setDone(response);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Button size="sm" kind="primary" disabled={isPending} onClick={() => respond("ACCEPTED")}>
          Accept
        </Button>
        <Button size="sm" kind="danger--tertiary" disabled={isPending} onClick={() => respond("REJECTED")}>
          Reject
        </Button>
      </div>
      {error && <InlineNotification kind="error" title="Couldn't respond" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
