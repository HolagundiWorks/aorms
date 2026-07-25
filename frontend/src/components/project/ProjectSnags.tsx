import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { SNAG_STATUS_LABEL, SnagStatus, can } from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../../lib/auth.js";
import { trpc } from "../../lib/trpc.js";
import { StatusDot } from "../StatusTag.js";

const STATUS_TAG: Record<string, "gray" | "green" | "red" | "blue" | "teal"> = {
  OPEN: "red",
  IN_PROGRESS: "blue",
  VERIFIED: "teal",
  CLOSED: "green",
};

const shrink = { slotProps: { inputLabel: { shrink: true } } } as const;

/** Project snag register — reuses `snags` tRPC (AProc Wave 1 / Studio Delivery). */
export function ProjectSnags({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const listQ = trpc.snags.listByProject.useQuery({ projectId });
  const invalidate = () => utils.snags.listByProject.invalidate({ projectId });

  const create = trpc.snags.create.useMutation({
    meta: { errorTitle: "Couldn't create the snag" },
    onSuccess: () => {
      invalidate();
      void utils.snags.portfolioOpen.invalidate();
      setCreateOpen(false);
      resetForm();
    },
  });
  const update = trpc.snags.update.useMutation({
    meta: { errorTitle: "Couldn't update the snag" },
    onSuccess: () => {
      invalidate();
      void utils.snags.portfolioOpen.invalidate();
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    description: "",
    location: "",
    trade: "",
    dueDate: "",
  });
  const resetForm = () => setForm({ description: "", location: "", trade: "", dueDate: "" });

  const canWrite = can(user?.role, "write");
  const rows = listQ.data ?? [];
  const openCount = rows.filter((r) => r.status !== "CLOSED").length;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="h6" component="h4">
          Snags
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {openCount} open · {rows.length} total
        </Typography>
        {canWrite && (
          <Button size="small" variant="contained" onClick={() => setCreateOpen(true)}>
            Log snag
          </Button>
        )}
      </Stack>

      {listQ.isLoading && (
        <Stack spacing={0.5}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={40} />
          ))}
        </Stack>
      )}
      {rows.length === 0 && !listQ.isLoading && (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2">
            No snags yet. Log defects and punch-list items the PMC tracks to closure.
          </Typography>
        </Box>
      )}

      <Stack spacing={1}>
        {rows.map((s) => (
          <Box key={s.id} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Typography variant="subtitle2" component="span" sx={{ fontWeight: 700 }}>
                  {s.ref}
                </Typography>
                <StatusDot color={STATUS_TAG[s.status] ?? "gray"} label={SNAG_STATUS_LABEL[s.status as SnagStatus] ?? s.status} />
                {s.dueDate && (
                  <Typography variant="caption" color="text.secondary">
                    Due {s.dueDate}
                  </Typography>
                )}
              </Stack>
              <Typography variant="body2">{s.description}</Typography>
              {(s.location || s.trade) && (
                <Typography variant="caption" color="text.secondary">
                  {[s.location, s.trade].filter(Boolean).join(" · ")}
                </Typography>
              )}
              {canWrite && s.status !== "CLOSED" && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  {s.status === "OPEN" && (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({ id: s.id, projectId, status: "IN_PROGRESS" })
                      }
                    >
                      In progress
                    </Button>
                  )}
                  {s.status !== "VERIFIED" && (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: s.id, projectId, status: "VERIFIED" })}
                    >
                      Verify
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="contained"
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: s.id, projectId, status: "CLOSED" })}
                  >
                    Close
                  </Button>
                </Stack>
              )}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog
        aria-labelledby="project-snag-create-title"
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetForm();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="project-snag-create-title">Log snag</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
              required
            />
            <TextField
              label="Location"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Trade"
              value={form.trade}
              onChange={(e) => setForm((f) => ({ ...f, trade: e.target.value }))}
              fullWidth
              placeholder="Civil · MEP · Finishes…"
            />
            <TextField
              label="Due date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              fullWidth
              {...shrink}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={form.description.trim().length < 2 || create.isPending}
            onClick={() =>
              create.mutate({
                projectId,
                description: form.description.trim(),
                location: form.location.trim() || undefined,
                trade: form.trade.trim() || undefined,
                dueDate: form.dueDate || undefined,
              })
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
