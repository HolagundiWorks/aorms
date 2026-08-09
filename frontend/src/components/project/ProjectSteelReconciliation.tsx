import {
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { Add } from "@carbon/icons-react";
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
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { DataGrid, DataState, StatusTag, type GridColDef } from "../../carbon/adapters/index.js";
import { trpc } from "../../lib/trpc.js";

const SUBTLE = { margin: 0, color: "var(--cds-text-secondary)" } as const;

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
            icon: <Add />,
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
            <TextField id={`issued-${p.row.id}`} label="Issued" size="small" type="number" defaultValue={p.row.issuedKg} onBlur={(e) =>
                updateLine.mutate({
                  id: p.row.id,
                  reconciliationId: detail.id,
                  issuedKg: Number(e.target.value) || 0,
                })
              } />
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
            <TextField id={`consumed-${p.row.id}`} label="Consumed" size="small" type="number" defaultValue={p.row.consumedKg} onBlur={(e) =>
                updateLine.mutate({
                  id: p.row.id,
                  reconciliationId: detail.id,
                  consumedKg: Number(e.target.value) || 0,
                })
              } />
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>
                {v.wastageKg.toFixed(2)} kg ({v.wastagePct}%)
              </span>
              <StatusTag
                value={v.severity}
                map={STEEL_WASTAGE_SEVERITY_TAG}
                label={STEEL_WASTAGE_SEVERITY_LABEL[v.severity]}
              />
            </div>
          );
        },
      },
    ];

    return (
      <>
        <CarbonScope>
          <Stack spacing={2}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <Button size="small" variant="text" onClick={() => setOpenId(null)}>
                ← All
              </Button>
              <span className="cds--type-heading-compact-01">{detail.ref} — {detail.title}</span>
              <StatusTag
                value={detail.status as SteelReconStatus}
                map={STEEL_RECON_STATUS_TAG}
                label={STEEL_RECON_STATUS_LABEL[detail.status as SteelReconStatus]}
              />
              <span className="cds--type-body-01" style={SUBTLE}>
                Σ {detail.totals.scheduledKg} sched · {detail.totals.issuedKg} issued ·{" "}
                {detail.totals.consumedKg} consumed · {detail.totals.wastageKg} wastage kg
              </span>
            </div>

            {draft && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", flexWrap: "wrap" }}>
                <div style={{ minWidth: 220 }}>
                  <TextField id="seed-bbs" size="small" label="Seed from BBS" value={bbsId} onChange={(e) => setBbsId(e.target.value)} select>
                    <MenuItem value="">Select…</MenuItem>
                    {(bbsQ.data ?? []).map((b) => (
                      <MenuItem key={b.id} value={b.id}>{`${b.ref} — ${b.title}`}</MenuItem>
                    ))}
                  </TextField>
                </div>
                <Button size="small" variant="outlined" disabled={!bbsId || seed.isPending} onClick={() => seed.mutate({ reconciliationId: detail.id, bbsId })}>
                  Seed
                </Button>
                <Button size="small" variant="outlined" onClick={() => setLineOpen(true)}>
                  Add diameter
                </Button>
                <Button size="small" disabled={finalize.isPending || detail.lines.length === 0} onClick={() => finalize.mutate({ id: detail.id })}>
                  Finalize
                </Button>
              </div>
            )}
            {finalize.error && <Alert severity="error"><AlertTitle>Error</AlertTitle>{finalize.error.message}</Alert>}

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
        </CarbonScope>

        <CarbonScope>
          <Dialog open={lineOpen} onClose={() => setLineOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Add diameter line</DialogTitle>
      <DialogContent>

            <Stack spacing={2.5}>
              {(["diaMm", "scheduledKg", "issuedKg", "consumedKg"] as const).map((k) => (
                <TextField key={k} id={`line-${k}`} label={k} value={line[k]} onChange={(e) => setLine({ ...line, [k]: e.target.value })} size="small" />
              ))}
            </Stack>
          
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setLineOpen(false)}>Cancel</Button>
        <Button variant="contained" onClick={() =>
              addLine.mutate({
                reconciliationId: detail.id,
                diaMm: Number(line.diaMm),
                scheduledKg: Number(line.scheduledKg) || 0,
                issuedKg: Number(line.issuedKg) || 0,
                consumedKg: Number(line.consumedKg) || 0,
              })
            }>Add</Button>
      </DialogActions>
    </Dialog>
        </CarbonScope>
      </>
    );
  }

  return (
    <>
      <CarbonScope>
        <Stack spacing={2}>
          <p className="cds--type-body-01" style={SUBTLE}>
            Compare BBS scheduled steel with issued and consumed quantities by diameter. Wastage =
            issued − consumed (warn &gt;3%, exceed &gt;5%).
          </p>
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
              onRowClick={(p) => setOpenId(p.row.id as string)}
            />
          </DataState>
        </Stack>
      </CarbonScope>

      <CarbonScope>
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>New steel reconciliation</DialogTitle>
      <DialogContent>

          <Stack spacing={2.5}>
            <TextField id="sr-title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} size="small" />
            <TextField id="sr-bbs" label="Seed from BBS (optional)" value={bbsId} onChange={(e) => setBbsId(e.target.value)} select size="small">
              <MenuItem value="">— none —</MenuItem>
              {(bbsQ.data ?? []).map((b) => (
                <MenuItem key={b.id} value={b.id}>{`${b.ref} — ${b.title}`}</MenuItem>
              ))}
            </TextField>
            {create.error && <Alert severity="error"><AlertTitle>Error</AlertTitle>{create.error.message}</Alert>}
          </Stack>
        
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
        <Button variant="contained" disabled={!title || create.isPending} onClick={() =>
            create.mutate({
              projectId,
              title,
              bbsId: bbsId || undefined,
            })
          }>Create</Button>
      </DialogActions>
    </Dialog>
      </CarbonScope>
    </>
  );
}
