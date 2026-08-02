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
  BILL_TYPE_LABEL,
  BillType,
  RUNNING_BILL_STATUS_LABEL,
  RUNNING_BILL_STATUS_TAG,
  canAdvanceRunningBill,
  formatINR,
  parseRupeeInput,
  type BillType as BillTypeT,
  type RunningBillStatus,
} from "@esti/contracts";
import { pushToast, useScreenActions } from "@hcw/ui-kit";
import { useState } from "react";
import { DataState } from "../DataState.js";
import { StatusTag } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";

type LineForm = {
  description: string;
  unit: string;
  qty: string;
  rate: string;
  previousBilledQty: string;
};

const blankLine = (): LineForm => ({
  description: "",
  unit: "cum",
  qty: "1",
  rate: "",
  previousBilledQty: "0",
});

/** Project › RA bills — architect certification of contractor running bills. */
export function ProjectRunningBills({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.runningBills.listByProject.useQuery({ projectId });
  const contractorsQ = trpc.contractors.list.useQuery({ activeOnly: true });
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [billType, setBillType] = useState<BillTypeT>("RA");
  const [contractorId, setContractorId] = useState("");
  const [lines, setLines] = useState<LineForm[]>([blankLine()]);
  const [deductions, setDeductions] = useState({
    retention: "",
    advance: "",
    tds: "",
    other: "",
  });

  const detailQ = trpc.runningBills.byId.useQuery({ id: openId! }, { enabled: !!openId });

  useScreenActions(
    createOpen || !!openId
      ? []
      : [
          {
            id: "new-ra",
            zone: "center",
            tone: "primary",
            label: "New RA bill",
            icon: <AddIcon />,
            onClick: () => setCreateOpen(true),
          },
        ],
    [createOpen, openId],
  );

  const invalidate = () => {
    utils.runningBills.listByProject.invalidate({ projectId });
    if (openId) utils.runningBills.byId.invalidate({ id: openId });
  };

  const create = trpc.runningBills.create.useMutation({
    meta: { errorTitle: "Couldn't create the RA bill" },
    onSuccess: (row) => {
      invalidate();
      setCreateOpen(false);
      setTitle("");
      setLines([blankLine()]);
      setOpenId(row.id);
      pushToast({ kind: "success", title: "RA bill created" });
    },
  });

  const siteCheck = trpc.runningBills.siteCheck.useMutation({
    meta: { errorTitle: "Couldn't site-check" },
    onSuccess: () => {
      invalidate();
      pushToast({ kind: "success", title: "Site checked" });
    },
  });

  const advance = trpc.runningBills.advance.useMutation({
    meta: { errorTitle: "Couldn't advance status" },
    onSuccess: (_d, v) => {
      invalidate();
      pushToast({
        kind: "success",
        title: RUNNING_BILL_STATUS_LABEL[v.status as RunningBillStatus],
      });
    },
  });

  const rows = listQ.data ?? [];
  const detail = detailQ.data;

  if (openId && detail) {
    const b = detail.bill;
    const status = b.status as RunningBillStatus;
    return (
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Button size="small" variant="text" onClick={() => setOpenId(null)}>
            ← All bills
          </Button>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {b.ref} — {b.title}
          </Typography>
          <StatusTag
            value={status}
            map={RUNNING_BILL_STATUS_TAG}
            label={RUNNING_BILL_STATUS_LABEL[status]}
          />
          <Typography variant="body2" color="text.secondary">
            {BILL_TYPE_LABEL[b.billType as BillTypeT] ?? b.billType} · Gross{" "}
            {formatINR(b.totalPaise)} · Net {formatINR(b.netPayablePaise)}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          {canAdvanceRunningBill(status, "SITE_CHECKED") && (
            <Button
              size="small"
              variant="outlined"
              disabled={siteCheck.isPending}
              onClick={() => siteCheck.mutate({ id: b.id })}
            >
              Mark site checked
            </Button>
          )}
          {(["CERTIFIED", "SENT_TO_CLIENT", "CLOSED"] as RunningBillStatus[]).map((s) =>
            canAdvanceRunningBill(status, s) ? (
              <Button
                key={s}
                size="small"
                variant={s === "CERTIFIED" ? "contained" : "outlined"}
                disabled={advance.isPending}
                onClick={() => advance.mutate({ id: b.id, status: s })}
              >
                {RUNNING_BILL_STATUS_LABEL[s]}
              </Button>
            ) : null,
          )}
        </Stack>
        {(siteCheck.error || advance.error) && (
          <Alert severity="error">
            {siteCheck.error?.message || advance.error?.message}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary">
          Deductions — retention {formatINR(b.retentionPaise)} · advance{" "}
          {formatINR(b.advanceRecoveryPaise)} · TDS {formatINR(b.taxTdsPaise)} · other{" "}
          {formatINR(b.otherRecoveryPaise)}
        </Typography>

        <DataGrid
          rows={detail.items}
          columns={[
            { field: "description", headerName: "Description", flex: 1.4, minWidth: 160 },
            { field: "unit", headerName: "Unit", width: 80 },
            { field: "previousBilledQty", headerName: "Prev", width: 80 },
            { field: "qty", headerName: "This bill", width: 90 },
            { field: "cumulativeBilledQty", headerName: "Cumul.", width: 90 },
            {
              field: "ratePaise",
              headerName: "Rate",
              width: 100,
              valueGetter: (_v, row) => formatINR(row.ratePaise),
            },
            {
              field: "amountPaise",
              headerName: "Amount",
              width: 110,
              valueGetter: (_v, row) => formatINR(row.amountPaise),
            },
          ]}
          density="compact"
          autoHeight
          hideFooter
          disableRowSelectionOnClick
        />
      </Stack>
    );
  }

  const listCols: GridColDef[] = [
    { field: "ref", headerName: "Ref", width: 130 },
    { field: "title", headerName: "Title", flex: 1.2, minWidth: 140 },
    {
      field: "billType",
      headerName: "Type",
      width: 120,
      valueGetter: (_v, row) => BILL_TYPE_LABEL[row.billType as BillTypeT] ?? row.billType,
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (p) => (
        <StatusTag
          value={p.row.status as RunningBillStatus}
          map={RUNNING_BILL_STATUS_TAG}
          label={RUNNING_BILL_STATUS_LABEL[p.row.status as RunningBillStatus]}
        />
      ),
    },
    {
      field: "netPayablePaise",
      headerName: "Net",
      width: 120,
      valueGetter: (_v, row) => formatINR(row.netPayablePaise),
    },
  ];

  return (
    <>
      <Stack spacing={1.5}>
        <Typography variant="body2" color="text.secondary">
          Contractor running / RA bills for architect site check and certification. Gross less
          retention, advance recovery, TDS, and other recoveries.
        </Typography>
        <DataState
          loading={listQ.isLoading}
          isEmpty={rows.length === 0}
          columnCount={5}
          empty={{
            title: "No RA bills yet",
            description: "Create a bill with measured quantities and rates.",
            action: (
              <Button size="small" variant="outlined" onClick={() => setCreateOpen(true)}>
                New RA bill
              </Button>
            ),
          }}
        >
          <DataGrid
            rows={rows}
            columns={listCols}
            density="compact"
            autoHeight
            hideFooter
            onRowClick={(p) => setOpenId(p.row.id)}
            sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
          />
        </DataState>
      </Stack>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>New RA bill</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Stack direction="row" spacing={1}>
              <TextField
                select
                label="Type"
                value={billType}
                onChange={(e) => setBillType(e.target.value as BillTypeT)}
                sx={{ minWidth: 180 }}
              >
                {BillType.options.map((t) => (
                  <MenuItem key={t} value={t}>
                    {BILL_TYPE_LABEL[t]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Contractor"
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value)}
                sx={{ flex: 1 }}
              >
                <MenuItem value="">— optional —</MenuItem>
                {(contractorsQ.data ?? []).map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Typography variant="overline" color="text.secondary">
              Lines
            </Typography>
            {lines.map((ln, i) => (
              <Stack key={i} direction="row" spacing={1}>
                <TextField
                  label="Description"
                  value={ln.description}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...ln, description: e.target.value };
                    setLines(next);
                  }}
                  sx={{ flex: 1.4 }}
                />
                <TextField
                  label="Unit"
                  value={ln.unit}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...ln, unit: e.target.value };
                    setLines(next);
                  }}
                  sx={{ width: 80 }}
                />
                <TextField
                  label="Qty"
                  value={ln.qty}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...ln, qty: e.target.value };
                    setLines(next);
                  }}
                  sx={{ width: 90 }}
                />
                <TextField
                  label="Rate ₹"
                  value={ln.rate}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...ln, rate: e.target.value };
                    setLines(next);
                  }}
                  sx={{ width: 110 }}
                />
                <TextField
                  label="Prev qty"
                  value={ln.previousBilledQty}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...ln, previousBilledQty: e.target.value };
                    setLines(next);
                  }}
                  sx={{ width: 90 }}
                />
              </Stack>
            ))}
            <Button size="small" onClick={() => setLines([...lines, blankLine()])}>
              Add line
            </Button>

            <Typography variant="overline" color="text.secondary">
              Deductions (₹)
            </Typography>
            <Stack direction="row" spacing={1}>
              {(
                [
                  ["retention", "Retention"],
                  ["advance", "Advance recovery"],
                  ["tds", "TDS"],
                  ["other", "Other"],
                ] as const
              ).map(([k, label]) => (
                <TextField
                  key={k}
                  label={label}
                  value={deductions[k]}
                  onChange={(e) => setDeductions({ ...deductions, [k]: e.target.value })}
                />
              ))}
            </Stack>
            {create.error && <Alert severity="error">{create.error.message}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!title || lines.every((l) => !l.description) || create.isPending}
            onClick={() =>
              create.mutate({
                projectId,
                title,
                billType,
                contractorId: contractorId || undefined,
                deductions: {
                  retentionPaise: parseRupeeInput(deductions.retention) ?? 0,
                  advanceRecoveryPaise: parseRupeeInput(deductions.advance) ?? 0,
                  taxTdsPaise: parseRupeeInput(deductions.tds) ?? 0,
                  otherRecoveryPaise: parseRupeeInput(deductions.other) ?? 0,
                },
                items: lines
                  .filter((l) => l.description.trim())
                  .map((l) => ({
                    description: l.description,
                    unit: l.unit || "nos",
                    qty: Number(l.qty) || 0,
                    ratePaise: parseRupeeInput(l.rate) ?? 0,
                    previousBilledQty: Number(l.previousBilledQty) || 0,
                  })),
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
