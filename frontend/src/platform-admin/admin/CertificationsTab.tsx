import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { StatusDot } from "../../components/StatusTag.js";
import { trpc } from "../lib/trpc";

type Certs = Awaited<ReturnType<typeof trpc.admin.certifications.list.query>>;

const fmt = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString() : "—");

/** Portable certifications (AORMS-U keyed) — issue, list, revoke/reactivate for one account. */
export default function CertificationsTab() {
  const [handle, setHandle] = useState("");
  const [loadedHandle, setLoadedHandle] = useState<string | null>(null);
  const [certs, setCerts] = useState<Certs>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function load(accountPublicId: string) {
    setBusy(true);
    setNote(null);
    try {
      const rows = await trpc.admin.certifications.list.query({ accountPublicId });
      setCerts(rows);
      setLoadedHandle(accountPublicId);
    } catch (e) {
      setNote({ kind: "error", text: (e as Error).message });
      setCerts([]);
      setLoadedHandle(null);
    } finally {
      setBusy(false);
    }
  }

  async function doSearch(e: React.FormEvent) {
    e.preventDefault();
    const h = handle.trim().toUpperCase();
    if (!h) return;
    await load(h);
  }

  async function issue() {
    if (!loadedHandle) return;
    setBusy(true);
    setNote(null);
    try {
      await trpc.admin.certifications.issue.mutate({
        accountPublicId: loadedHandle,
        title,
        issuer: issuer || undefined,
      });
      setNote({ kind: "success", text: `Issued "${title}" to ${loadedHandle}.` });
      setTitle("");
      setIssuer("");
      setOpen(false);
      await load(loadedHandle);
    } catch (e) {
      setNote({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: "ACTIVE" | "REVOKED") {
    if (!loadedHandle) return;
    setBusy(true);
    setNote(null);
    try {
      await trpc.admin.certifications.setStatus.mutate({ id, status });
      await load(loadedHandle);
    } catch (e) {
      setNote({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const columns: GridColDef<Certs[number]>[] = [
    { field: "title", headerName: "Title", flex: 1.3, minWidth: 180 },
    { field: "issuer", headerName: "Issuer", flex: 1, minWidth: 140, valueGetter: (v) => v ?? "—" },
    {
      field: "issuedAt",
      headerName: "Issued",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => fmt(p.row.issuedAt),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.7,
      minWidth: 110,
      renderCell: (p) => (
        <StatusDot color={p.row.status === "ACTIVE" ? "green" : "red"} label={p.row.status} />
      ),
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 120,
      renderCell: (p) =>
        p.row.status === "ACTIVE" ? (
          <Button variant="text" color="error" size="small" onClick={() => setStatus(p.row.id, "REVOKED")}>
            Revoke
          </Button>
        ) : (
          <Button variant="text" color="success" size="small" onClick={() => setStatus(p.row.id, "ACTIVE")}>
            Reactivate
          </Button>
        ),
    },
  ];

  return (
    <Stack spacing={2}>
      {note && (
        <Alert severity={note.kind} onClose={() => setNote(null)}>
          {note.text}
        </Alert>
      )}

      <Box component="form" onSubmit={doSearch}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            id="cert-handle"
            label="Account handle"
            placeholder="AORMS-U-..."
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            fullWidth
          />
          <Button type="submit" variant="outlined" disabled={busy || !handle.trim()}>
            Load
          </Button>
        </Stack>
      </Box>

      {loadedHandle && (
        <>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              Certifications for <strong>{loadedHandle}</strong>
            </Typography>
            <Button variant="contained" size="small" onClick={() => setOpen(true)}>
              Issue certification
            </Button>
          </Stack>

          <DataGrid
            rows={certs}
            columns={columns}
            getRowId={(r) => r.id}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </>
      )}

      <Dialog aria-labelledby="cert-issue-title" open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle id="cert-issue-title">{`Issue certification — ${loadedHandle ?? ""}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="cert-title"
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
            />
            <TextField
              id="cert-issuer"
              label="Issuer"
              helperText="Optional — defaults to blank."
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!title.trim() || busy} onClick={issue}>
            {busy ? "Issuing…" : "Issue"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
