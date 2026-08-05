import {
  Button,
  Modal,
  Select,
  SelectItem,
  Stack,
  TextArea,
  TextInput,
} from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScreenActions } from "@hcw/ui-kit";
import { CarbonScope } from "../carbon/CarbonScope.js";
import {
  ConfirmModal,
  DataGrid,
  DataState,
  PageBreadcrumb,
  type GridColDef,
} from "../carbon/adapters/index.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { PdfActionButtons } from "../components/PdfActionButtons.js";
import { pdfPollInterval } from "../lib/pdfUi.js";
import { trpc } from "../lib/trpc.js";

function LetterPdf({ id, initial }: { id: string; initial: string }) {
  const utils = trpc.useUtils();
  const q = trpc.letters.byId.useQuery(
    { id },
    {
      enabled: initial !== "NONE",
      refetchInterval: (query) => pdfPollInterval(query.state.data?.pdfStatus, initial !== "NONE"),
    },
  );
  const gen = trpc.letters.generatePdf.useMutation({
    meta: { errorTitle: "Couldn't generate the letter PDF" },
    onSuccess: () => utils.letters.byId.invalidate({ id }),
  });
  return (
    <PdfActionButtons
      status={q.data?.pdfStatus ?? initial}
      url={q.data?.pdfUrl ?? null}
      generatePending={gen.isPending}
      onGenerate={() => gen.mutate({ id })}
      share={{ text: "Please find the attached letter.", fileName: "letter.pdf" }}
    />
  );
}

export function Letters() {
  const utils = trpc.useUtils();
  const navigate = useNavigate();
  const listQ = trpc.letters.list.useQuery();
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const templatesQ = trpc.documents.listTemplates.useQuery({ kind: "LETTER" });
  const inv = () => utils.letters.list.invalidate();

  const [open, setOpen] = useState(false);

  useScreenActions(
    open
      ? []
      : [
          {
            id: "new-letter",
            zone: "center",
            tone: "primary",
            label: "New letter",
            icon: <Add />,
            onClick: () => setOpen(true),
          },
        ],
    [open],
  );

  const [f, setF] = useState({
    projectId: "",
    recipient: "",
    subject: "",
    body: "",
    dateLetter: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((x) => ({ ...x, [k]: e.target.value }));
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const create = trpc.letters.create.useMutation({
    meta: { errorTitle: "Couldn't create the letter" },
    onSuccess: () => {
      inv();
      setOpen(false);
      setF({
        projectId: "",
        recipient: "",
        subject: "",
        body: "",
        dateLetter: "",
      });
    },
  });
  const remove = trpc.letters.remove.useMutation({ meta: { errorTitle: "Couldn't delete the letter" }, onSuccess: inv });

  const rows = listQ.data ?? [];

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 1, minWidth: 120 },
    { field: "recipient", headerName: "Recipient", flex: 1, minWidth: 140 },
    { field: "subject", headerName: "Subject", flex: 2, minWidth: 200 },
    {
      field: "document",
      headerName: "Document",
      sortable: false,
      filterable: false,
      flex: 1.4,
      minWidth: 200,
      renderCell: (p) => <LetterPdf id={p.row.id} initial={p.row.pdfStatus} />,
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 100,
      renderCell: (p) => (
        <RowActionsMenu
          actions={[
            { label: "Delete", onClick: () => setConfirmId(p.row.id), danger: true },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <RailLayout
        title="Letters"
        description="Office correspondence on firm letterhead."
        aside={
          <CarbonScope>
            <Button kind="ghost" size="sm" onClick={() => navigate("/office/documents")}>
              Document register
            </Button>
          </CarbonScope>
        }
      >
        <PageBreadcrumb items={[{ label: "Office" }, { label: "Letters" }]} />
        <DataState
          loading={listQ.isLoading}
          isEmpty={rows.length === 0}
          columnCount={5}
          empty={{
            title: "No letters yet",
            description: "Draft a letter and export it as a branded PDF.",
          }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            density="compact"
            disableRowSelectionOnClick
            autoHeight
          />
        </DataState>
      </RailLayout>

      <ConfirmModal
        open={!!confirmId}
        heading="Delete letter?"
        body="This permanently removes the letter."
        confirmText="Delete"
        danger
        pending={remove.isPending}
        onConfirm={() => {
          if (confirmId) remove.mutate({ id: confirmId });
          setConfirmId(null);
        }}
        onClose={() => setConfirmId(null)}
      />

      <CarbonScope>
        <Modal
          open={open}
          size="lg"
          modalHeading="New letter"
          primaryButtonText={create.isPending ? "Creating…" : "Create"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!f.recipient || !f.subject || !f.body || create.isPending}
          onRequestClose={() => setOpen(false)}
          onRequestSubmit={() =>
            create.mutate({
              projectId: f.projectId || undefined,
              recipient: f.recipient,
              subject: f.subject,
              body: f.body,
              dateLetter: f.dateLetter || undefined,
            })
          }
        >
          <Stack gap={5}>
            <Select
              id="l-tpl"
              labelText="Start from template (optional)"
              value=""
              onChange={(e) => {
                const t = (templatesQ.data ?? []).find((x) => x.id === e.target.value);
                if (t) setF((x) => ({ ...x, subject: t.title, body: t.body }));
              }}
            >
              <SelectItem value="" text="— blank letter —" />
              {(templatesQ.data ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id} text={t.title} />
              ))}
            </Select>
            <div style={{ display: "flex", gap: "1rem" }}>
              <TextInput id="l-to" labelText="Recipient" value={f.recipient} onChange={set("recipient")} />
              <TextInput id="l-date" labelText="Date" type="date" value={f.dateLetter} onChange={set("dateLetter")} />
            </div>
            <Select id="l-proj" labelText="Related project (optional)" value={f.projectId} onChange={set("projectId")}>
              <SelectItem value="" text="— none —" />
              {(projectsQ.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id} text={`${p.ref} — ${p.title}`} />
              ))}
            </Select>
            <TextInput id="l-subj" labelText="Subject" value={f.subject} onChange={set("subject")} />
            <TextArea id="l-body" labelText="Body" rows={10} value={f.body} onChange={set("body")} />
          </Stack>
        </Modal>
      </CarbonScope>
    </>
  );
}
