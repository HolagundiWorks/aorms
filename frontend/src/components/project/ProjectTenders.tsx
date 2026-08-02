import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
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
import AddIcon from "@mui/icons-material/Add";
import { pushToast, useScreenActions } from "@hcw/ui-kit";
import { useState } from "react";
import { DataState } from "../DataState.js";
import { StatusTag } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";

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
            icon: <AddIcon />,
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
      <Stack spacing={1.5}>
        <Typography variant="body2" color="text.secondary">
          Issue a tender to invited contractors. They bid in the contractor portal; amounts stay
          sealed until you close the tender.
        </Typography>
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
            onRowClick={(p) => setDetailId(p.row.id)}
            sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
          />
        </DataState>
      </Stack>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New tender</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <TextField
              label="Category (optional)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Civil · Structural · MEP…"
            />
            <TextField
              type="date"
              label="Due date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
            <TextField
              label="Scope"
              multiline
              rows={3}
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
            />
            <TextField
              label="Instructions to bidders"
              multiline
              rows={2}
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            />
            {create.error && <Alert severity="error">{create.error.message}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!form.title || create.isPending}
            onClick={() =>
              create.mutate({
                projectId,
                title: form.title,
                category: form.category || undefined,
                dueDate: form.dueDate || undefined,
                scope: form.scope || undefined,
                instructions: form.instructions || undefined,
              })
            }
          >
            {create.isPending ? "Saving…" : "Create draft"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!detailId}
        onClose={() => setDetailId(null)}
        fullWidth
        maxWidth="md"
        aria-labelledby="tender-detail-title"
      >
        <DialogTitle id="tender-detail-title">
          {tender?.title ?? "Tender"}
        </DialogTitle>
        <DialogContent>
          {detailQ.isLoading || !tender ? (
            <Typography variant="body2">Loading…</Typography>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <StatusTag
                  value={tender.status as TenderStatus}
                  map={TENDER_STATUS_TAG}
                  label={TENDER_STATUS_LABEL[tender.status as TenderStatus]}
                />
                <Typography variant="body2" color="text.secondary">
                  Due {tender.dueDate ?? "—"}
                  {tender.category ? ` · ${tender.category}` : ""}
                </Typography>
              </Stack>
              {tender.scope && (
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {tender.scope}
                </Typography>
              )}

              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {(["OPEN", "CLOSED", "CANCELLED"] as TenderStatus[]).map((s) =>
                  canTransitionTenderStatus(tender.status, s) && s !== tender.status ? (
                    <Button
                      key={s}
                      size="small"
                      variant={s === "OPEN" ? "contained" : "outlined"}
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: tender.id, status: s })}
                    >
                      Mark {TENDER_STATUS_LABEL[s]}
                    </Button>
                  ) : null,
                )}
              </Stack>
              {tender.status === "CLOSED" && (
                <Typography variant="caption" color="text.secondary">
                  Award a contractor with a submitted bid below — do not mark awarded without a
                  winner.
                </Typography>
              )}
              {setStatus.error && <Alert severity="error">{setStatus.error.message}</Alert>}

              <Box>
                <Typography variant="overline" color="text.secondary">
                  Invitations
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1 }}>
                  <TextField
                    select
                    size="small"
                    label="Contractor"
                    value={inviteId}
                    onChange={(e) => setInviteId(e.target.value)}
                    sx={{ minWidth: 220 }}
                    disabled={tender.status === "AWARDED" || tender.status === "CANCELLED"}
                  >
                    {(contractorsQ.data ?? []).map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!inviteId || invite.isPending}
                    onClick={() =>
                      invite.mutate({ tenderId: tender.id, contractorId: inviteId })
                    }
                  >
                    Invite
                  </Button>
                </Stack>
                {invite.error && <Alert severity="error">{invite.error.message}</Alert>}
                <Stack spacing={0.75}>
                  {detail.invitations.map((i) => (
                    <Stack
                      key={i.id}
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center", py: 0.5, borderBottom: 1, borderColor: "divider" }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">{i.contractorName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {i.contractorCategory ?? "—"}
                        </Typography>
                      </Box>
                      <StatusTag
                        value={i.status as TenderInvitationStatus}
                        map={TENDER_INVITATION_STATUS_TAG}
                        label={
                          TENDER_INVITATION_STATUS_LABEL[i.status as TenderInvitationStatus] ??
                          i.status
                        }
                      />
                      {tender.status === "CLOSED" && i.status === "SUBMITTED" && (
                        <Button
                          size="small"
                          onClick={() =>
                            award.mutate({
                              tenderId: tender.id,
                              contractorId: i.contractorId,
                            })
                          }
                        >
                          Award
                        </Button>
                      )}
                    </Stack>
                  ))}
                  {detail.invitations.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No contractors invited yet.
                    </Typography>
                  )}
                </Stack>
              </Box>

              <Box>
                <Typography variant="overline" color="text.secondary">
                  Bids {detail.bidsSealed ? "(sealed until close)" : ""}
                </Typography>
                {detail.bids.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    No bids submitted yet.
                  </Typography>
                ) : (
                  <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                    {detail.bids.map((b) => {
                      const invRow = detail.invitations.find((i) => i.id === b.invitationId);
                      return (
                        <Typography key={b.id} variant="body2">
                          {invRow?.contractorName ?? "Contractor"} —{" "}
                          {b.sealed || b.amountPaise == null
                            ? "sealed"
                            : formatINR(b.amountPaise)}
                          {b.completionWeeks != null ? ` · ${b.completionWeeks} weeks` : ""}
                          {!b.sealed && b.notes ? ` · ${b.notes}` : ""}
                        </Typography>
                      );
                    })}
                  </Stack>
                )}
                {detail.bidsSealed && detail.bids.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                    {detail.bids.length} bid(s) received — amounts stay sealed until you close the
                    tender.
                  </Typography>
                )}
              </Box>
              {award.error && <Alert severity="error">{award.error.message}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setDetailId(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
