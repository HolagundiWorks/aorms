import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { DataState, StatusDot } from "@hcw/ui-kit";
import { useState } from "react";
import { COMPOSITION_RHYTHM } from "../lib/composition.js";

export interface ThreadMessage {
  id: string;
  authorName: string | null;
  authorSide: string;
  body: string;
  createdAt: string | Date;
}

const SIDE_TAG: Record<string, string> = {
  FIRM: "blue",
  CLIENT: "teal",
  CONSULTANT: "purple",
};

/**
 * Presentational conversation thread for a portal/consultant submission.
 * Parent owns the query + reply mutation and passes data/handlers in.
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
    <Stack spacing={COMPOSITION_RHYTHM.md}>
      <DataState
        loading={loading}
        isEmpty={messages.length === 0}
        columnCount={1}
        empty={{ title: "No messages yet", description: "Start the conversation below." }}
      >
        <Stack spacing={COMPOSITION_RHYTHM.md}>
          {messages.map((m) => {
            const color = SIDE_TAG[m.authorSide] ?? "gray";
            return (
              <Stack key={m.id} spacing={COMPOSITION_RHYTHM.xs}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <StatusDot color={color} label={m.authorName ?? m.authorSide} />
                  <Typography variant="caption" color="text.secondary" className="esti-label esti-label--helper">
                    {new Date(m.createdAt as string).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ m: 0 }}>
                  {m.body}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </DataState>

      <Stack spacing={COMPOSITION_RHYTHM.xs}>
        <TextField
          id="thread-reply"
          label="Reply"
          multiline
          minRows={2}
          fullWidth
          size="small"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Box>
          <Button
            variant="contained"
            size="small"
            disabled={!body.trim() || pending}
            onClick={() => {
              onReply(body.trim());
              setBody("");
            }}
          >
            {pending ? "Sending…" : "Send reply"}
          </Button>
        </Box>
      </Stack>
    </Stack>
  );
}
