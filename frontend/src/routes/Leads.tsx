import {
  Checkbox,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  TextArea,
  TextInput,
} from "@carbon/react";
import {
  LEAD_SOURCE_LABEL,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_TAG,
  LeadSource,
  LeadStatus,
  PROJECT_WORK_TYPE_LABEL,
  ProjectType,
  ProjectWorkType,
  type LeadStatus as LeadStatusT,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Add } from "@carbon/icons-react";
import { pushToast, useScreenActions } from "@hcw/ui-kit";
import { CarbonScope } from "../carbon/CarbonScope.js";
import {
  DataGrid,
  DataState,
  PageBreadcrumb,
  StatusTag,
  type GridColDef,
} from "../carbon/adapters/index.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { ComplianceCalculator } from "../components/compliance/ComplianceCalculator.js";
import { trpc } from "../lib/trpc.js";

const SOURCE_OPTIONS = LeadSource.options;
const STATUS_OPTIONS = LeadStatus.options;
const TERMINAL: ReadonlySet<string> = new Set(["QUALIFIED", "DROPPED", "LOST"]);

export function Leads() {
  const utils = trpc.useUtils();
  const listQ = trpc.leads.list.useQuery({});
  const clientsQ = trpc.clients.list.useQuery({ limit: 200, offset: 0 });
  const inv = () => utils.leads.list.invalidate();

  // Create lead
  const [open, setOpen] = useState(false);
  // Convert lead
  const [convertId, setConvertId] = useState<string | null>(null);

  useScreenActions(
    open || !!convertId
      ? []
      : [
          {
            id: "new-lead",
            zone: "center",
            tone: "primary",
            label: "New lead",
            icon: <Add />,
            onClick: () => setOpen(true),
          },
        ],
    [open, convertId],
  );

  const blank = {
    clientName: "",
    phone: "",
    email: "",
    leadSource: "WEBSITE",
    projectType: "",
    siteLocation: "",
    city: "",
    notes: "",
  };
  const [form, setForm] = useState(blank);
  const create = trpc.leads.create.useMutation({
    meta: { errorTitle: "Couldn't create the lead" },
    onSuccess: () => { inv(); setOpen(false); setForm(blank); },
  });

  // Optimistic status change (Doherty — the dropdown must feel instant): write the
  // cache immediately, roll back on error, reconcile with the server on settle.
  const setStatus = trpc.leads.setStatus.useMutation({
    meta: { errorTitle: "Couldn't update the lead status" },
    onMutate: async ({ id, status }) => {
      await utils.leads.list.cancel();
      const prev = utils.leads.list.getData({});
      utils.leads.list.setData({}, (old) =>
        old?.map((l) => (l.id === id ? { ...l, status } : l)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.leads.list.setData({}, ctx.prev);
    },
    onSuccess: (_d, v) =>
      pushToast({ kind: "success", title: `Lead marked ${LEAD_STATUS_LABEL[v.status]}` }),
    onSettled: inv,
  });

  const [conv, setConv] = useState({
    projectTitle: "",
    projectType: "",
    workType: "ARCHITECTURE",
    clientId: "",
    conflictCheckDone: false,
    conflictCheckNotes: "",
  });
  const convert = trpc.leads.convert.useMutation({
    meta: { errorTitle: "Couldn't convert the lead" },
    onSuccess: () => { inv(); setConvertId(null); },
  });

  const leads = listQ.data ?? [];

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 0.7, minWidth: 90 },
    {
      field: "clientName",
      headerName: "Enquirer",
      flex: 1.4,
      minWidth: 180,
      sortable: false,
      renderCell: (p) => (
        <div style={{ padding: "0.25rem 0" }}>
          <div>{p.row.clientName}</div>
          <span className="esti-label--secondary">
            {[p.row.phone, p.row.email].filter(Boolean).join(" · ") || "—"}
          </span>
        </div>
      ),
    },
    {
      field: "leadSource",
      headerName: "Source",
      flex: 1,
      minWidth: 120,
      valueGetter: (_v, row) =>
        LEAD_SOURCE_LABEL[row.leadSource as keyof typeof LEAD_SOURCE_LABEL] ?? row.leadSource,
    },
    {
      field: "projectType",
      headerName: "Project",
      flex: 1.1,
      minWidth: 150,
      sortable: false,
      renderCell: (p) => {
        const l = p.row;
        return l.convertedProjectId ? (
          <Link to={`/projects/${l.convertedProjectId}`} className="cds--link">{l.projectType || "View project"}</Link>
        ) : (
          <div style={{ padding: "0.25rem 0" }}>
            <div>{l.projectType || "—"}</div>
            <span className="esti-label--secondary">{l.city || ""}</span>
          </div>
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1.2,
      minWidth: 170,
      sortable: false,
      renderCell: (p) => {
        const l = p.row;
        return l.convertedProjectId ? (
          <StatusTag
            value={l.status as LeadStatusT}
            map={LEAD_STATUS_TAG}
            label={LEAD_STATUS_LABEL[l.status as LeadStatusT] ?? l.status}
          />
        ) : (
          <div style={{ minWidth: 150 }}>
            <Select
              id={`st-${l.id}`}
              labelText="Status"
              hideLabel
              size="sm"
              value={l.status}
              onChange={(e) => setStatus.mutate({ id: l.id, status: e.target.value as LeadStatusT })}
            >
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} text={LEAD_STATUS_LABEL[s]} />
              ))}
            </Select>
          </div>
        );
      },
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 110,
      renderCell: (p) => {
        const l = p.row;
        if (TERMINAL.has(l.status)) return null;
        return (
          <RowActionsMenu
            actions={[
              {
                label: "Convert",
                onClick: () => {
                  // A lead's project type is free text — only carry it over
                  // if it matches a real ProjectType, else pick a valid default.
                  const carried = (ProjectType.options as readonly string[]).includes(l.projectType ?? "")
                    ? (l.projectType as string)
                    : ProjectType.options[0]!;
                  setConv({
                    projectTitle: l.projectType || l.clientName,
                    projectType: carried,
                    workType: "ARCHITECTURE",
                    clientId: "",
                    conflictCheckDone: false,
                    conflictCheckNotes: "",
                  });
                  setConvertId(l.id);
                },
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <>
      <RailLayout
        title="Leads"
        description="Inbound enquiries — qualify, then convert to a draft project."
      >
        <PageBreadcrumb items={[{ label: "Leads" }]} />
        <CarbonScope>
          <Tabs>
            <TabList aria-label="Lead development sections" contained>
              <Tab>Lead register</Tab>
              <Tab>Permissible development</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <DataState
                  loading={listQ.isLoading}
                  isEmpty={leads.length === 0}
                  columnCount={6}
                  empty={{
                    title: "No leads yet",
                    description: "Capture an enquiry to start the acquisition funnel.",
                  }}
                >
                  <DataGrid
                    rows={leads}
                    columns={columns}
                    getRowHeight={() => "auto"}
                    density="compact"
                    disableRowSelectionOnClick
                    hideFooter
                    autoHeight
                  />
                </DataState>
              </TabPanel>
              <TabPanel>
                <ComplianceCalculator />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CarbonScope>
      </RailLayout>

      <CarbonScope>
        {/* Create lead */}
        <Modal
          open={open}
          size="sm"
          modalHeading="New lead"
          primaryButtonText={create.isPending ? "Saving…" : "Capture lead"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!form.clientName || create.isPending}
          onRequestClose={() => setOpen(false)}
          onRequestSubmit={() =>
            create.mutate({
              clientName: form.clientName,
              phone: form.phone || undefined,
              email: form.email || undefined,
              leadSource: form.leadSource as (typeof SOURCE_OPTIONS)[number],
              projectType: form.projectType || undefined,
              siteLocation: form.siteLocation || undefined,
              city: form.city || undefined,
              notes: form.notes || undefined,
            })
          }
        >
          <Stack gap={5}>
            <TextInput id="ld-name" labelText="Enquirer name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
            <TextInput id="ld-phone" labelText="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <TextInput id="ld-email" labelText="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Select id="ld-src" labelText="Lead source" value={form.leadSource} onChange={(e) => setForm({ ...form, leadSource: e.target.value })}>
              {SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s} text={LEAD_SOURCE_LABEL[s]} />)}
            </Select>
            <TextInput id="ld-ptype" labelText="Project type (optional)" value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })} />
            <TextInput id="ld-loc" labelText="Site location (optional)" value={form.siteLocation} onChange={(e) => setForm({ ...form, siteLocation: e.target.value })} />
            <TextInput id="ld-city" labelText="City (optional)" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <TextArea id="ld-notes" labelText="Notes (optional)" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            {create.error && <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={create.error.message} />}
          </Stack>
        </Modal>

        {/* Convert lead */}
        <Modal
          open={!!convertId}
          size="sm"
          modalHeading="Convert lead to draft project"
          primaryButtonText={convert.isPending ? "Converting…" : "Create draft project"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!conv.projectTitle || !conv.projectType || !conv.conflictCheckDone || convert.isPending}
          onRequestClose={() => setConvertId(null)}
          onRequestSubmit={() => {
            if (!convertId) return;
            convert.mutate({
              id: convertId,
              projectTitle: conv.projectTitle,
              projectType: conv.projectType as (typeof ProjectType.options)[number],
              workType: conv.workType as (typeof ProjectWorkType.options)[number],
              clientId: conv.clientId || undefined,
              conflictCheckDone: conv.conflictCheckDone,
              conflictCheckNotes: conv.conflictCheckNotes || undefined,
            });
          }}
        >
          <Stack gap={5}>
            <p className="esti-label--secondary">
              Creates a client (or reuses an existing one) and a draft project in ENQUIRY stage. The lead is marked Qualified.
            </p>
            <TextInput id="cv-title" labelText="Project title" value={conv.projectTitle} onChange={(e) => setConv({ ...conv, projectTitle: e.target.value })} />
            <Select id="cv-type" labelText="Project type" value={conv.projectType} onChange={(e) => setConv({ ...conv, projectType: e.target.value })}>
              {ProjectType.options.map((t) => <SelectItem key={t} value={t} text={t} />)}
            </Select>
            <Select id="cv-work" labelText="Discipline" value={conv.workType} onChange={(e) => setConv({ ...conv, workType: e.target.value })}>
              {ProjectWorkType.options.map((t) => <SelectItem key={t} value={t} text={PROJECT_WORK_TYPE_LABEL[t]} />)}
            </Select>
            <Select id="cv-client" labelText="Client" value={conv.clientId} onChange={(e) => setConv({ ...conv, clientId: e.target.value })}>
              <SelectItem value="" text="— Create new client from lead —" />
              {(clientsQ.data ?? []).map((c) => <SelectItem key={c.id} value={c.id} text={c.name} />)}
            </Select>
            <Checkbox
              id="cv-conflict"
              checked={conv.conflictCheckDone}
              onChange={(_e, { checked }) => setConv({ ...conv, conflictCheckDone: checked })}
              labelText="No conflict of interest identified — no other architect already holds this commission without a written release (COA Regulations, 1989)."
            />
            <TextArea
              id="cv-conflict-notes"
              labelText="Conflict-check notes (optional)"
              value={conv.conflictCheckNotes}
              onChange={(e) => setConv({ ...conv, conflictCheckNotes: e.target.value })}
              rows={2}
            />
            {convert.error && <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={convert.error.message} />}
          </Stack>
        </Modal>
      </CarbonScope>
    </>
  );
}
