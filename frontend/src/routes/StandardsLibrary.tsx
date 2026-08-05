import {
  Button,
  InlineNotification,
  Modal,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TextArea,
  TextInput,
} from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { useEffect, useRef, useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { CarbonScope } from "../carbon/CarbonScope.js";
import { DataGrid, DataState, PageBreadcrumb, type GridColDef } from "../carbon/adapters/index.js";
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
    <CarbonScope>
      <Stack gap={5}>
        {error && (
          <InlineNotification kind="error" lowContrast title="Upload failed" subtitle={error} onCloseButtonClick={() => setError(null)} />
        )}
        <DataState
          loading={q.isLoading}
          isEmpty={(q.data ?? []).length === 0}
          columnCount={1}
          empty={{ title: "No standards", description: `Add a ${discipline.toLowerCase()} standard with notes and drawings.` }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "0.5rem" }}>
            {(q.data ?? []).map((s) => (
              <div key={s.id} style={{ padding: "1rem", height: "100%", borderBottom: "1px solid var(--cds-border-subtle)" }}>
                <Stack gap={3}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <h4 className="cds--type-heading-compact-01" style={{ margin: 0, flex: 1 }}>{s.title}</h4>
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
                  </div>
                  {s.notes && <p className="esti-label esti-label--secondary">{s.notes}</p>}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {(s.files ?? []).map((f) => (
                      <Tag key={f.id} type="blue" filter onClose={() => removeFile.mutate({ id: f.id })}>
                        {f.url ? (
                          <a href={f.url} target="_blank" rel="noreferrer" className="cds--link">{f.kind}: {f.fileName}</a>
                        ) : (
                          `${f.kind}: ${f.fileName}`
                        )}
                      </Tag>
                    ))}
                  </div>
                  <div>
                    <Button
                      kind="tertiary"
                      size="sm"
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
                  </div>
                </Stack>
              </div>
            ))}
          </div>
        </DataState>

        <Modal
          open={open}
          size="sm"
          modalHeading="New standard"
          primaryButtonText={create.isPending ? "Saving…" : "Create"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!title.trim() || create.isPending}
          onRequestClose={() => setDialogOpen(false)}
          onRequestSubmit={() => {
            create.mutate({ discipline: discipline as never, title: title.trim(), notes: notes.trim() || undefined });
            setDialogOpen(false);
          }}
        >
          <Stack gap={5}>
            <TextInput id="std-title" labelText="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextArea
              id="std-notes"
              labelText="Technical notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Stack>
        </Modal>
      </Stack>
    </CarbonScope>
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
      <CarbonScope>
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="No documents yet"
          subtitle="Attach files to standards in the Standards tab — they will appear here for quick reference."
        />
      </CarbonScope>
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
          ? <a href={p.row.url} target="_blank" rel="noreferrer" className="cds--link">{p.row.fileName}</a>
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

/** Studio › Libraries › Standards Library — Documents tab (all attached files) + Standards tab (by discipline). */
export function StandardsLibrary() {
  const [tab, setTab] = useState(0);
  const [discTab, setDiscTab] = useState(0);
  const [stdSignal, setStdSignal] = useState(0);
  const [stdDialogOpen, setStdDialogOpen] = useState(false);

  useScreenActions(
    tab === 1 && !stdDialogOpen
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
      <CarbonScope>
        <Tabs selectedIndex={tab} onChange={({ selectedIndex }) => setTab(selectedIndex)}>
          <TabList aria-label="Standards library sections" contained>
            <Tab>Documents</Tab>
            <Tab>Standards</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <DocumentsTab />
            </TabPanel>
            <TabPanel>
              <Tabs selectedIndex={discTab} onChange={({ selectedIndex }) => setDiscTab(selectedIndex)}>
                <TabList aria-label="Disciplines" contained>
                  {DISCIPLINES.map((d) => <Tab key={d.id}>{d.label}</Tab>)}
                </TabList>
                <TabPanels>
                  {DISCIPLINES.map((d, i) => (
                    <TabPanel key={d.id}>
                      <DisciplinePanel
                        discipline={d.id}
                        openSignal={i === discTab ? stdSignal : undefined}
                        onDialogOpenChange={setStdDialogOpen}
                      />
                    </TabPanel>
                  ))}
                </TabPanels>
              </Tabs>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </CarbonScope>
    </RailLayout>
  );
}
