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
import { can } from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../../lib/auth.js";
import { trpc } from "../../lib/trpc.js";
import { StatusDot } from "../StatusTag.js";

const shrink = { slotProps: { inputLabel: { shrink: true } } } as const;

/** Period progress reports (MPR-style) — reuses `progressReports` tRPC. */
export function ProjectProgressReports({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const listQ = trpc.progressReports.listByProject.useQuery({ projectId });
  const invalidate = () => utils.progressReports.listByProject.invalidate({ projectId });

  const create = trpc.progressReports.createDraft.useMutation({
    meta: { errorTitle: "Couldn't create the progress report" },
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      resetForm();
    },
  });
  const update = trpc.progressReports.update.useMutation({
    meta: { errorTitle: "Couldn't update the progress report" },
    onSuccess: invalidate,
  });
  const issue = trpc.progressReports.generatePdf.useMutation({
    meta: { errorTitle: "Couldn't issue the progress report" },
    onSuccess: invalidate,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    periodStart: "",
    periodEnd: "",
    narrative: "",
    physicalProgressPct: "",
  });
  const resetForm = () =>
    setForm({ periodStart: "", periodEnd: "", narrative: "", physicalProgressPct: "" });

  const canWrite = can(user?.role, "write");
  const rows = listQ.data ?? [];

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="h6" component="h4">
          Progress reports
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Client MIS · physical % · open snags snapshot
        </Typography>
        {canWrite && (
          <Button size="small" variant="contained" onClick={() => setCreateOpen(true)}>
            New draft
          </Button>
        )}
      </Stack>

      {listQ.isLoading && (
        <Stack spacing={0.5}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={48} />
          ))}
        </Stack>
      )}
      {rows.length === 0 && !listQ.isLoading && (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2">
            No progress reports yet. Draft a period narrative for the client (MPR-style).
          </Typography>
        </Box>
      )}

      <Stack spacing={1}>
        {rows.map((r) => (
          <Box key={r.id} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {r.periodStart} → {r.periodEnd}
                </Typography>
                <StatusDot
                  color={r.status === "ISSUED" ? "green" : "blue"}
                  label={r.status === "ISSUED" ? "Issued" : "Draft"}
                />
                {r.physicalProgressPct != null && (
                  <Typography variant="caption" color="text.secondary">
                    {r.physicalProgressPct}% physical
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {r.openSnagCount} open snags
                </Typography>
              </Stack>
              {r.narrative && (
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                  {r.narrative}
                </Typography>
              )}
              {canWrite && r.status === "DRAFT" && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={issue.isPending}
                    onClick={() => issue.mutate({ id: r.id, projectId })}
                  >
                    Issue PDF
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    disabled={update.isPending || r.physicalProgressPct == null}
                    onClick={() => {
                      const next = window.prompt(
                        "Physical progress % (0–100)",
                        String(r.physicalProgressPct ?? 0),
                      );
                      if (next == null) return;
                      const n = Number(next);
                      if (!Number.isFinite(n) || n < 0 || n > 100) return;
                      update.mutate({ id: r.id, projectId, physicalProgressPct: Math.round(n) });
                    }}
                  >
                    Edit %
                  </Button>
                </Stack>
              )}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog
        aria-labelledby="progress-report-create-title"
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetForm();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="progress-report-create-title">New progress report draft</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Period start"
              type="date"
              value={form.periodStart}
              onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
              fullWidth
              required
              {...shrink}
            />
            <TextField
              label="Period end"
              type="date"
              value={form.periodEnd}
              onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
              fullWidth
              required
              {...shrink}
            />
            <TextField
              label="Physical progress %"
              type="number"
              value={form.physicalProgressPct}
              onChange={(e) => setForm((f) => ({ ...f, physicalProgressPct: e.target.value }))}
              fullWidth
              slotProps={{ htmlInput: { min: 0, max: 100 } }}
            />
            <TextField
              label="Narrative"
              value={form.narrative}
              onChange={(e) => setForm((f) => ({ ...f, narrative: e.target.value }))}
              fullWidth
              multiline
              minRows={3}
              placeholder="Works done, issues, look-ahead…"
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
            disabled={!form.periodStart || !form.periodEnd || create.isPending}
            onClick={() => {
              const pct = form.physicalProgressPct.trim()
                ? Math.round(Number(form.physicalProgressPct))
                : undefined;
              create.mutate({
                projectId,
                periodStart: form.periodStart,
                periodEnd: form.periodEnd,
                narrative: form.narrative.trim() || undefined,
                physicalProgressPct:
                  pct != null && Number.isFinite(pct) && pct >= 0 && pct <= 100 ? pct : undefined,
              });
            }}
          >
            Create draft
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
