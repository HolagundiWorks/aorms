import {
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import {
  TENDER_INVITATION_STATUS_LABEL,
  TENDER_INVITATION_STATUS_TAG,
  TENDER_STATUS_LABEL,
  TENDER_STATUS_TAG,
  canTransitionTenderStatus,
  formatINR,
  type TenderInvitationStatus,
  type TenderStatus,
} from "@esti/contracts";
import { Add } from "@carbon/icons-react";
import { pushToast, useScreenActions } from "@hcw/ui-kit";
import { useState, type CSSProperties } from "react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { DataGrid, DataState, StatusTag, type GridColDef } from "../../carbon/adapters/index.js";
import { trpc } from "../../lib/trpc.js";

const SUBTLE: CSSProperties = { margin: 0, color: "var(--cds-text-secondary)" };

/**
 * Project › Tenders — firm issues tenders; invited contractors bid in the portal.
 */
export function ProjectTenders({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.tenders.listByProject.useQuery({ projectId });
  const contractorsQ = trpc.contractors.list.useQuery({ activeOnly: true });
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [inviteId, setInviteId] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: "",
    dueDate: "",
    scope: "",
    instructions: "",
  });

  useScreenActions(
    createOpen || detailId
      ? []
      : [
          {
            id: "new-tender",
            zone: "center",
            tone: "primary",
            label: "New tender",
            icon: <Add />,
            onClick: () => setCreateOpen(true),
          },
        ],
    [createOpen, detailId],
  );

  const inv = () => {
    utils.tenders.listByProject.invalidate({ projectId });
    if (detailId) utils.tenders.byId.invalidate({ id: detailId });
  };

  const create = trpc.tenders.create.useMutation({
    meta: { errorTitle: "Couldn't create the tender" },
    onSuccess: (row) => {
      inv();
      setCreateOpen(false);
      setForm({ title: "", category: "", dueDate: "", scope: "", instructions: "" });
      setDetailId(row.id);
      pushToast({ kind: "success", title: "Tender drafted" });
    },
  });

  const setStatus = trpc.tenders.setStatus.useMutation({
    meta: { errorTitle: "Couldn't update tender status" },
    onSuccess: (_d, v) => {
      inv();
      pushToast({ kind: "success", title: `Tender ${TENDER_STATUS_LABEL[v.status]}` });
    },
  });

  const invite = trpc.tenders.invite.useMutation({
    meta: { errorTitle: "Couldn't invite contractor" },
    onSuccess: () => {
      inv();
      setInviteId("");
      pushToast({ kind: "success", title: "Contractor invited" });
    },
  });

  const award = trpc.tenders.award.useMutation({
    meta: { errorTitle: "Couldn't award the tender" },
    onSuccess: () => {
      inv();
      pushToast({ kind: "success", title: "Tender awarded" });
    },
  });

  const detailQ = trpc.tenders.byId.useQuery(
    { id: detailId! },
    { enabled: !!detailId },
  );

  const rows = listQ.data ?? [];
  const columns: GridColDef[] = [
    { field: "title", headerName: "Tender", flex: 1.6, minWidth: 180 },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (p) => (
        <StatusTag
          value={p.row.status as TenderStatus}
          map={TENDER_STATUS_TAG}
          label={TENDER_STATUS_LABEL[p.row.status as TenderStatus] ?? p.row.status}
        />
      ),
    },
    {
      field: "dueDate",
      headerName: "Due",
      width: 120,
      valueGetter: (_v, row) => row.dueDate ?? "—",
    },
    {
      field: "category",
      headerName: "Category",
      width: 120,
      valueGetter: (_v, row) => row.category ?? "—",
    },
  ];

  const detail = detailQ.data;
  const tender = detail?.tender;

  return (
    <>
      <CarbonScope>
        <Stack spacing={2}>
          <p className="cds--type-body-01" style={SUBTLE}>
            Issue a tender to invited contractors. They bid in the contractor portal; amounts stay
            sealed until you close the tender.
          </p>
          <DataState
            loading={listQ.isLoading}
            isEmpty={rows.length === 0}
            columnCount={4}
            empty={{
              title: "No tenders yet",
              description: "Draft a tender, invite contractors, then open bidding.",
              action: (
                <Button size="small" variant="outlined" onClick={() => setCreateOpen(true)}>
                  New tender
                </Button>
              ),
            }}
          >
            <DataGrid
              rows={rows}
              columns={columns}
              density="compact"
              autoHeight
              hideFooter
              disableRowSelectionOnClick
              onRowClick={(p) => setDetailId(p.row.id as string)}
            />
          </DataState>
        </Stack>
      </CarbonScope>

      <CarbonScope>
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>New tender</DialogTitle>
      <DialogContent>

          <Stack spacing={2.5}>
            <TextField id="tn-title" label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} size="small" />
            <TextField id="tn-cat" label="Category (optional)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Civil · Structural · MEP…" size="small" />
            <TextField id="tn-due" type="date" label="Due date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} size="small" />
            <TextField id="tn-scope" label="Scope" rows={3} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} multiline fullWidth></TextField>
            <TextField id="tn-instr" label="Instructions to bidders" rows={2} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} multiline fullWidth></TextField>
            {create.error && <Alert severity="error"><AlertTitle>Error</AlertTitle>{create.error.message}</Alert>}
          </Stack>
        
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
        <Button variant="contained" disabled={!form.title || create.isPending} onClick={() =>
            create.mutate({
              projectId,
              title: form.title,
              category: form.category || undefined,
              dueDate: form.dueDate || undefined,
              scope: form.scope || undefined,
              instructions: form.instructions || undefined,
            })
          }>{create.isPending ? "Saving…" : "Create draft"}</Button>
      </DialogActions>
    </Dialog>

        <Dialog open={!!detailId} onClose={() => setDetailId(null)} fullWidth maxWidth="sm">
      <DialogTitle>{tender?.title ?? "Tender"}</DialogTitle>
      <DialogContent>

          {detailQ.isLoading || !tender || !detail ? (
            <p className="cds--type-body-01" style={{ margin: 0 }}>Loading…</p>
          ) : (
            <Stack spacing={2.5}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <StatusTag
                  value={tender.status as TenderStatus}
                  map={TENDER_STATUS_TAG}
                  label={TENDER_STATUS_LABEL[tender.status as TenderStatus]}
                />
                <span className="cds--type-body-01" style={SUBTLE}>
                  Due {tender.dueDate ?? "—"}
                  {tender.category ? ` · ${tender.category}` : ""}
                </span>
              </div>
              {tender.scope && (
                <p className="cds--type-body-01" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                  {tender.scope}
                </p>
              )}

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {(["OPEN", "CLOSED", "CANCELLED"] as TenderStatus[]).map((s) =>
                  canTransitionTenderStatus(tender.status, s) && s !== tender.status ? (
                    <Button key={s} size="small" variant="contained" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: tender.id, status: s })}>
                      Mark {TENDER_STATUS_LABEL[s]}
                    </Button>
                  ) : null,
                )}
              </div>
              {tender.status === "CLOSED" && (
                <p className="cds--type-label-01" style={SUBTLE}>
                  Award a contractor with a submitted bid below — do not mark awarded without a
                  winner.
                </p>
              )}
              {setStatus.error && <Alert severity="error"><AlertTitle>Error</AlertTitle>{setStatus.error.message}</Alert>}

              <div>
                <p className="cds--type-label-01" style={{ ...SUBTLE, textTransform: "uppercase", letterSpacing: "0.02em" }}>Invitations</p>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", margin: "0.5rem 0" }}>
                  <div style={{ minWidth: 220 }}>
                    <TextField id="tn-invite" size="small" label="Contractor" value={inviteId} onChange={(e) => setInviteId(e.target.value)} disabled={tender.status === "AWARDED" || tender.status === "CANCELLED"} select>
                      <MenuItem value="">Select…</MenuItem>
                      {(contractorsQ.data ?? []).map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                    </TextField>
                  </div>
                  <Button size="small" variant="outlined" disabled={!inviteId || invite.isPending} onClick={() => invite.mutate({ tenderId: tender.id, contractorId: inviteId })}>
                    Invite
                  </Button>
                </div>
                {invite.error && <Alert severity="error"><AlertTitle>Error</AlertTitle>{invite.error.message}</Alert>}
                <Stack spacing={1}>
                  {detail.invitations.map((i) => (
                    <div
                      key={i.id}
                      style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0", borderBottom: "1px solid var(--cds-border-subtle)" }}
                    >
                      <div style={{ flex: 1 }}>
                        <p className="cds--type-body-01" style={{ margin: 0 }}>{i.contractorName}</p>
                        <p className="cds--type-label-01" style={SUBTLE}>{i.contractorCategory ?? "—"}</p>
                      </div>
                      <StatusTag
                        value={i.status as TenderInvitationStatus}
                        map={TENDER_INVITATION_STATUS_TAG}
                        label={
                          TENDER_INVITATION_STATUS_LABEL[i.status as TenderInvitationStatus] ??
                          i.status
                        }
                      />
                      {tender.status === "CLOSED" && i.status === "SUBMITTED" && (
                        <Button size="small" onClick={() => award.mutate({ tenderId: tender.id, contractorId: i.contractorId })}>
                          Award
                        </Button>
                      )}
                    </div>
                  ))}
                  {detail.invitations.length === 0 && (
                    <p className="cds--type-body-01" style={SUBTLE}>No contractors invited yet.</p>
                  )}
                </Stack>
              </div>

              <div>
                <p className="cds--type-label-01" style={{ ...SUBTLE, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                  Bids {detail.bidsSealed ? "(sealed until close)" : ""}
                </p>
                {detail.bids.length === 0 ? (
                  <p className="cds--type-body-01" style={{ ...SUBTLE, marginTop: "0.25rem" }}>No bids submitted yet.</p>
                ) : (
                  <Stack spacing={1} sx={{ marginTop: "0.25rem" }}>
                    {detail.bids.map((b) => {
                      const invRow = detail.invitations.find((i) => i.id === b.invitationId);
                      return (
                        <p key={b.id} className="cds--type-body-01" style={{ margin: 0 }}>
                          {invRow?.contractorName ?? "Contractor"} —{" "}
                          {b.sealed || b.amountPaise == null
                            ? "sealed"
                            : formatINR(b.amountPaise)}
                          {b.completionWeeks != null ? ` · ${b.completionWeeks} weeks` : ""}
                          {!b.sealed && b.notes ? ` · ${b.notes}` : ""}
                        </p>
                      );
                    })}
                  </Stack>
                )}
                {detail.bidsSealed && detail.bids.length > 0 && (
                  <p className="cds--type-label-01" style={{ ...SUBTLE, marginTop: "0.25rem" }}>
                    {detail.bids.length} bid(s) received — amounts stay sealed until you close the
                    tender.
                  </p>
                )}
              </div>
              {award.error && <Alert severity="error"><AlertTitle>Error</AlertTitle>{award.error.message}</Alert>}
            </Stack>
          )}
        
      </DialogContent>
    </Dialog>
      </CarbonScope>
    </>
  );
}
