import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  PMC_MILESTONE_STATUS_LABEL,
  PmcMilestoneStatus,
  can,
} from "@esti/contracts";
import { useRef, useState } from "react";
import { useAuth } from "../../lib/auth.js";
import { trpc } from "../../lib/trpc.js";
import { StatusDot } from "../StatusTag.js";

const STATUS_TAG: Record<string, "gray" | "green" | "red" | "blue" | "teal"> = {
  PLANNED: "gray",
  ON_TRACK: "green",
  AT_RISK: "teal",
  DELAYED: "red",
  COMPLETE: "blue",
};

const shrink = { slotProps: { inputLabel: { shrink: true } } } as const;

/** Master programme milestones — AProc Wave 2 (governance, not CPM). */
export function ProjectProgramme({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const listQ = trpc.pmcMilestones.listByProject.useQuery({ projectId });
  const invalidate = () => {
    void utils.pmcMilestones.listByProject.invalidate({ projectId });
    void utils.pmcMilestones.portfolioAttention.invalidate();
    void utils.pmcMilestones.summaryByProject.invalidate({ projectId });
  };

  const create = trpc.pmcMilestones.create.useMutation({
    meta: { errorTitle: "Couldn't create the milestone" },
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      resetForm();
    },
  });
  const update = trpc.pmcMilestones.update.useMutation({
    meta: { errorTitle: "Couldn't update the milestone" },
    onSuccess: invalidate,
  });
  const remove = trpc.pmcMilestones.remove.useMutation({
    meta: { errorTitle: "Couldn't remove the milestone" },
    onSuccess: invalidate,
  });
  const importCsv = trpc.pmcMilestones.importCsv.useMutation({
    meta: { errorTitle: "Couldn't import CSV" },
    onSuccess: (res) => {
      invalidate();
      setCsvOpen(false);
      setCsvText("");
      window.alert(`Imported ${res.count} milestone${res.count === 1 ? "" : "s"}`);
    },
  });
  const importXer = trpc.pmcMilestones.importXer.useMutation({
    meta: { errorTitle: "Couldn't import XER" },
    onSuccess: (res) => {
      invalidate();
      setXerOpen(false);
      setXerText("");
      setIncludeActivities(false);
      window.alert(`Imported ${res.count} milestone${res.count === 1 ? "" : "s"} from XER`);
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [xerOpen, setXerOpen] = useState(false);
  const [xerText, setXerText] = useState("");
  const [includeActivities, setIncludeActivities] = useState(false);
  const xerFileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    plannedDate: "",
    baselineRef: "",
    notes: "",
  });
  const resetForm = () => setForm({ title: "", plannedDate: "", baselineRef: "", notes: "" });

  const canWrite = can(user?.role, "write");
  const rows = listQ.data ?? [];
  const attention = rows.filter((r) => r.status === "AT_RISK" || r.status === "DELAYED").length;
  const complete = rows.filter((r) => r.status === "COMPLETE").length;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="h6" component="h4">
          Programme
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {complete}/{rows.length} complete
          {attention > 0 ? ` · ${attention} need attention` : ""}
        </Typography>
        {canWrite && (
          <>
            <Button size="small" variant="contained" onClick={() => setCreateOpen(true)}>
              Add milestone
            </Button>
            <Button size="small" variant="outlined" onClick={() => setCsvOpen(true)}>
              Import CSV
            </Button>
            <Button size="small" variant="outlined" onClick={() => setXerOpen(true)}>
              Import P6 XER
            </Button>
          </>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Master programme for client reporting. Not a contractor CPM schedule — import P6 XER
        milestones (or CSV). Activity IDs land in Baseline ref.
      </Typography>

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
            No milestones yet. Add key dates the PMC tracks for the client.
          </Typography>
        </Box>
      )}

      <Stack spacing={1}>
        {rows.map((m) => (
          <Box key={m.id} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {m.ref}
                </Typography>
                <StatusDot
                  color={STATUS_TAG[m.status] ?? "gray"}
                  label={
                    PMC_MILESTONE_STATUS_LABEL[m.status as PmcMilestoneStatus] ?? m.status
                  }
                />
                <Typography variant="caption" color="text.secondary">
                  {m.percentComplete}%
                </Typography>
                {m.plannedDate && (
                  <Typography variant="caption" color="text.secondary">
                    Planned {m.plannedDate}
                  </Typography>
                )}
              </Stack>
              <Typography variant="body2">{m.title}</Typography>
              {m.baselineRef && (
                <Typography variant="caption" color="text.secondary">
                  Baseline {m.baselineRef}
                </Typography>
              )}
              {canWrite && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  {m.status !== "COMPLETE" && (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({ id: m.id, projectId, status: "ON_TRACK" })
                        }
                      >
                        On track
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({ id: m.id, projectId, status: "AT_RISK" })
                        }
                      >
                        At risk
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({ id: m.id, projectId, status: "DELAYED" })
                        }
                      >
                        Delayed
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({
                            id: m.id,
                            projectId,
                            status: "COMPLETE",
                            percentComplete: 100,
                            actualDate: new Date().toISOString().slice(0, 10),
                          })
                        }
                      >
                        Complete
                      </Button>
                    </>
                  )}
                  <TextField
                    select
                    size="small"
                    label="%"
                    value={m.percentComplete}
                    sx={{ width: 88 }}
                    disabled={update.isPending || m.status === "COMPLETE"}
                    onChange={(e) =>
                      update.mutate({
                        id: m.id,
                        projectId,
                        percentComplete: Number(e.target.value),
                      })
                    }
                  >
                    {[0, 25, 50, 75, 100].map((n) => (
                      <MenuItem key={n} value={n}>
                        {n}%
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button
                    size="small"
                    variant="text"
                    color="error"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Remove milestone ${m.ref}?`)) {
                        remove.mutate({ id: m.id, projectId });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </Stack>
              )}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog
        aria-labelledby="pmc-milestone-csv-title"
        open={csvOpen}
        onClose={() => {
          setCsvOpen(false);
          setCsvText("");
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="pmc-milestone-csv-title">Import milestones (CSV)</DialogTitle>
        <DialogContent>
          <TextField
            label="CSV"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            fullWidth
            multiline
            minRows={8}
            placeholder={"title,plannedDate,baselineRef,notes\nSlab cast,2026-08-01,A1020,"}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCsvOpen(false);
              setCsvText("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={csvText.trim().length < 3 || importCsv.isPending}
            onClick={() => importCsv.mutate({ projectId, csv: csvText })}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        aria-labelledby="pmc-milestone-xer-title"
        open={xerOpen}
        onClose={() => {
          setXerOpen(false);
          setXerText("");
          setIncludeActivities(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="pmc-milestone-xer-title">Import P6 XER</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Imports Primavera P6 milestones (TT_Mile / TT_FinMile) and WBS steps into the master
              programme. Does not build a CPM network.
            </Typography>
            <input
              ref={xerFileRef}
              type="file"
              accept=".xer,text/plain"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setXerText(typeof reader.result === "string" ? reader.result : "");
                };
                reader.readAsText(file);
                e.target.value = "";
              }}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={() => xerFileRef.current?.click()}
              sx={{ alignSelf: "flex-start" }}
            >
              Choose .xer file
            </Button>
            <TextField
              label="XER contents"
              value={xerText}
              onChange={(e) => setXerText(e.target.value)}
              fullWidth
              multiline
              minRows={8}
              placeholder="Paste XER text or choose a .xer file"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={includeActivities}
                  onChange={(e) => setIncludeActivities(e.target.checked)}
                />
              }
              label="Include all activities (not only milestones)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setXerOpen(false);
              setXerText("");
              setIncludeActivities(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={xerText.trim().length < 10 || importXer.isPending}
            onClick={() =>
              importXer.mutate({
                projectId,
                xer: xerText,
                includeActivities: includeActivities || undefined,
              })
            }
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        aria-labelledby="pmc-milestone-create-title"
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetForm();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="pmc-milestone-create-title">Add milestone</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Planned date"
              type="date"
              value={form.plannedDate}
              onChange={(e) => setForm((f) => ({ ...f, plannedDate: e.target.value }))}
              fullWidth
              {...shrink}
            />
            <TextField
              label="Baseline ref (MSP/P6)"
              value={form.baselineRef}
              onChange={(e) => setForm((f) => ({ ...f, baselineRef: e.target.value }))}
              fullWidth
              placeholder="Optional activity / WBS code"
            />
            <TextField
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
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
            disabled={form.title.trim().length < 2 || create.isPending}
            onClick={() =>
              create.mutate({
                projectId,
                title: form.title.trim(),
                plannedDate: form.plannedDate || undefined,
                baselineRef: form.baselineRef.trim() || undefined,
                notes: form.notes.trim() || undefined,
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
