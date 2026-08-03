import { Button, Stack, TextArea } from "@carbon/react";
import { useState } from "react";
import { CarbonScope } from "../carbon/CarbonScope.js";
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
    <CarbonScope>
      <div style={{ padding: "1rem" }}>
        <Stack gap={5}>
          <Stack gap={3}>
            <h3 className="cds--type-heading-03" style={{ margin: 0 }}>
              {heading}
            </h3>
            {description && (
              <p className="cds--type-body-01" style={{ margin: 0 }}>
                {description}
              </p>
            )}
          </Stack>
          <TextArea
            id={`comment-${objectType}-${objectId}`}
            labelText="Add a contextual comment"
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div>
            <Button
              disabled={!body.trim() || create.isPending}
              onClick={() => create.mutate({ projectId, objectType, objectId, body })}
            >
              {create.isPending ? "Adding…" : "Add comment"}
            </Button>
          </div>
          <Stack gap={5}>
            {(commentsQ.data?.rows ?? []).map((comment) => (
              <Stack key={comment.id} gap={3}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <StatusDot color="blue" label={comment.visibility} />
                  <span>{comment.actorName ?? "System"}</span>
                  <span className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
                    {new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(comment.createdAt))}
                  </span>
                </div>
                <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{comment.body}</p>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </div>
    </CarbonScope>
  );
}
