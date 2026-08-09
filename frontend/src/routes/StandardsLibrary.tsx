import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Add } from "@carbon/icons-react";
import { useEffect, useRef, useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { DataGrid, DataState, PageBreadcrumb, type GridColDef } from "../carbon/adapters/index.js";
import { ProjectFacetTabs } from "../components/project/ProjectFacetTabs.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { useSignal } from "../lib/useSignal.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

const DISCIPLINES: { id: string; label: string }[] = [
  { id: "INTERIORS", label: "Interiors" },
  { id: "PLUMBING", label: "Plumbing" },
  { id: "ELECTRICAL", label: "Electrical" },
  { id: "LIGHTING", label: "Lighting" },
];

function DisciplinePanel({
  discipline,
  openSignal,
  onDialogOpenChange,
}: {
  discipline: string;
  openSignal?: number;
  onDialogOpenChange?: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const q = trpc.standards.listByDiscipline.useQuery({ discipline: discipline as never });
  const inv = () => utils.standards.listByDiscipline.invalidate({ discipline: discipline as never });
  const create = trpc.standards.create.useMutation({ meta: { errorTitle: "Couldn't create the standard" }, onSuccess: inv });
  const remove = trpc.standards.remove.useMutation({ meta: { errorTitle: "Couldn't delete the standard" }, onSuccess: inv });
  const removeFile = trpc.standards.removeFile.useMutation({ meta: { errorTitle: "Couldn't delete the file" }, onSuccess: inv });
  const { authorizedFetch } = useUploadAuth();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const setDialogOpen = (next: boolean) => {
    setOpen(next);
    onDialogOpenChange?.(next);
  };

  useSignal(openSignal, () => { setTitle(""); setNotes(""); setDialogOpen(true); });

  useEffect(() => () => { onDialogOpenChange?.(false); }, [onDialogOpenChange]);

  async function attach(standardId: string, kind: string, file: File) {
    setBusyId(standardId);
    setError(null);
    try {
      const res = await authorizedFetch("/upload/standard-file", (fd) => {
        fd.append("standardId", standardId);
        fd.append("kind", kind);
        fd.append("file", file);
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      inv();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Stack spacing={2}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          Upload failed — {error}
        </Alert>
      )}
      <DataState
        loading={q.isLoading}
        isEmpty={(q.data ?? []).length === 0}
        columnCount={1}
        empty={{ title: "No standards", description: `Add a ${discipline.toLowerCase()} standard with notes and drawings.` }}
      >
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 1 }}>
          {(q.data ?? []).map((s) => (
            <Box key={s.id} sx={{ p: 2, height: "100%", borderBottom: 1, borderColor: "divider" }}>
              <Stack spacing={1}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ m: 0, flex: 1 }}>{s.title}</Typography>
                  <RowActionsMenu
                    actions={[
                      {
                        label: "Delete",
                        danger: true,
                        disabled: remove.isPending,
                        onClick: () => remove.mutate({ id: s.id }),
                      },
                    ]}
                  />
                </Box>
                {s.notes && <p className="esti-label esti-label--secondary">{s.notes}</p>}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {(s.files ?? []).map((f) => (
                    <Chip
                      key={f.id}
                      size="small"
                      color="primary"
                      variant="outlined"
                      onDelete={() => removeFile.mutate({ id: f.id })}
                      label={
                        f.url ? (
                          <a href={f.url} target="_blank" rel="noreferrer">{f.kind}: {f.fileName}</a>
                        ) : (
                          `${f.kind}: ${f.fileName}`
                        )
                      }
                    />
                  ))}
                </Box>
                <Box>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={busyId === s.id}
                    onClick={() => fileInputs.current[s.id]?.click()}
                  >
                    {busyId === s.id ? "Uploading…" : "Attach file"}
                  </Button>
                  <input
                    ref={(el) => { fileInputs.current[s.id] = el; }}
                    type="file"
                    style={{ display: "none" }}
                    accept=".pdf,.dwg,.dxf,.png,.jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void attach(s.id, "PDF", file);
                      e.target.value = "";
                    }}
                  />
                </Box>
              </Stack>
            </Box>
          ))}
        </Box>
      </DataState>

      <Dialog open={open} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New standard</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField id="std-title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
            <TextField
              id="std-notes"
              label="Technical notes"
              multiline
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!title.trim() || create.isPending}
            onClick={() => {
              create.mutate({ discipline: discipline as never, title: title.trim(), notes: notes.trim() || undefined });
              setDialogOpen(false);
            }}
          >
            {create.isPending ? "Saving…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

/** Flat list of all files attached to standards across all disciplines. No backend change. */
function DocumentsTab() {
  const q1 = trpc.standards.listByDiscipline.useQuery({ discipline: "INTERIORS" as never });
  const q2 = trpc.standards.listByDiscipline.useQuery({ discipline: "PLUMBING" as never });
  const q3 = trpc.standards.listByDiscipline.useQuery({ discipline: "ELECTRICAL" as never });
  const q4 = trpc.standards.listByDiscipline.useQuery({ discipline: "LIGHTING" as never });

  const isLoading = q1.isLoading || q2.isLoading || q3.isLoading || q4.isLoading;
  const allFiles = [q1, q2, q3, q4].flatMap((q) =>
    (q.data ?? []).flatMap((s) =>
      (s.files ?? []).map((f) => ({
        ...f,
        standardTitle: s.title,
        discipline: (s as { discipline: string }).discipline,
      })),
    ),
  );

  if (isLoading) {
    return (
      <DataState loading isEmpty={false} empty={{ title: "" }} columnCount={4}>
        {null}
      </DataState>
    );
  }

  if (allFiles.length === 0) {
    return (
      <Alert severity="info">
        No documents yet — attach files to standards in the Standards tab and they will appear here for quick reference.
      </Alert>
    );
  }

  const columns: GridColDef[] = [
    {
      field: "fileName",
      headerName: "File",
      flex: 1.5,
      minWidth: 180,
      renderCell: (p) =>
        p.row.url
          ? <a href={p.row.url} target="_blank" rel="noreferrer">{p.row.fileName}</a>
          : p.row.fileName,
    },
    { field: "standardTitle", headerName: "Standard", flex: 1.2, minWidth: 160 },
    { field: "discipline", headerName: "Discipline", flex: 1, minWidth: 120 },
    { field: "kind", headerName: "Kind", width: 120 },
  ];

  return (
    <DataGrid
      rows={allFiles}
      columns={columns}
      density="compact"
      disableRowSelectionOnClick
      hideFooter
      autoHeight
    />
  );
}

function StandardsByDiscipline({
  stdSignal,
  onDialogOpenChange,
}: {
  stdSignal: number;
  onDialogOpenChange: (open: boolean) => void;
}) {
  const [discFacet, setDiscFacet] = useState(DISCIPLINES[0]!.id);

  return (
    <ProjectFacetTabs
      ariaLabel="Disciplines"
      value={discFacet}
      onChange={setDiscFacet}
      facets={DISCIPLINES.map((d) => ({
        id: d.id,
        label: d.label,
        panel: (
          <DisciplinePanel
            discipline={d.id}
            openSignal={d.id === discFacet ? stdSignal : undefined}
            onDialogOpenChange={onDialogOpenChange}
          />
        ),
      }))}
    />
  );
}

/** Studio › Libraries › Standards Library — Documents tab (all attached files) + Standards tab (by discipline). */
export function StandardsLibrary() {
  const [tab, setTab] = useState("documents");
  const [stdSignal, setStdSignal] = useState(0);
  const [stdDialogOpen, setStdDialogOpen] = useState(false);

  useScreenActions(
    tab === "standards" && !stdDialogOpen
      ? [
          {
            id: "new-standard",
            zone: "center",
            tone: "primary",
            label: "New Standard",
            icon: <Add />,
            onClick: () => setStdSignal((s) => s + 1),
          },
        ]
      : [],
    [tab, stdDialogOpen],
  );

  return (
    <RailLayout
      title="Standards Library"
      description="Office design standards by discipline — technical notes, drawings and standard details."
    >
      <PageBreadcrumb items={[{ label: "Library" }, { label: "Standards" }]} />
      <ProjectFacetTabs
        ariaLabel="Standards library sections"
        value={tab}
        onChange={setTab}
        facets={[
          {
            id: "documents",
            label: "Documents",
            panel: <DocumentsTab />,
          },
          {
            id: "standards",
            label: "Standards",
            panel: (
              <StandardsByDiscipline
                stdSignal={stdSignal}
                onDialogOpenChange={setStdDialogOpen}
              />
            ),
          },
        ]}
      />
    </RailLayout>
  );
}
