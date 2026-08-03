import { Button, Stack, TextArea } from "@carbon/react";
import { useState } from "react";
import { CarbonScope } from "../carbon/CarbonScope.js";
import { DataState, StatusDot } from "../carbon/adapters/index.js";

export interface ThreadMessage {
  id: string;
  authorName: string | null;
  authorSide: string;
  body: string;
  createdAt: string | Date;
}

const SIDE_TAG: Record<string, "blue" | "teal" | "purple"> = {
  FIRM: "blue",
  CLIENT: "teal",
  CONSULTANT: "purple",
};

/**
 * Presentational conversation thread for a portal/consultant submission.
 * The parent owns the query + reply mutation and passes data/handlers in. Wave 3 (Carbon).
 */
export function SubmissionThread({
  messages,
  loading,
  pending,
  onReply,
}: {
  messages: ThreadMessage[];
  loading: boolean;
  pending: boolean;
  onReply: (body: string) => void;
}) {
  const [body, setBody] = useState("");

  return (
    <CarbonScope>
      <Stack gap={5}>
        <DataState
          loading={loading}
          isEmpty={messages.length === 0}
          columnCount={1}
          empty={{ title: "No messages yet", description: "Start the conversation below." }}
        >
          <Stack gap={5}>
            {messages.map((m) => {
              const color = SIDE_TAG[m.authorSide] ?? "gray";
              return (
                <Stack key={m.id} gap={3}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <StatusDot color={color} label={m.authorName ?? m.authorSide} />
                    <span className="esti-label esti-label--helper">
                      {new Date(m.createdAt as string).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <p className="cds--type-body-01" style={{ margin: 0 }}>
                    {m.body}
                  </p>
                </Stack>
              );
            })}
          </Stack>
        </DataState>

        <Stack gap={3}>
          <TextArea
            id="thread-reply"
            labelText="Reply"
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div>
            <Button
              size="sm"
              disabled={!body.trim() || pending}
              onClick={() => {
                onReply(body.trim());
                setBody("");
              }}
            >
              {pending ? "Sending…" : "Send reply"}
            </Button>
          </div>
        </Stack>
      </Stack>
    </CarbonScope>
  );
}
