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
  CONSULTANT_SUBMISSION_KIND_LABEL,
  CONSULTANT_SUBMISSION_KIND_TAG,
  CONSULTANT_SUBMISSION_STATUS_LABEL,
  CONSULTANT_SUBMISSION_STATUS_TAG,
  ConsultantSubmissionKind,
  ConsultantSubmissionStatus,
  type ConsultantSubmissionKind as ConsultantSubmissionKindT,
} from "@esti/contracts";
import { useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { Link } from "react-router-dom";
import { CarbonScope } from "../carbon/CarbonScope.js";
import {
  DataGrid,
  DataState,
  StatusTag,
  type GridColDef,
} from "../carbon/adapters/index.js";
import { PageHeader } from "../components/PageHeader.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { SubmissionThread } from "../components/SubmissionThread.js";
import { trpc } from "../lib/trpc.js";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";

type SubmissionStatus = keyof typeof CONSULTANT_SUBMISSION_STATUS_LABEL;

export function ConsultantRequests({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");

  const listQ = trpc.consultantRequests.list.useQuery({
    status: status ? (status as SubmissionStatus) : undefined,
    kind: kind ? (kind as ConsultantSubmissionKindT) : undefined,
  });
  const rows = listQ.data ?? [];

  const [triage, setTriage] = useState<
    { id: string; subject: string; status: SubmissionStatus; responseNote: string } | null
  >(null);
  const setStatusM = trpc.consultantRequests.setStatus.useMutation({
    meta: { errorTitle: "Couldn't update the request status" },
    onSuccess: () => {
      utils.consultantRequests.list.invalidate();
      utils.consultantRequests.openCount.invalidate();
      setTriage(null);
    },
  });

  const [threadFor, setThreadFor] = useState<{ id: string; subject: string } | null>(null);
  const threadQ = trpc.consultantRequests.thread.useQuery(
    { id: threadFor?.id ?? "" },
    { enabled: !!threadFor },
  );
  const reply = trpc.consultantRequests.reply.useMutation({
    meta: { errorTitle: "Couldn't send the reply" },
    onSuccess: () => utils.consultantRequests.thread.invalidate(),
  });

  // ── assign a task to a consultant ──────────────────────────────────────────
  const [assignOpen, setAssignOpen] = useState(false);
  const [assign, setAssign] = useState({ projectId: "", consultantId: "", subject: "", body: "" });
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 200, offset: 0 });
  const engagementsQ = trpc.engagements.listByProject.useQuery(
    { projectId: assign.projectId },
    { enabled: !!assign.projectId },
  );
  const assignM = trpc.consultantRequests.assign.useMutation({
    meta: { errorTitle: "Couldn't assign the task" },
    onSuccess: () => {
      utils.consultantRequests.list.invalidate();
      utils.consultantRequests.openCount.invalidate();
      setAssignOpen(false);
      setAssign({ projectId: "", consultantId: "", subject: "", body: "" });
    },
  });

  const noEngagements = !!assign.projectId && (engagementsQ.data?.rows ?? []).length === 0;

  useScreenActions(
    [
      {
        id: "assign-task",
        zone: "center",
        tone: "primary",
        label: "Assign task",
        icon: <Add />,
        onClick: () => setAssignOpen(true),
      },
    ],
    [],
  );

  const columns: GridColDef[] = [
    {
      field: "kind",
      headerName: "Type",
      flex: 1,
      minWidth: 130,
      renderCell: (p) => (
        <StatusTag
          value={p.row.kind as ConsultantSubmissionKindT}
          map={CONSULTANT_SUBMISSION_KIND_TAG}
          label={CONSULTANT_SUBMISSION_KIND_LABEL[p.row.kind as ConsultantSubmissionKindT] ?? p.row.kind}
        />
      ),
    },
    {
      field: "subject",
      headerName: "Subject",
      flex: 2,
      minWidth: 220,
      sortable: false,
      renderCell: (p) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0.5rem 0" }}>
          <span className="cds--type-body-01">{p.row.subject}</span>
          {p.row.body && (
            <span className="esti-label esti-label--secondary" style={{ color: "var(--cds-text-secondary)" }}>
              {p.row.body}
            </span>
          )}
        </div>
      ),
    },
    {
      field: "projectRef",
      headerName: "Project",
      flex: 1,
      minWidth: 120,
      renderCell: (p) => <Link to={`/projects/${p.row.projectId}`} className="cds--link">{p.row.projectRef}</Link>,
    },
    {
      field: "consultant",
      headerName: "Consultant",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => row.consultantName ?? row.submittedBy ?? "—",
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      minWidth: 130,
      renderCell: (p) => (
        <StatusTag
          value={p.row.status as SubmissionStatus}
          map={CONSULTANT_SUBMISSION_STATUS_TAG}
          label={CONSULTANT_SUBMISSION_STATUS_LABEL[p.row.status as SubmissionStatus] ?? p.row.status}
        />
      ),
    },
    {
      field: "action",
      headerName: "Action",
      sortable: false,
      filterable: false,
      minWidth: 170,
      flex: 1,
      renderCell: (p) => (
        <RowActionsMenu
          actions={[
            {
              label: "Triage",
              onClick: () =>
                setTriage({
                  id: p.row.id,
                  subject: p.row.subject,
                  status: p.row.status as SubmissionStatus,
                  responseNote: p.row.responseNote ?? "",
                }),
            },
            {
              label: "Reply",
              onClick: () => setThreadFor({ id: p.row.id, subject: p.row.subject }),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <CarbonScope>
      <Stack gap={6}>
        {!embedded && (
          <PageHeader
            title="Consultant requests"
            description="Deliverables, RFIs and notes raised by engaged consultants — and tasks you assign to them."
          />
        )}

        <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ minWidth: 180 }}>
            <Select
              id="cnr-status"
              size="sm"
              labelText="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <SelectItem value="" text="All statuses" />
              {ConsultantSubmissionStatus.options.map((s) => (
                <SelectItem key={s} value={s} text={CONSULTANT_SUBMISSION_STATUS_LABEL[s]} />
              ))}
            </Select>
          </div>
          <div style={{ minWidth: 180 }}>
            <Select
              id="cnr-kind"
              size="sm"
              labelText="Kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <SelectItem value="" text="All kinds" />
              {ConsultantSubmissionKind.options.map((k) => (
                <SelectItem key={k} value={k} text={CONSULTANT_SUBMISSION_KIND_LABEL[k]} />
              ))}
            </Select>
          </div>
        </div>

        {listQ.error && (
          <InlineNotification kind="error" lowContrast hideCloseButton title="Could not load consultant requests" subtitle={listQ.error.message} />
        )}

        <DataState
          loading={listQ.isLoading}
          isEmpty={rows.length === 0}
          columnCount={6}
          empty={{ title: "No consultant requests", description: `Items raised from the ${AORMS_PORTALS.consultant.alias.toLowerCase()} appear here.` }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            getRowHeight={() => "auto"}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </DataState>

        <Modal
          open={triage !== null}
          size="sm"
          modalHeading={triage ? `Triage — ${triage.subject}` : "Triage"}
          primaryButtonText={setStatusM.isPending ? "Saving…" : "Save"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={setStatusM.isPending}
          onRequestClose={() => setTriage(null)}
          onRequestSubmit={() =>
            triage &&
            setStatusM.mutate({
              id: triage.id,
              status: triage.status,
              responseNote: triage.responseNote || undefined,
            })
          }
        >
          {triage && (
            <Stack gap={5}>
              <Select
                id="cnr-tr-status"
                labelText="Status"
                value={triage.status}
                onChange={(e) => setTriage({ ...triage, status: e.target.value as SubmissionStatus })}
              >
                {ConsultantSubmissionStatus.options.map((s) => (
                  <SelectItem key={s} value={s} text={CONSULTANT_SUBMISSION_STATUS_LABEL[s]} />
                ))}
              </Select>
              <TextArea
                id="cnr-tr-note"
                labelText="Response to consultant (optional)"
                rows={3}
                value={triage.responseNote}
                onChange={(e) => setTriage({ ...triage, responseNote: e.target.value })}
              />
              {setStatusM.error && (
                <InlineNotification kind="error" lowContrast hideCloseButton title="Could not save" subtitle={setStatusM.error.message} />
              )}
            </Stack>
          )}
        </Modal>

        <Modal
          open={threadFor !== null}
          size="sm"
          passiveModal
          modalHeading={threadFor ? `Conversation — ${threadFor.subject}` : "Conversation"}
          onRequestClose={() => setThreadFor(null)}
        >
          {threadFor && (
            <SubmissionThread
              messages={threadQ.data ?? []}
              loading={threadQ.isLoading}
              pending={reply.isPending}
              onReply={(body) => reply.mutate({ id: threadFor.id, body })}
            />
          )}
        </Modal>

        <Modal
          open={assignOpen}
          size="sm"
          modalHeading="Assign a task to a consultant"
          primaryButtonText={assignM.isPending ? "Assigning…" : "Assign"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!assign.projectId || !assign.consultantId || !assign.subject || assignM.isPending}
          onRequestClose={() => setAssignOpen(false)}
          onRequestSubmit={() =>
            assignM.mutate({
              projectId: assign.projectId,
              consultantId: assign.consultantId,
              subject: assign.subject,
              body: assign.body || undefined,
            })
          }
        >
          <Stack gap={5}>
            <Select
              id="as-proj"
              labelText="Project"
              value={assign.projectId}
              onChange={(e) => setAssign((a) => ({ ...a, projectId: e.target.value, consultantId: "" }))}
            >
              <SelectItem value="" text="— select a project —" />
              {(projectsQ.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id} text={`${p.ref} ${p.title}`} />
              ))}
            </Select>
            <Select
              id="as-cons"
              labelText="Consultant"
              disabled={!assign.projectId || (engagementsQ.data?.rows ?? []).length === 0}
              helperText={noEngagements ? "No consultants engaged on this project" : undefined}
              value={assign.consultantId}
              onChange={(e) => setAssign((a) => ({ ...a, consultantId: e.target.value }))}
            >
              <SelectItem value="" text="— select a consultant —" />
              {(engagementsQ.data?.rows ?? []).map((en) => (
                <SelectItem key={en.consultantId} value={en.consultantId} text={en.consultantName ?? en.consultantId} />
              ))}
            </Select>
            <TextInput
              id="as-subject"
              labelText="Task"
              value={assign.subject}
              onChange={(e) => setAssign((a) => ({ ...a, subject: e.target.value }))}
            />
            <TextArea
              id="as-body"
              labelText="Details (optional)"
              rows={3}
              value={assign.body}
              onChange={(e) => setAssign((a) => ({ ...a, body: e.target.value }))}
            />
            {assignM.error && (
              <InlineNotification kind="error" lowContrast hideCloseButton title="Could not assign" subtitle={assignM.error.message} />
            )}
          </Stack>
        </Modal>
      </Stack>
    </CarbonScope>
  );
}
