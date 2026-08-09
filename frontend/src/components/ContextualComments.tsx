import { Button, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { StatusDot } from "../carbon/adapters/index.js";
import { trpc } from "../lib/trpc.js";

export function ContextualComments({
  projectId,
  objectType,
  objectId,
  heading,
  description,
}: {
  projectId: string;
  objectType: "projectoffice" | "task" | "moodboard" | "moodboard_item";
  objectId: string;
  heading: string;
  description?: string;
}) {
  const utils = trpc.useUtils();
  const [body, setBody] = useState("");
  const commentsQ = trpc.comments.listByObject.useQuery(
    { projectId, objectType, objectId },
    { enabled: !!projectId && !!objectId },
  );
  const create = trpc.comments.create.useMutation({
    meta: { errorTitle: "Couldn't post the comment" },
    onSuccess: async () => {
      setBody("");
      await utils.comments.listByObject.invalidate({ projectId, objectType, objectId });
      await utils.activity.listByProject.invalidate({ projectId });
    },
  });

  return (
    <div style={{ padding: "1rem" }}>
      <Stack spacing={2.5}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{ m: 0 }}>
            {heading}
          </Typography>
          {description && (
            <Typography variant="body2" sx={{ m: 0 }}>
              {description}
            </Typography>
          )}
        </Stack>
        <TextField
          id={`comment-${objectType}-${objectId}`}
          label="Add a contextual comment"
          multiline
          rows={3}
          fullWidth
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <div>
          <Button
            variant="contained"
            disabled={!body.trim() || create.isPending}
            onClick={() => create.mutate({ projectId, objectType, objectId, body })}
          >
            {create.isPending ? "Adding…" : "Add comment"}
          </Button>
        </div>
        <Stack spacing={2.5}>
          {(commentsQ.data?.rows ?? []).map((comment) => (
            <Stack key={comment.id} spacing={1.5}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <StatusDot color="blue" label={comment.visibility} />
                <span>{comment.actorName ?? "System"}</span>
                <Typography variant="caption" color="text.secondary">
                  {new Intl.DateTimeFormat("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(comment.createdAt))}
                </Typography>
              </div>
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{comment.body}</p>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </div>
  );
}
