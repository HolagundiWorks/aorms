import {
  Checkbox,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  TextArea,
  Tile,
} from "@carbon/react";
import {
  PORTAL_SUBMISSION_KIND_LABEL,
  PORTAL_SUBMISSION_STATUS_LABEL,
  PORTAL_SUBMISSION_STATUS_TAG,
  REVISION_CATEGORY_LABEL,
  REVISION_CATEGORY_TAG,
  PortalSubmissionKind,
  PortalSubmissionStatus,
  type PortalSubmissionStatus as PortalSubmissionStatusT,
  type RevisionCategory as RevisionCategoryT,
} from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { CarbonScope } from "../carbon/CarbonScope.js";
import {
  DataGrid,
  DataState,
  StatusDot,
  StatusTag,
  type GridColDef,
} from "../carbon/adapters/index.js";
import { PageHeader } from "../components/PageHeader.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { SubmissionThread } from "../components/SubmissionThread.js";
import { trpc } from "../lib/trpc.js";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";

const KIND_TAG: Record<string, "purple" | "blue" | "teal"> = {
  ACKNOWLEDGEMENT: "teal",
  CHANGE_REQUEST: "purple",
  FEEDBACK: "blue",
};

const HELPER: React.CSSProperties = { margin: 0, color: "var(--cds-text-secondary)" };

