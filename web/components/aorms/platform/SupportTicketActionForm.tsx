"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification, Select, SelectItem, Stack, TextArea } from "@carbon/react";
import { adminUpdateSupportTicketStatus } from "../../../lib/actions/support";

type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

/**
 * SysDeX/HelpDeX — per-ticket status + admin note. No outbound email
 * reply here (see lib/actions/support.ts's header comment on that scope
 * boundary) — this just triages/resolves the ticket's own status.
 */
export function SupportTicketActionForm({
  ticketId,
  currentStatus,
  currentNote,
}: {
  ticketId: string;
  currentStatus: Status;
  currentNote: string | null;
}) {
  const [status, setStatus] = useState<Status>(currentStatus);
  const [note, setNote] = useState(currentNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Stack gap={3}>
      <Select
        id={`status-${ticketId}`}
        labelText="Status"
        value={status}
        onChange={(e) => setStatus(e.target.value as Status)}
      >
        <SelectItem value="OPEN" text="Open" />
        <SelectItem value="IN_PROGRESS" text="In progress" />
        <SelectItem value="RESOLVED" text="Resolved" />
        <SelectItem value="CLOSED" text="Closed" />
      </Select>
      <TextArea
        id={`note-${ticketId}`}
        labelText="Admin note (internal only)"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await adminUpdateSupportTicketStatus(ticketId, status, note);
            if (res?.error) setError(res.error);
          });
        }}
      >
        {isPending ? "Saving…" : "Save"}
      </Button>
    </Stack>
  );
}
