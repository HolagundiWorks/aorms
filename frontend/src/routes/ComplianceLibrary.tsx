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
import { useRef, useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { DataGrid, DataState, PageBreadcrumb, StatusDot, type GridColDef } from "../carbon/adapters/index.js";
import { ProjectFacetTabs } from "../components/project/ProjectFacetTabs.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { useSignal } from "../lib/useSignal.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

type Field = { key: string; label: string; type?: "text" | "number"; required?: boolean };

/** Shared CRUD panel for one compliance-area table (presentational + form state). */
function CrudPanel({
  fields,
  rows,
  loading,
  creating,
  removing,
  onCreate,
  onRemove,
  openSignal,
}: {
  fields: Field[];
  rows: Record<string, unknown>[];
  loading: boolean;
  creating: boolean;
  removing: boolean;
  onCreate: (payload: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
  /** When this number changes, open the create dialog (rail-triggered). */
  openSignal?: number;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  useSignal(openSignal, () => { setForm({}); setOpen(true); });
  const set = (k: string) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const missingRequired = fields.some((f) => f.required && !form[f.key]?.trim());

  const submit = () => {
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const v = form[f.key]?.trim();
      if (v === undefined || v === "") continue;
      payload[f.key] = f.type === "number" ? Number(v) : v;
    }
    onCreate(payload);
  };

  const columns: GridColDef[] = [
    ...fields.map((f): GridColDef => ({
      field: f.key,
      headerName: f.label,
      flex: 1,
      minWidth: 120,
      renderCell: (p) => (p.row[f.key] == null ? "—" : String(p.row[f.key])),
    })),
    {
      field: "__actions",
      headerName: "",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <RowActionsMenu
          actions={[
            {
              label: "Delete",
              danger: true,
              disabled: removing,
              onClick: () => onRemove(String(p.row.id)),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <DataState
        loading={loading}
        isEmpty={rows.length === 0}
        columnCount={fields.length + 1}
        empty={{ title: "No entries", description: "Add a compliance reference entry." }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </DataState>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New entry</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {fields.map((f) => (
              <TextField
                key={f.key}
                id={`cmp-${f.key}`}
                label={f.label + (f.required ? " *" : "")}
                type={f.type === "number" ? "number" : "text"}
                value={form[f.key] ?? ""}
                onChange={set(f.key)}
                fullWidth
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={missingRequired || creating}
            onClick={() => { submit(); setOpen(false); }}
          >
            {creating ? "Saving…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function FarPanel({ openSignal }: { openSignal?: number }) {
  const u = trpc.useUtils();
  const q = trpc.compliance.far.list.useQuery();
  const inv = () => u.compliance.far.list.invalidate();
  const create = trpc.compliance.far.create.useMutation({ meta: { errorTitle: "Couldn't create the FAR rule" }, onSuccess: inv });
  const remove = trpc.compliance.far.remove.useMutation({ meta: { errorTitle: "Couldn't delete the FAR rule" }, onSuccess: inv });
  return (
    <CrudPanel
      fields={[
        { key: "zone", label: "Zone", required: true },
        { key: "plotType", label: "Plot type" },
        { key: "plotAreaMinSqm", label: "Plot min (sqm)", type: "number" },
        { key: "plotAreaMaxSqm", label: "Plot max (sqm)", type: "number" },
        { key: "far", label: "FAR", type: "number" },
        { key: "groundCoveragePct", label: "Ground cover %", type: "number" },
        { key: "maxHeightM", label: "Max height (m)", type: "number" },
        { key: "notes", label: "Notes" },
      ]}
      rows={(q.data ?? []) as Record<string, unknown>[]}
      loading={q.isLoading}
      creating={create.isPending}
      removing={remove.isPending}
      onCreate={(p) => create.mutate(p as never)}
      onRemove={(id) => remove.mutate({ id })}
      openSignal={openSignal}
    />
  );
}

function SetbackPanel({ openSignal }: { openSignal?: number }) {
  const u = trpc.useUtils();
  const q = trpc.compliance.setback.list.useQuery();
  const inv = () => u.compliance.setback.list.invalidate();
  const create = trpc.compliance.setback.create.useMutation({ meta: { errorTitle: "Couldn't create the setback rule" }, onSuccess: inv });
  const remove = trpc.compliance.setback.remove.useMutation({ meta: { errorTitle: "Couldn't delete the setback rule" }, onSuccess: inv });
  return (
    <CrudPanel
      fields={[
        { key: "zone", label: "Zone", required: true },
        { key: "plotType", label: "Plot type" },
        { key: "frontageMinM", label: "Frontage min (m)", type: "number" },
        { key: "frontageMaxM", label: "Frontage max (m)", type: "number" },
        { key: "frontM", label: "Front (m)", type: "number" },
        { key: "rearM", label: "Rear (m)", type: "number" },
        { key: "side1M", label: "Side 1 (m)", type: "number" },
        { key: "side2M", label: "Side 2 (m)", type: "number" },
        { key: "notes", label: "Notes" },
      ]}
      rows={(q.data ?? []) as Record<string, unknown>[]}
      loading={q.isLoading}
      creating={create.isPending}
      removing={remove.isPending}
      onCreate={(p) => create.mutate(p as never)}
      onRemove={(id) => remove.mutate({ id })}
      openSignal={openSignal}
    />
  );
}

function NbcPanel({ openSignal }: { openSignal?: number }) {
  const u = trpc.useUtils();
  const q = trpc.compliance.nbc.list.useQuery();
  const inv = () => u.compliance.nbc.list.invalidate();
  const create = trpc.compliance.nbc.create.useMutation({ meta: { errorTitle: "Couldn't create the NBC clause" }, onSuccess: inv });
  const remove = trpc.compliance.nbc.remove.useMutation({ meta: { errorTitle: "Couldn't delete the NBC clause" }, onSuccess: inv });
  return (
    <CrudPanel
      fields={[
        { key: "clause", label: "Clause", required: true },
        { key: "title", label: "Title", required: true },
        { key: "requirement", label: "Requirement" },
        { key: "applicability", label: "Applicability" },
        { key: "notes", label: "Notes" },
      ]}
      rows={(q.data ?? []) as Record<string, unknown>[]}
      loading={q.isLoading}
      creating={create.isPending}
      removing={remove.isPending}
      onCreate={(p) => create.mutate(p as never)}
      onRemove={(id) => remove.mutate({ id })}
      openSignal={openSignal}
    />
  );
}

function FirePanel({ openSignal }: { openSignal?: number }) {
  const u = trpc.useUtils();
  const q = trpc.compliance.fire.list.useQuery();
  const inv = () => u.compliance.fire.list.invalidate();
  const create = trpc.compliance.fire.create.useMutation({ meta: { errorTitle: "Couldn't create the fire safety rule" }, onSuccess: inv });
  const remove = trpc.compliance.fire.remove.useMutation({ meta: { errorTitle: "Couldn't delete the fire safety rule" }, onSuccess: inv });
  return (
    <CrudPanel
      fields={[
        { key: "buildingType", label: "Building type", required: true },
        { key: "heightBandM", label: "Height band (m)" },
        { key: "requirement", label: "Requirement" },
        { key: "refugeArea", label: "Refuge area" },
        { key: "staircaseWidthM", label: "Staircase width (m)", type: "number" },
        { key: "notes", label: "Notes" },
      ]}
      rows={(q.data ?? []) as Record<string, unknown>[]}
      loading={q.isLoading}
      creating={create.isPending}
      removing={remove.isPending}
      onCreate={(p) => create.mutate(p as never)}
      onRemove={(id) => remove.mutate({ id })}
      openSignal={openSignal}
    />
  );
}

function RegulationPanel({ openSignal }: { openSignal?: number }) {
  const u = trpc.useUtils();
  const q = trpc.compliance.regulation.list.useQuery();
  const inv = () => u.compliance.regulation.list.invalidate();
  const create = trpc.compliance.regulation.create.useMutation({ meta: { errorTitle: "Couldn't create the regulation" }, onSuccess: inv });
  const remove = trpc.compliance.regulation.remove.useMutation({ meta: { errorTitle: "Couldn't delete the regulation" }, onSuccess: inv });
  return (
    <CrudPanel
      fields={[
        { key: "authority", label: "Authority", required: true },
        { key: "refNo", label: "Ref no." },
        { key: "title", label: "Title", required: true },
        { key: "summary", label: "Summary" },
        { key: "link", label: "Link" },
        { key: "notes", label: "Notes" },
      ]}
      rows={(q.data ?? []) as Record<string, unknown>[]}
      loading={q.isLoading}
      creating={create.isPending}
      removing={remove.isPending}
      onCreate={(p) => create.mutate(p as never)}
      onRemove={(id) => remove.mutate({ id })}
      openSignal={openSignal}
    />
  );
}

const DOC_CATEGORIES = ["NBC", "FAR", "SETBACK", "FIRE", "REGULATION", "OTHER"] as const;

function DocumentsTab({ openSignal }: { openSignal?: number }) {
  const utils = trpc.useUtils();
  const q = trpc.compliance.listDocuments.useQuery();
  const remove = trpc.compliance.removeDocument.useMutation({
    meta: { errorTitle: "Couldn't delete the document" },
    onSuccess: () => utils.compliance.listDocuments.invalidate(),
  });
  const { authorizedFetch } = useUploadAuth();

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<string>("NBC");
  const [showUpload, setShowUpload] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  useSignal(openSignal, () => setShowUpload((v) => !v)); // rail "Upload document"

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const res = await authorizedFetch("/upload/compliance-doc", (fd) => {
        fd.append("title", uploadTitle.trim() || file.name);
        fd.append("category", uploadCategory);
        fd.append("file", file);
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      void utils.compliance.listDocuments.invalidate();
      setShowUpload(false);
      setUploadTitle("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const columns: GridColDef[] = [
    { field: "title", headerName: "Title", flex: 1.5, minWidth: 180 },
    {
      field: "category",
      headerName: "Category",
      width: 150,
      renderCell: (p) => (
        <StatusDot color="blue" label={p.row.category} />
      ),
    },
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
    {
      field: "__actions",
      headerName: "",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <RowActionsMenu
          actions={[
            {
              label: "Delete",
              danger: true,
              disabled: remove.isPending,
              onClick: () => remove.mutate({ id: p.row.id }),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      {showUpload && (
        <Box sx={{ p: 2, border: 1, borderColor: "divider" }}>
          <Stack spacing={2}>
            <TextField
              id="cdoc-title"
              label="Title"
              placeholder="e.g. NBC 2016 Part 3"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              fullWidth
            />
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary" sx={{ m: 0 }}>Category</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {DOC_CATEGORIES.map((c) => (
                  <Chip
                    key={c}
                    size="small"
                    color={uploadCategory === c ? "primary" : "default"}
                    variant={uploadCategory === c ? "filled" : "outlined"}
                    label={c}
                    onClick={() => setUploadCategory(c)}
                    aria-pressed={uploadCategory === c}
                  />
                ))}
              </Box>
            </Stack>
            <Box>
              <Button variant="outlined" size="small" disabled={busy} onClick={() => fileInput.current?.click()}>
                {busy ? "Uploading…" : "Choose file (PDF / DWG / DXF / image)"}
              </Button>
              <input
                ref={fileInput}
                type="file"
                style={{ display: "none" }}
                accept=".pdf,.dwg,.dxf,.png,.jpg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                  e.target.value = "";
                }}
              />
            </Box>
          </Stack>
        </Box>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          Upload failed — {error}
        </Alert>
      )}

      <DataState
        loading={q.isLoading}
        isEmpty={(q.data ?? []).length === 0}
        columnCount={4}
        empty={{ title: "No documents", description: "Upload NBC books, FAR notifications, fire NOC drawings, and other compliance reference documents." }}
      >
        <DataGrid
          rows={q.data ?? []}
          columns={columns}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </DataState>
    </Stack>
  );
}

const RULE_FACETS = [
  { id: "nbc", label: "NBC Rules", Panel: NbcPanel },
  { id: "far", label: "FAR Rules", Panel: FarPanel },
  { id: "setback", label: "Setbacks", Panel: SetbackPanel },
  { id: "fire", label: "Fire Compliance", Panel: FirePanel },
  { id: "regulation", label: "Regulations", Panel: RegulationPanel },
] as const;

function RulesTab({ ruleSignal }: { ruleSignal: number }) {
  const [ruleFacet, setRuleFacet] = useState<string>(RULE_FACETS[0].id);

  return (
    <ProjectFacetTabs
      ariaLabel="Compliance areas"
      value={ruleFacet}
      onChange={setRuleFacet}
      facets={RULE_FACETS.map(({ id, label, Panel }) => ({
        id,
        label,
        panel: <Panel openSignal={id === ruleFacet ? ruleSignal : undefined} />,
      }))}
    />
  );
}

/** Studio › Libraries › Compliance Library — Documents tab (uploaded PDFs) + Rules tab (NBC · FAR · Setbacks · Fire · Regulations). */
export function ComplianceLibrary() {
  const [tab, setTab] = useState("documents");
  // Rail-triggered create/upload — bump a counter to open the active panel's action.
  const [docSignal, setDocSignal] = useState(0);
  const [ruleSignal, setRuleSignal] = useState(0);

  useScreenActions(
    [
      tab === "documents"
        ? {
            id: "upload-document",
            zone: "center",
            tone: "primary",
            label: "Upload Document",
            icon: <Add />,
            onClick: () => setDocSignal((s) => s + 1),
          }
        : {
            id: "new-entry",
            zone: "center",
            tone: "primary",
            label: "New Entry",
            icon: <Add />,
            onClick: () => setRuleSignal((s) => s + 1),
          },
    ],
    [tab],
  );

  return (
    <RailLayout
      title="Compliance Library"
      description="Statutory reference data — NBC rules, FAR, setbacks, fire compliance, and regulations."
    >
      <PageBreadcrumb
        items={[
          { label: "Library" },
          { label: "Compliance" },
        ]}
      />
      <ProjectFacetTabs
        ariaLabel="Compliance library sections"
        value={tab}
        onChange={setTab}
        facets={[
          {
            id: "documents",
            label: "Documents",
            panel: <DocumentsTab openSignal={docSignal} />,
          },
          {
            id: "rules",
            label: "Rules",
            panel: <RulesTab ruleSignal={ruleSignal} />,
          },
        ]}
      />
    </RailLayout>
  );
}