export function ClientRequests({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");

  const listQ = trpc.clientRequests.list.useQuery({
    status: status ? (status as PortalSubmissionStatusT) : undefined,
    kind: kind ? (kind as (typeof PortalSubmissionKind.options)[number]) : undefined,
  });
  const rows = listQ.data ?? [];

  const [triage, setTriage] = useState<
    { id: string; subject: string; status: PortalSubmissionStatusT; responseNote: string } | null
  >(null);
  const setStatusM = trpc.clientRequests.setStatus.useMutation({
    meta: { errorTitle: "Couldn't update the request status" },
    onSuccess: () => {
      utils.clientRequests.list.invalidate();
      utils.clientRequests.openCount.invalidate();
      setTriage(null);
    },
  });

  // Impact assessment state
  const [impact, setImpact] = useState<{
    id: string;
    subject: string;
    refDrawingRef: string | null | undefined;
    refDrawingTitle: string | null | undefined;
    attentionToName: string | null | undefined;
    body: string | null | undefined;
    affectsCosting: boolean;
    affectsTimeline: boolean;
    isBillable: boolean;
    architectComment: string;
  } | null>(null);
  const sendImpact = trpc.clientRequests.sendImpactAssessment.useMutation({
    meta: { errorTitle: "Couldn't send the impact assessment" },
    onSuccess: () => {
      utils.clientRequests.list.invalidate();
      utils.clientRequests.openCount.invalidate();
      setImpact(null);
    },
  });

  const [threadFor, setThreadFor] = useState<{ id: string; subject: string } | null>(null);
  const threadQ = trpc.clientRequests.thread.useQuery(
    { id: threadFor?.id ?? "" },
    { enabled: !!threadFor },
  );
  const reply = trpc.clientRequests.reply.useMutation({
    meta: { errorTitle: "Couldn't send the reply" },
    onSuccess: () => utils.clientRequests.thread.invalidate(),
  });

  const columns: GridColDef[] = [
    {
      field: "kind",
      headerName: "Type",
      flex: 1,
      minWidth: 130,
      renderCell: (p) => (
        <StatusTag
          value={p.row.kind as string}
          map={KIND_TAG}
          label={PORTAL_SUBMISSION_KIND_LABEL[p.row.kind as keyof typeof PORTAL_SUBMISSION_KIND_LABEL] ?? p.row.kind}
        />
      ),
    },
    {
      field: "revisionCategory",
      headerName: "Revision",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) =>
        p.row.revisionCategory ? (
          <StatusTag
            value={p.row.revisionCategory as RevisionCategoryT}
            map={REVISION_CATEGORY_TAG}
            label={REVISION_CATEGORY_LABEL[p.row.revisionCategory as RevisionCategoryT] ?? p.row.revisionCategory}
          />
        ) : (
          <span>—</span>
        ),
    },
    {
      field: "subject",
      headerName: "Subject",
      flex: 2,
      minWidth: 240,
      sortable: false,
      renderCell: (p) => {
        const r = p.row;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0.5rem 0" }}>
            <span className="cds--type-body-01">{r.subject}</span>
            {r.body && (
              <span className="esti-label esti-label--secondary" style={{ color: "var(--cds-text-secondary)" }}>
                {r.body}
              </span>
            )}
            {r.rating != null && (
              <span className="esti-label esti-label--helper" style={{ color: "var(--cds-text-secondary)" }}>
                Rating: {r.rating}/5
              </span>
            )}
            {r.refDrawingRef && (
              <span className="esti-label esti-label--helper" style={{ color: "var(--cds-text-secondary)" }}>
                Ref drawing: {r.refDrawingRef}{r.refDrawingTitle ? ` — ${r.refDrawingTitle}` : ""}
              </span>
            )}
            {r.attentionToId && (
              <span className="esti-label esti-label--helper" style={{ color: "var(--cds-text-secondary)" }}>
                Attn: {(r as { submittedBy?: string | null }).submittedBy ?? r.attentionToId}
              </span>
            )}
          </div>
        );
      },
    },
    {
      field: "projectRef",
      headerName: "Project",
      flex: 1,
      minWidth: 120,
      renderCell: (p) => <Link to={`/projects/${p.row.projectId}`} className="cds--link">{p.row.projectRef}</Link>,
    },
    {
      field: "clientName",
      headerName: "Client",
      flex: 1,
      minWidth: 130,
      valueGetter: (v) => v ?? "—",
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1.2,
      minWidth: 150,
      renderCell: (p) => {
        const r = p.row;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0.5rem 0" }}>
            <StatusTag
              value={r.status as PortalSubmissionStatusT}
              map={PORTAL_SUBMISSION_STATUS_TAG}
              label={PORTAL_SUBMISSION_STATUS_LABEL[r.status as PortalSubmissionStatusT] ?? r.status}
            />
            {(r.affectsCosting || r.affectsTimeline || r.isBillable) && (
              <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                {r.affectsCosting && <StatusDot color="red" label="Cost" />}
                {r.affectsTimeline && <StatusDot color="magenta" label="Time" />}
                {r.isBillable && <StatusDot color="purple" label="Billable" />}
              </div>
            )}
          </div>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      minWidth: 150,
      flex: 1,
      renderCell: (p) => {
        const r = p.row;
        return (
          <RowActionsMenu
            actions={[
              r.kind === "CHANGE_REQUEST" &&
                !["IMPACT_SENT", "CLIENT_APPROVED", "CLIENT_REJECTED", "RESOLVED", "DECLINED"].includes(r.status) && {
                  label: "Send impact",
                  onClick: () =>
                    setImpact({
                      id: r.id,
                      subject: r.subject,
                      refDrawingRef: r.refDrawingRef,
                      refDrawingTitle: r.refDrawingTitle,
                      attentionToName: r.attentionToId ? String(r.attentionToId) : null,
                      body: r.body,
                      affectsCosting: r.affectsCosting ?? false,
                      affectsTimeline: r.affectsTimeline ?? false,
                      isBillable: r.isBillable ?? false,
                      architectComment: r.architectComment ?? "",
                    }),
                },
              {
                label: "Triage",
                onClick: () =>
                  setTriage({
                    id: r.id,
                    subject: r.subject,
                    status: r.status as PortalSubmissionStatusT,
                    responseNote: r.responseNote ?? "",
                  }),
              },
              {
                label: "Reply",
                onClick: () => setThreadFor({ id: r.id, subject: r.subject }),
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <CarbonScope>
      <Stack gap={6}>
        {!embedded && (
          <PageHeader
            title="Client requests"
            description={`Acknowledgements, change requests and feedback raised from the ${AORMS_PORTALS.client.label.toLowerCase()}.`}
          />
        )}

        <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ minWidth: 180 }}>
            <Select
              id="cr-status"
              size="sm"
              labelText="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <SelectItem value="" text="All statuses" />
              {PortalSubmissionStatus.options.map((s) => (
                <SelectItem key={s} value={s} text={PORTAL_SUBMISSION_STATUS_LABEL[s]} />
              ))}
            </Select>
          </div>
          <div style={{ minWidth: 180 }}>
            <Select
              id="cr-kind"
              size="sm"
              labelText="Kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <SelectItem value="" text="All kinds" />
              {PortalSubmissionKind.options.map((k) => (
                <SelectItem key={k} value={k} text={PORTAL_SUBMISSION_KIND_LABEL[k]} />
              ))}
            </Select>
          </div>
        </div>

        {listQ.error && (
          <InlineNotification kind="error" lowContrast hideCloseButton title="Could not load client requests" subtitle={listQ.error.message} />
        )}

        <DataState
          loading={listQ.isLoading}
          isEmpty={rows.length === 0}
          columnCount={7}
          empty={{ title: "No client requests", description: `Items raised from the ${AORMS_PORTALS.client.label.toLowerCase()} appear here.` }}
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

        {/* ── Impact Assessment modal ──────────────────────────────────────── */}
        <Modal
          open={impact !== null}
          size="sm"
          modalHeading={impact ? `Impact assessment — ${impact.subject}` : "Impact assessment"}
          primaryButtonText={sendImpact.isPending ? "Sending…" : "Send to client"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={sendImpact.isPending}
          onRequestClose={() => setImpact(null)}
          onRequestSubmit={() =>
            impact &&
            sendImpact.mutate({
              submissionId: impact.id,
              affectsCosting: impact.affectsCosting,
              affectsTimeline: impact.affectsTimeline,
              isBillable: impact.isBillable,
              architectComment: impact.architectComment || undefined,
            })
          }
        >
          {impact && (
            <Stack gap={5}>
              {impact.body && (
                <Tile>
                  <p className="cds--type-label-01" style={HELPER}>Client&apos;s request</p>
                  <p className="cds--type-body-01" style={{ margin: "0.25rem 0 0" }}>{impact.body}</p>
                  {impact.refDrawingRef && (
                    <p className="cds--type-label-01" style={{ ...HELPER, marginTop: "0.5rem" }}>
                      Reference drawing: {impact.refDrawingRef}{impact.refDrawingTitle ? ` — ${impact.refDrawingTitle}` : ""}
                    </p>
                  )}
                </Tile>
              )}
              <p className="cds--type-body-01" style={{ margin: 0 }}>Tick all that apply to this change:</p>
              <Stack gap={4}>
                <div>
                  <Checkbox
                    id="ia-costing"
                    checked={impact.affectsCosting}
                    onChange={(_e, { checked }) => setImpact({ ...impact, affectsCosting: checked })}
                    labelText="Affects costing"
                  />
                  <p className="cds--type-label-01" style={{ ...HELPER, marginLeft: "1.5rem" }}>
                    This change will require a revised fee or additional costing.
                  </p>
                </div>
                <div>
                  <Checkbox
                    id="ia-timeline"
                    checked={impact.affectsTimeline}
                    onChange={(_e, { checked }) => setImpact({ ...impact, affectsTimeline: checked })}
                    labelText="Affects timeline / delivery schedule"
                  />
                  <p className="cds--type-label-01" style={{ ...HELPER, marginLeft: "1.5rem" }}>
                    This change will extend or shift the project delivery dates.
                  </p>
                </div>
                <div>
                  <Checkbox
                    id="ia-billable"
                    checked={impact.isBillable}
                    onChange={(_e, { checked }) => setImpact({ ...impact, isBillable: checked })}
                    labelText="Billable additional work"
                  />
                  <p className="cds--type-label-01" style={{ ...HELPER, marginLeft: "1.5rem" }}>
                    This change is outside the original scope and will be billed separately.
                  </p>
                </div>
              </Stack>
              <TextArea
                id="ia-comment"
                labelText="Your comment to the client (optional)"
                helperText="Explain the impact in plain terms. The client will see this before approving."
                rows={4}
                value={impact.architectComment}
                onChange={(e) => setImpact({ ...impact, architectComment: e.target.value })}
              />
              {sendImpact.error && (
                <InlineNotification kind="error" lowContrast hideCloseButton title="Could not send" subtitle={sendImpact.error.message} />
              )}
            </Stack>
          )}
        </Modal>

        {/* ── Triage modal ─────────────────────────────────────────────────── */}
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
                id="tr-status"
                labelText="Status"
                value={triage.status}
                onChange={(e) => setTriage({ ...triage, status: e.target.value as PortalSubmissionStatusT })}
              >
                {PortalSubmissionStatus.options.map((s) => (
                  <SelectItem key={s} value={s} text={PORTAL_SUBMISSION_STATUS_LABEL[s]} />
                ))}
              </Select>
              <TextArea
                id="tr-note"
                labelText="Response to client (optional)"
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

        {/* ── Thread modal ─────────────────────────────────────────────────── */}
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
      </Stack>
    </CarbonScope>
  );
}
