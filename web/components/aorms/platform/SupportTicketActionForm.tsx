"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification, Select, SelectItem, Stack, TextArea } from "@carbon/react";
import { adminReplyToSupportTicket, adminUpdateSupportTicketStatus } from "../../../lib/actions/support";

type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

/**
 * SysDeX/HelpDeX — per-ticket status + internal note, and (2026-10-01) a reply to
 * the submitter. The reply is always stored; it is emailed only when SMTP is
 * configured, and the result line says which happened.
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
  const [reply, setReply] = useState("");
  const [replyNotice, setReplyNotice] = useState<string | null>(null);
  const [replyPending, startReply] = useTransition();

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
      <TextArea id={`reply-${ticketId}`} labelText="Reply to submitter (emailed when email is configured)" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
      {replyNotice && <InlineNotification kind={replyNotice.includes("NOT emailed") ? "warning" : "success"} title="Reply" subtitle={replyNotice} hideCloseButton lowContrast />}
      <Button
        size="sm"
        kind="tertiary"
        disabled={replyPending || reply.trim().length === 0}
        onClick={() => {
          setReplyNotice(null);
          startReply(async () => {
            const res = await adminReplyToSupportTicket(ticketId, reply);
            if (res.error) setError(res.error);
            else {
              setReplyNotice(res.notice ?? "Saved.");
              setReply("");
            }
          });
        }}
      >
        {replyPending ? "Sending…" : "Send reply"}
      </Button>
    </Stack>
  );
}
