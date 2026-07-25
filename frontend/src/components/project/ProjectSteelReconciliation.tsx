import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import {
  STEEL_RECON_STATUS_LABEL,
  STEEL_RECON_STATUS_TAG,
  STEEL_WASTAGE_SEVERITY_LABEL,
  STEEL_WASTAGE_SEVERITY_TAG,
  steelReconLineVariance,
  type SteelReconStatus,
} from "@esti/contracts";
import { pushToast, useScreenActions } from "@hcw/ui-kit";
import { useState } from "react";
import { DataState } from "../DataState.js";
import { StatusTag } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";

/** Project › Steel — scheduled (BBS) vs issued vs consumed by diameter. */
export function ProjectSteelReconciliation({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.steelReconciliation.listByProject.useQuery({ projectId });
  const bbsQ = trpc.bbs.listByProject.useQuery({ projectId });
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [bbsId, setBbsId] = useState("");
  const [lineOpen, setLineOpen] = useState(false);
  const [line, setLine] = useState({
    diaMm: "12",
    scheduledKg: "0",
    issuedKg: "0",
    consumedKg: "0",
  });

  const detailQ = trpc.steelReconciliation.byId.useQuery(
    { id: openId! },
    { enabled: !!openId },
  );

  useScreenActions(
    createOpen || lineOpen || !!openId
      ? []
      : [
          {
            id: "new-steel-recon",
            zone: "center",
            tone: "primary",
            label: "New reconciliation",
            icon: <AddIcon />,
            onClick: () => setCreateOpen(true),
          },
        ],
    [createOpen, lineOpen, openId],
  );

  const invalidate = () => {
    utils.steelReconciliation.listByProject.invalidate({ projectId });
    if (openId) utils.steelReconciliation.byId.invalidate({ id: openId });
  };

  const create = trpc.steelReconciliation.create.useMutation({
    meta: { errorTitle: "Couldn't create reconciliation" },
    onSuccess: (row) => {
      invalidate();
      setCreateOpen(false);
      setTitle("");
      setBbsId("");
      setOpenId(row.id);
      pushToast({ kind: "success", title: "Steel reconciliation created" });
    },
  });

  const seed = trpc.steelReconciliation.seedFromBbs.useMutation({
    meta: { errorTitle: "Couldn't seed from BBS" },
    onSuccess: () => {
      invalidate();
      pushToast({ kind: "success", title: "Seeded from BBS" });
    },
  });

  const addLine = trpc.steelReconciliation.addLine.useMutation({
    meta: { errorTitle: "Couldn't add line" },
    onSuccess: () => {
      invalidate();
      setLineOpen(false);
    },
  });

  const updateLine = trpc.steelReconciliation.updateLine.useMutation({
    meta: { errorTitle: "Couldn't update line" },
    onSuccess: invalidate,
  });

  const finalize = trpc.steelReconciliation.finalize.useMutation({
    meta: { errorTitle: "Couldn't finalize" },
    onSuccess: () => {
      invalidate();
      pushToast({ kind: "success", title: "Finalized" });
    },
  });

  const rows = listQ.data ?? [];
  const detail = detailQ.data;

  if (openId && detail) {
    const draft = detail.status === "DRAFT";
    const cols: GridColDef[] = [
      { field: "diaMm", headerName: "Ø mm", width: 80 },
      { field: "scheduledKg", headerName: "Scheduled", width: 110 },
      {
        field: "issuedKg",
        headerName: "Issued",
        width: 120,
        renderCell: (p) =>
          draft ? (
            <TextField
              size="small"
              type="number"
              defaultValue={p.row.issuedKg}
              onBlur={(e) =>
                updateLine.mutate({
                  id: p.row.id,
                  reconciliationId: detail.id,
                  issuedKg: Number(e.target.value) || 0,
                })
              }
            />
          ) : (
            p.row.issuedKg
          ),
      },
      {
        field: "consumedKg",
        headerName: "Consumed",
        width: 120,
        renderCell: (p) =>
          draft ? (
            <TextField
              size="small"
              type="number"
              defaultValue={p.row.consumedKg}
              onBlur={(e) =>
                updateLine.mutate({
                  id: p.row.id,
                  reconciliationId: detail.id,
                  consumedKg: Number(e.target.value) || 0,
                })
              }
            />
          ) : (
            p.row.consumedKg
          ),
      },
      {
        field: "wastage",
        headerName: "Wastage",
        flex: 1,
        minWidth: 160,
        renderCell: (p) => {
          const v = steelReconLineVariance(p.row);
          return (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <span>
                {v.wastageKg.toFixed(2)} kg ({v.wastagePct}%)
              </span>
              <StatusTag
                value={v.severity}
                map={STEEL_WASTAGE_SEVERITY_TAG}
                label={STEEL_WASTAGE_SEVERITY_LABEL[v.severity]}
              />
            </Stack>
          );
        },
      },
    ];

    return (
      <>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Button size="small" variant="text" onClick={() => setOpenId(null)}>
              ← All
            </Button>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {detail.ref} — {detail.title}
            </Typography>
            <StatusTag
              value={detail.status as SteelReconStatus}
              map={STEEL_RECON_STATUS_TAG}
              label={STEEL_RECON_STATUS_LABEL[detail.status as SteelReconStatus]}
            />
            <Typography variant="body2" color="text.secondary">
              Σ {detail.totals.scheduledKg} sched · {detail.totals.issuedKg} issued ·{" "}
              {detail.totals.consumedKg} consumed · {detail.totals.wastageKg} wastage kg
            </Typography>
          </Stack>

          {draft && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              <TextField
                select
                size="small"
                label="Seed from BBS"
                value={bbsId}
                onChange={(e) => setBbsId(e.target.value)}
                sx={{ minWidth: 220 }}
              >
                {(bbsQ.data ?? []).map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.ref} — {b.title}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                size="small"
                variant="outlined"
                disabled={!bbsId || seed.isPending}
                onClick={() =>
                  seed.mutate({ reconciliationId: detail.id, bbsId })
                }
              >
                Seed
              </Button>
              <Button size="small" variant="outlined" onClick={() => setLineOpen(true)}>
                Add diameter
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={finalize.isPending || detail.lines.length === 0}
                onClick={() => finalize.mutate({ id: detail.id })}
              >
                Finalize
              </Button>
            </Stack>
          )}
          {finalize.error && <Alert severity="error">{finalize.error.message}</Alert>}

          <DataGrid
            rows={detail.lines}
            columns={cols}
            density="compact"
            autoHeight
            hideFooter
            disableRowSelectionOnClick
            getRowHeight={() => "auto"}
          />
        </Stack>

        <Dialog open={lineOpen} onClose={() => setLineOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>Add diameter line</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {(["diaMm", "scheduledKg", "issuedKg", "consumedKg"] as const).map((k) => (
                <TextField
                  key={k}
                  label={k}
                  value={line[k]}
                  onChange={(e) => setLine({ ...line, [k]: e.target.value })}
                />
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLineOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() =>
                addLine.mutate({
                  reconciliationId: detail.id,
                  diaMm: Number(line.diaMm),
                  scheduledKg: Number(line.scheduledKg) || 0,
                  issuedKg: Number(line.issuedKg) || 0,
                  consumedKg: Number(line.consumedKg) || 0,
                })
              }
            >
              Add
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Stack spacing={1.5}>
        <Typography variant="body2" color="text.secondary">
          Compare BBS scheduled steel with issued and consumed quantities by diameter. Wastage =
          issued − consumed (warn &gt;3%, exceed &gt;5%).
        </Typography>
        <DataState
          loading={listQ.isLoading}
          isEmpty={rows.length === 0}
          columnCount={3}
          empty={{
            title: "No steel reconciliations",
            description: "Create one and seed diameters from a project BBS.",
            action: (
              <Button size="small" variant="outlined" onClick={() => setCreateOpen(true)}>
                New reconciliation
              </Button>
            ),
          }}
        >
          <DataGrid
            rows={rows}
            columns={[
              { field: "ref", headerName: "Ref", width: 140 },
              { field: "title", headerName: "Title", flex: 1 },
              {
                field: "status",
                headerName: "Status",
                width: 120,
                renderCell: (p) => (
                  <StatusTag
                    value={p.row.status as SteelReconStatus}
                    map={STEEL_RECON_STATUS_TAG}
                    label={STEEL_RECON_STATUS_LABEL[p.row.status as SteelReconStatus]}
                  />
                ),
              },
              {
                field: "wastageKg",
                headerName: "Wastage kg",
                width: 120,
                valueGetter: (_v, row) => Number(row.wastageKg).toFixed(2),
              },
            ]}
            density="compact"
            autoHeight
            hideFooter
            onRowClick={(p) => setOpenId(p.row.id)}
            sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
          />
        </DataState>
      </Stack>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New steel reconciliation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextField
              select
              label="Seed from BBS (optional)"
              value={bbsId}
              onChange={(e) => setBbsId(e.target.value)}
            >
              <MenuItem value="">— none —</MenuItem>
              {(bbsQ.data ?? []).map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.ref} — {b.title}
                </MenuItem>
              ))}
            </TextField>
            {create.error && <Alert severity="error">{create.error.message}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!title || create.isPending}
            onClick={() =>
              create.mutate({
                projectId,
                title,
                bbsId: bbsId || undefined,
              })
            }
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
