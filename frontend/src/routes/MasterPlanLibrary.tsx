import {
  Alert,
  AlertTitle,
  Button,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { Add } from "@carbon/icons-react";
import { MasterPlanCategory } from "@esti/contracts";
import { useRef, useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { CarbonScope } from "../carbon/CarbonScope.js";
import {
  DataGrid,
  DataState,
  PageBreadcrumb,
  StatusDot,
  type GridColDef,
} from "../carbon/adapters/index.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { useUploadAuth } from "../lib/uploadAuth.js";
import { trpc } from "../lib/trpc.js";

/** Studio › Libraries › Master Plan Library — PDF / DWG / zoning / development files. Wave 3 (Carbon). */
export function MasterPlanLibrary() {
  const utils = trpc.useUtils();
  const listQ = trpc.masterPlans.list.useQuery();
  const remove = trpc.masterPlans.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the master plan" },
    onSuccess: () => utils.masterPlans.list.invalidate(),
  });
  const { authorizedFetch } = useUploadAuth();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(MasterPlanCategory.options[0]!);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authorizedFetch("/upload/master-plan", (fd) => {
        fd.append("name", name || file.name);
        fd.append("category", category);
        fd.append("file", file);
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
      }
      setName("");
      setFile(null);
      utils.masterPlans.list.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  useScreenActions(
    [
      {
        id: "upload-master-plan",
        zone: "center",
        tone: "primary",
        label: busy ? "Uploading…" : "Upload",
        icon: <Add />,
        disabled: !file || busy,
        onClick: upload,
      },
    ],
    [file, busy, name, category],
  );

  const columns: GridColDef[] = [
    { field: "name", headerName: "Name", flex: 1.5, minWidth: 180 },
    {
      field: "category",
      headerName: "Category",
      width: 160,
      renderCell: (p) => <StatusDot color="gray" label={p.row.category} />,
    },
    {
      field: "fileName",
      headerName: "File",
      flex: 1.5,
      minWidth: 180,
      renderCell: (p) =>
        p.row.url ? (
          <a href={p.row.url} target="_blank" rel="noreferrer">
            {p.row.fileName}
          </a>
        ) : (
          p.row.fileName
        ),
    },
    {
      field: "actions",
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
    <RailLayout
      title="Master Plan Library"
      description="Reference master plans — PDF, DWG, zoning and development plans."
      aside={
        <Stack spacing={2}>
          <TextField id="mp-name" label="Name" placeholder="e.g. Whitefield zoning plan" value={name} onChange={(e) => setName(e.target.value)} size="small" />
          <TextField id="mp-cat" label="Category" value={category} onChange={(e) => setCategory(e.target.value)} select size="small">
            {MasterPlanCategory.options.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" onClick={() => fileRef.current?.click()}>
            {file ? file.name : "Choose file"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.dwg,.dxf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ display: "none" }}
          />
          {error && (
            <Alert severity="error" onClose={() => setError(null)}><AlertTitle>Upload failed</AlertTitle>{error}</Alert>
          )}
        </Stack>
      }
    >
      <CarbonScope>
        <PageBreadcrumb items={[{ label: "Library" }, { label: "Master Plans" }]} />
        <DataState
          loading={listQ.isLoading}
          isEmpty={(listQ.data ?? []).length === 0}
          columnCount={4}
          empty={{ title: "No master plans", description: "Upload a PDF or DWG reference plan." }}
        >
          <DataGrid rows={listQ.data ?? []} columns={columns} density="compact" disableRowSelectionOnClick hideFooter autoHeight />
        </DataState>
      </CarbonScope>
    </RailLayout>
  );
}
