import { MenuItem, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { can } from "@esti/contracts";
import { StatusDot } from "../../carbon/adapters/index.js";
import { useAuth } from "../../lib/auth.js";
import { trpc } from "../../lib/trpc.js";

const STATUS_TAG: Record<string, "gray" | "blue" | "green"> = {
  NOT_STARTED: "gray",
  IN_PROGRESS: "blue",
  COMPLETE: "green",
};

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETE: "Complete",
};

/** CA / handover live stages — AProc W1.6 (`phaseProgress`). */
export function ProjectPhaseProgress({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const listQ = trpc.phaseProgress.listByProject.useQuery({ projectId });
  const update = trpc.phaseProgress.update.useMutation({
    meta: { errorTitle: "Couldn't update phase stage" },
    onSuccess: () => void utils.phaseProgress.listByProject.invalidate({ projectId }),
  });

  const canWrite = can(user?.role, "write");
  const rows = listQ.data ?? [];

  const byPhase = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.phaseId;
    const list = byPhase.get(key) ?? [];
    list.push(r);
    byPhase.set(key, list);
  }

  return (
    <Stack spacing={2.5}>
      <Stack spacing={1}>
        <Typography variant="h6" sx={{ m: 0 }}>
          Phase stages
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ m: 0 }}>
          Live stages within Construction Administration and Handover — owner-side progress for
          the client, not a contractor CPM network.
        </Typography>
      </Stack>

      {listQ.isLoading && (
        <Stack spacing={1}>
          <Skeleton />
          <Skeleton />
          <Skeleton width="60%" />
        </Stack>
      )}

      {!listQ.isLoading && rows.length === 0 && (
        <Typography variant="body2">
          No live stages yet. Add Construction Administration or Handover phases on this project
          to seed stage checklists.
        </Typography>
      )}

      {[...byPhase.entries()].map(([phaseId, stages]) => {
        const label = stages[0]?.phaseLabel ?? "Phase";
        const code = stages[0]?.phaseCode ?? "";
        return (
          <Stack key={phaseId} spacing={1.5}>
            <Typography variant="subtitle2" sx={{ m: 0 }}>
              {label}
              {code ? (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {code}
                </Typography>
              ) : null}
            </Typography>
            {stages.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.5rem 0",
                  borderBottom: "1px solid var(--cds-border-subtle)",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <StatusDot color={STATUS_TAG[s.status] ?? "gray"} label={STATUS_LABEL[s.status] ?? s.status} />
                  <Typography variant="body2">{s.label}</Typography>
                </div>
                {canWrite ? (
                  <TextField
                    id={`phs-${s.id}`}
                    select
                    label="Status"
                    size="small"
                    sx={{ minWidth: 160 }}
                    value={s.status}
                    disabled={update.isPending}
                    slotProps={{ inputLabel: { shrink: true } }}
                    onChange={(e) =>
                      update.mutate({
                        id: s.id,
                        projectId,
                        status: e.target.value as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE",
                      })
                    }
                  >
                    <MenuItem value="NOT_STARTED">Not started</MenuItem>
                    <MenuItem value="IN_PROGRESS">In progress</MenuItem>
                    <MenuItem value="COMPLETE">Complete</MenuItem>
                  </TextField>
                ) : null}
              </div>
            ))}
          </Stack>
        );
      })}
    </Stack>
  );
}
