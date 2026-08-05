import {
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  TextArea,
  TextInput,
} from "@carbon/react";
import { Add } from "@carbon/icons-react";
import {
  CONTRACT_TYPE_LABEL,
  ContractStatus,
  ContractType,
  formatINR,
} from "@esti/contracts";
import { useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { CarbonScope } from "../carbon/CarbonScope.js";
import {
  ConfirmModal,
  DataGrid,
  DataState,
  PageBreadcrumb,
  StatusTag,
  type GridColDef,
} from "../carbon/adapters/index.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { trpc } from "../lib/trpc.js";

const STATUS_TAG: Record<string, string> = {
  DRAFT: "gray",
  ACTIVE: "green",
  ON_HOLD: "blue",
  COMPLETED: "magenta",
  TERMINATED: "red",
};

export function Contracts() {
  const utils = trpc.useUtils();
  const listQ = trpc.contracts.list.useQuery();
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const templatesQ = trpc.documents.listTemplates.useQuery({ kind: "CONTRACT" });
  const inv = () => utils.contracts.list.invalidate();
  const updateStatus = trpc.contracts.updateStatus.useMutation({
    meta: { errorTitle: "Couldn't update the contract status" },
    onSuccess: inv,
  });
  const remove = trpc.contracts.remove.useMutation({ meta: { errorTitle: "Couldn't delete the contract" }, onSuccess: inv });

  const [open, setOpen] = useState(false);

  useScreenActions(
    open
      ? []
      : [
          {
            id: "new-contract",
            zone: "center",
            tone: "primary",
            label: "New contract",
            icon: <Add />,
            onClick: () => setOpen(true),
          },
        ],
    [open],
  );

  const [f, setF] = useState({
    projectId: "",
    title: "",
    party: "",
    contractType: "CLIENT",
    value: "",
    startDate: "",
    endDate: "",
    notes: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((x) => ({ ...x, [k]: e.target.value }));
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const create = trpc.contracts.create.useMutation({
    meta: { errorTitle: "Couldn't create the contract" },
    onSuccess: () => {
      inv();
      setOpen(false);
      setF({
        projectId: "",
        title: "",
        party: "",
        contractType: "CLIENT",
        value: "",
        startDate: "",
        endDate: "",
        notes: "",
      });
    },
  });

  const rows = listQ.data ?? [];

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 1, minWidth: 110 },
    {
      field: "title",
      headerName: "Title / party",
      flex: 2,
      minWidth: 200,
      renderCell: (p) => (
        <div>
          {p.row.title}
          <div>{p.row.party}</div>
        </div>
      ),
    },
    {
      field: "contractType",
      headerName: "Type",
      flex: 1,
      minWidth: 120,
      valueGetter: (_v, row) =>
        CONTRACT_TYPE_LABEL[row.contractType as keyof typeof CONTRACT_TYPE_LABEL] ??
        row.contractType,
    },
    {
      field: "valuePaise",
      headerName: "Value",
      flex: 1,
      minWidth: 120,
      renderCell: (p) =>
        p.row.valuePaise ? formatINR(p.row.valuePaise, { paise: false }) : "—",
    },
    {
      field: "term",
      headerName: "Term",
      flex: 1.4,
      minWidth: 160,
      sortable: false,
      renderCell: (p) => `${p.row.startDate ?? "—"} → ${p.row.endDate ?? "—"}`,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1.6,
      minWidth: 220,
      sortable: false,
      renderCell: (p) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ minWidth: 120 }}>
            <Select
              id={`c-st-${p.row.id}`}
              labelText="Status"
              hideLabel
              size="sm"
              value={p.row.status}
              onChange={(e) =>
                updateStatus.mutate({
                  id: p.row.id,
                  status: e.target.value as (typeof ContractStatus.options)[number],
                })
              }
            >
              {ContractStatus.options.map((st) => (
                <SelectItem key={st} value={st} text={st} />
              ))}
            </Select>
          </div>
          <StatusTag value={p.row.status} map={STATUS_TAG} />
        </div>
      ),
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
            {
              label: "Delete",
              danger: true,
              onClick: () => setConfirmId(p.row.id),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <RailLayout
        title="Contracts"
        description="Agreements with clients, consultants and vendors."
      >
        <PageBreadcrumb items={[{ label: "Office" }, { label: "Contracts" }]} />
        <DataState
          loading={listQ.isLoading}
          isEmpty={rows.length === 0}
          columnCount={6}
          empty={{
            title: "No contracts yet",
            description:
              "Register an agreement to track parties, value and term.",
          }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            density="compact"
            disableRowSelectionOnClick
            autoHeight
            rowHeight={64}
          />
        </DataState>
      </RailLayout>

      <ConfirmModal
        open={!!confirmId}
        heading="Delete contract?"
        body="This permanently removes the contract record."
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
          modalHeading="New contract"
          primaryButtonText={create.isPending ? "Creating…" : "Create"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!f.title || !f.party || create.isPending}
          onRequestClose={() => setOpen(false)}
          onRequestSubmit={() =>
            create.mutate({
              projectId: f.projectId || undefined,
              title: f.title,
              party: f.party,
              contractType:
                f.contractType as (typeof ContractType.options)[number],
              valuePaise: Math.round(Number(f.value || "0") * 100),
              startDate: f.startDate || undefined,
              endDate: f.endDate || undefined,
              notes: f.notes || undefined,
            })
          }
        >
          <Stack gap={5}>
            {(templatesQ.data ?? []).length > 0 && (
              <Select
                id="ct-tpl"
                labelText="Start from template (optional)"
                value=""
                onChange={(e) => {
                  const t = (templatesQ.data ?? []).find((x) => x.id === e.target.value);
                  if (!t) return;
                  setF((x) => ({ ...x, title: x.title || t.title, notes: t.body }));
                }}
              >
                <SelectItem value="" text="— none —" />
                {(templatesQ.data ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id} text={t.title} />
                ))}
              </Select>
            )}
            <TextInput id="ct-title" labelText="Title" value={f.title} onChange={set("title")} />
            <div style={{ display: "flex", gap: "1rem" }}>
              <TextInput id="ct-party" labelText="Party" value={f.party} onChange={set("party")} />
              <Select id="ct-type" labelText="Type" value={f.contractType} onChange={set("contractType")}>
                {ContractType.options.map((t) => (
                  <SelectItem key={t} value={t} text={CONTRACT_TYPE_LABEL[t]} />
                ))}
              </Select>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <TextInput id="ct-val" labelText="Value (₹)" type="number" value={f.value} onChange={set("value")} />
              <TextInput id="ct-start" labelText="Start date" type="date" value={f.startDate} onChange={set("startDate")} />
              <TextInput id="ct-end" labelText="End date" type="date" value={f.endDate} onChange={set("endDate")} />
            </div>
            <Select id="ct-proj" labelText="Related project (optional)" value={f.projectId} onChange={set("projectId")}>
              <SelectItem value="" text="— none —" />
              {(projectsQ.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id} text={`${p.ref} — ${p.title}`} />
              ))}
            </Select>
            <TextArea id="ct-notes" labelText="Notes (optional)" rows={3} value={f.notes} onChange={set("notes")} />
            {create.error && <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={create.error.message} />}
          </Stack>
        </Modal>
      </CarbonScope>
    </>
  );
}
