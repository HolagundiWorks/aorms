/**
 * P7.2 — manual India usage billing: list reports, export CSV, mark billed.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
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
import { DataGrid, StatusDot, type GridColDef } from "../../carbon/adapters/index.js";
import { RowActionsMenu } from "../../components/RowActionsMenu.js";
import { trpc } from "../lib/trpc";

type Rows = Awaited<ReturnType<typeof trpc.admin.usageReports.list.query>>;

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export default function UsageReportsTab() {
  const [periodStart, setPeriodStart] = useState(currentPeriod);
  const [billed, setBilled] = useState<"all" | "billed" | "unbilled">("all");
  const [rows, setRows] = useState<Rows>([]);
  const [error, setError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [suspendFor, setSuspendFor] = useState<string | null>(null);
  const [suspendNote, setSuspendNote] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await trpc.admin.usageReports.list.query({ periodStart, billed }));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [periodStart, billed]);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportCsv() {
    setError(null);
    try {
      const res = await trpc.admin.usageReports.exportCsv.query({ periodStart, billed });
      downloadCsv(res.filename, res.csv);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function markBilled() {
    if (!noteFor) return;
    setError(null);
    try {
      await trpc.admin.usageReports.markBilled.mutate({
        id: noteFor,
        billingNote: note.trim() || undefined,
      });
      setNoteFor(null);
      setNote("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function markUnbilled(id: string) {
    await trpc.admin.usageReports.markUnbilled.mutate({ id });
    await load();
  }

  async function suspendForNonPayment() {
    if (!suspendFor) return;
    setError(null);
    try {
      await trpc.admin.usageReports.suspendForNonPayment.mutate({
        usageReportId: suspendFor,
        note: suspendNote.trim() || undefined,
      });
      setSuspendFor(null);
      setSuspendNote("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const columns: GridColDef<Rows[number]>[] = [
    { field: "orgName", headerName: "Organization", flex: 1.2, minWidth: 160 },
    { field: "productCode", headerName: "Product", flex: 0.8, minWidth: 100 },
    {
      field: "storageUsedBytes",
      headerName: "Storage used",
      flex: 1,
      minWidth: 120,
      renderCell: (p) => fmtBytes(p.row.storageUsedBytes),
    },
    {
      field: "aiTokensThisMonth",
      headerName: "AI tokens",
      flex: 0.8,
      minWidth: 100,
      valueGetter: (_v, row) => row.aiTokensThisMonth,
    },
    {
      field: "billedAt",
      headerName: "Billing",
      flex: 1,
      minWidth: 140,
      renderCell: (p) =>
        p.row.billedAt ? (
          <StatusDot color="green" label={`Billed ${new Date(p.row.billedAt).toLocaleDateString()}`} />
        ) : (
          <StatusDot color="teal" label="Unbilled" />
        ),
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 70,
      align: "right",
      renderCell: (p) => (
        <RowActionsMenu
          actions={[
            !p.row.billedAt && {
              label: "Mark billed…",
              onClick: () => {
                setNoteFor(p.row.id);
                setNote("");
              },
            },
            !!p.row.billedAt && {
              label: "Clear billed mark",
              onClick: () => void markUnbilled(p.row.id),
            },
            {
              label: "Suspend for non-payment…",
              onClick: () => {
                setSuspendFor(p.row.id);
                setSuspendNote(`Non-payment — ${p.row.orgName} · ${p.row.periodStart}`);
              },
              danger: true,
            },
          ]}
        />
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary" sx={{ m: 0 }}>
        Manual India invoice path — export CSV for offline GST billing, then mark rows billed.
        Stripe is not wired.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1, flexWrap: "wrap" }}>
        <TextField
          id="ur-period"
          size="small"
          type="date"
          label="Period start"
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          id="ur-filter"
          select
          size="small"
          label="Filter"
          value={billed}
          onChange={(e) => setBilled(e.target.value as typeof billed)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="unbilled">Unbilled</MenuItem>
          <MenuItem value="billed">Billed</MenuItem>
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" size="small" onClick={() => void exportCsv()}>
          Export CSV
        </Button>
      </Box>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        density="compact"
        disableRowSelectionOnClick
        pageSizeOptions={[25, 50]}
        paginationModel={{ page: 0, pageSize: 25 }}
        autoHeight
      />

      <Dialog open={!!noteFor} onClose={() => setNoteFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>Mark usage billed</DialogTitle>
        <DialogContent>
          <TextField
            id="ur-note"
            label="Billing note (invoice ref)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. INV-2026-07-014"
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setNoteFor(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void markBilled()}>Mark billed</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!suspendFor} onClose={() => setSuspendFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>Suspend for non-payment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ m: 0 }}>
              Sets the org&apos;s product licence to SUSPENDED. The workspace blocks writes on its
              next licence refresh. Reinstate from Licences when payment clears.
            </Typography>
            <TextField
              id="ur-suspend-note"
              label="Note"
              value={suspendNote}
              onChange={(e) => setSuspendNote(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setSuspendFor(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => void suspendForNonPayment()}>
            Suspend licence
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
