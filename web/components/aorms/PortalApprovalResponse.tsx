"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification, TextArea } from "@carbon/react";
import { respondToApproval } from "../../lib/actions/portal";

/** Client Portal's respond-to-approval control — only rendered for a SENT
 * approval (the page itself checks that; respond_to_approval() re-checks
 * it server-side too, so this isn't the real gate). */
export function PortalApprovalResponse({ approvalId, projectId }: { approvalId: string; projectId: string }) {
  const [remarks, setRemarks] = useState("");
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

  function respond(status: string) {
    setError(null);
    startTransition(async () => {
      const res = await respondToApproval(approvalId, status, remarks, projectId);
      if (res.error) setError(res.error);
      else setDone(status);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "22rem" }}>
      <TextArea
        id={`approval-remarks-${approvalId}`}
        labelText=""
        hideLabel
        placeholder="Remarks (optional)"
        rows={2}
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
      />
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Button size="sm" kind="primary" disabled={isPending} onClick={() => respond("APPROVED")}>
          Approve
        </Button>
        <Button size="sm" kind="tertiary" disabled={isPending} onClick={() => respond("REVISIONS")}>
          Request revisions
        </Button>
        <Button size="sm" kind="danger--tertiary" disabled={isPending} onClick={() => respond("REJECTED")}>
          Reject
        </Button>
      </div>
      {error && <InlineNotification kind="error" title="Couldn't respond" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
