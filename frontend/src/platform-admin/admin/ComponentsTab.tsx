import { useEffect, useState } from "react";
import { Plan, type ManifestComponent } from "@esti/contracts";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import CloseIcon from "@mui/icons-material/Close";
import { StatusDot } from "../../components/StatusTag.js";
import { trpc } from "../lib/trpc";

type Releases = Awaited<ReturnType<typeof trpc.admin.components.list.query>>;

const KINDS: ManifestComponent["kind"][] = ["core", "ai", "worker"];

function emptyComponent(): ManifestComponent {
  return { id: "", version: "", kind: "core", url: "", sha256: "", sizeBytes: 0 };
}

const fmt = (d: Date | string) => new Date(d).toLocaleString();

/** Desktop component releases — the manifest the Manager downloads per edition. */
export default function ComponentsTab() {
  const [releases, setReleases] = useState<Releases>([]);
  const [open, setOpen] = useState(false);
  const [edition, setEdition] = useState<(typeof Plan.options)[number]>(Plan.options[0] ?? "LITE");
  const [appVersion, setAppVersion] = useState("");
  const [components, setComponents] = useState<ManifestComponent[]>([emptyComponent()]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function load() {
    setReleases(await trpc.admin.components.list.query());
  }
  useEffect(() => {
    void load();
  }, []);

  function updateComponent(i: number, patch: Partial<ManifestComponent>) {
    setComponents((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setComponents((rows) => [...rows, emptyComponent()]);
  }

  function removeRow(i: number) {
    setComponents((rows) => rows.filter((_, idx) => idx !== i));
  }

  const validComponents =
    components.length > 0 &&
    components.every(
      (c) =>
        c.id.trim() &&
        c.version.trim() &&
        /^https:\/\//.test(c.url) &&
        /^[0-9a-f]{64}$/.test(c.sha256) &&
        c.sizeBytes >= 0,
    );

  async function publish() {
    setBusy(true);
    setNote(null);
    try {
      await trpc.admin.components.publish.mutate({ edition, appVersion, components });
      setNote({ kind: "success", text: `Published ${edition} ${appVersion}.` });
      setAppVersion("");
      setComponents([emptyComponent()]);
      setOpen(false);
      await load();
    } catch (e) {
      setNote({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const columns: GridColDef<Releases[number]>[] = [
    { field: "edition", headerName: "Edition", flex: 0.7, minWidth: 100 },
    { field: "appVersion", headerName: "App version", flex: 0.9, minWidth: 130 },
    {
      field: "active",
      headerName: "Status",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => (
        <StatusDot color={p.row.active ? "green" : "gray"} label={p.row.active ? "Active" : "Superseded"} />
      ),
    },
    {
      field: "createdAt",
      headerName: "Published",
      flex: 1.2,
      minWidth: 180,
      renderCell: (p) => fmt(p.row.createdAt),
    },
  ];

  return (
    <Stack spacing={2}>
      {note && (
        <Alert severity={note.kind} onClose={() => setNote(null)}>
          {note.text}
        </Alert>
      )}

      <Box>
        <Button
          variant="contained"
          onClick={() => {
            setNote(null);
            setOpen(true);
          }}
        >
          Publish release
        </Button>
      </Box>

      <DataGrid
        rows={releases}
        columns={columns}
        getRowId={(r) => r.id}
        density="compact"
        disableRowSelectionOnClick
        hideFooter
        autoHeight
      />

      <Dialog aria-labelledby="components-tab-publish-title" open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle id="components-tab-publish-title">Publish component release</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                id="crel-edition"
                select
                label="Edition"
                value={edition}
                onChange={(e) => setEdition(e.target.value as (typeof Plan.options)[number])}
                fullWidth
              >
                {Plan.options.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                id="crel-app-version"
                label="App version"
                placeholder="2026.7.0"
                value={appVersion}
                onChange={(e) => setAppVersion(e.target.value)}
                fullWidth
              />
            </Stack>

            <Typography variant="subtitle2">Components</Typography>
            {components.map((c, i) => (
              <Stack key={i} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <TextField
                  label="ID"
                  placeholder="backend"
                  value={c.id}
                  onChange={(e) => updateComponent(i, { id: e.target.value })}
                  sx={{ width: 130 }}
                />
                <TextField
                  label="Version"
                  value={c.version}
                  onChange={(e) => updateComponent(i, { version: e.target.value })}
                  sx={{ width: 110 }}
                />
                <TextField
                  select
                  label="Kind"
                  value={c.kind}
                  onChange={(e) => updateComponent(i, { kind: e.target.value as ManifestComponent["kind"] })}
                  sx={{ width: 110 }}
                >
                  {KINDS.map((k) => (
                    <MenuItem key={k} value={k}>
                      {k}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Download URL"
                  placeholder="https://…"
                  value={c.url}
                  onChange={(e) => updateComponent(i, { url: e.target.value })}
                  sx={{ flex: 1, minWidth: 200 }}
                />
                <TextField
                  label="SHA-256"
                  value={c.sha256}
                  onChange={(e) => updateComponent(i, { sha256: e.target.value.toLowerCase() })}
                  sx={{ width: 180 }}
                />
                <TextField
                  label="Size (bytes)"
                  type="number"
                  value={c.sizeBytes}
                  onChange={(e) => updateComponent(i, { sizeBytes: Number(e.target.value) || 0 })}
                  sx={{ width: 130 }}
                />
                <IconButton
                  aria-label="Remove component"
                  size="small"
                  onClick={() => removeRow(i)}
                  disabled={components.length === 1}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
            <Box>
              <Button variant="text" onClick={addRow}>
                Add component
              </Button>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!appVersion.trim() || !validComponents || busy} onClick={publish}>
            {busy ? "Publishing…" : "Publish"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
