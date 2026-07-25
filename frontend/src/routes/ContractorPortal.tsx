import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  TENDER_INVITATION_STATUS_LABEL,
  TENDER_INVITATION_STATUS_TAG,
  TENDER_STATUS_LABEL,
  TENDER_STATUS_TAG,
  formatINR,
  type TenderInvitationStatus,
  type TenderStatus,
} from "@esti/contracts";
import { pushToast } from "@hcw/ui-kit";
import { useState } from "react";
import { DataState } from "../components/DataState.js";
import { ExternalPortalShell } from "../components/portal/ExternalPortalShell.js";
import { StatusTag } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";

/**
 * Contractor portal — invited tenders and lump-sum bidding.
 */
export function ContractorPortal() {
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    meta: { errorTitle: "Couldn't sign out" },
    onSuccess: () => utils.auth.me.invalidate(),
  });
  const listQ = trpc.contractorPortal.myTenders.useQuery();
  const [openId, setOpenId] = useState<string | null>(null);
  const [amountRupees, setAmountRupees] = useState("");
  const [weeks, setWeeks] = useState("");
  const [notes, setNotes] = useState("");

  const detailQ = trpc.contractorPortal.getInvitation.useQuery(
    { invitationId: openId! },
    { enabled: !!openId },
  );

  const submit = trpc.contractorPortal.submitBid.useMutation({
    meta: { errorTitle: "Couldn't submit the bid" },
    onSuccess: () => {
      utils.contractorPortal.myTenders.invalidate();
      if (openId) utils.contractorPortal.getInvitation.invalidate({ invitationId: openId });
      pushToast({ kind: "success", title: "Bid submitted" });
    },
  });

  const decline = trpc.contractorPortal.decline.useMutation({
    meta: { errorTitle: "Couldn't decline the invitation" },
    onSuccess: () => {
      utils.contractorPortal.myTenders.invalidate();
      setOpenId(null);
      pushToast({ kind: "success", title: "Invitation declined" });
    },
  });

  const rows = listQ.data ?? [];
  const detail = detailQ.data;

  return (
    <ExternalPortalShell
      portalLabel={AORMS_PORTALS.contractor.label}
      onSignOut={() => logout.mutate()}
      signingOut={logout.isPending}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" component="h1">
            Tender invitations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bid on tenders issued by the architect&apos;s office. Your bid stays sealed until they
            close the tender.
          </Typography>
        </Box>

        <DataState
          loading={listQ.isLoading}
          isEmpty={rows.length === 0}
          columnCount={3}
          empty={{
            title: "No invitations yet",
            description: "When the firm invites you to a tender, it appears here.",
          }}
        >
          <Stack spacing={1}>
            {rows.map((r) => (
              <Box
                key={r.invitationId}
                sx={{
                  py: 1.25,
                  borderBottom: 1,
                  borderColor: "divider",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setOpenId(r.invitationId);
                  setAmountRupees("");
                  setWeeks("");
                  setNotes("");
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpenId(r.invitationId);
                  }
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                  <Typography variant="subtitle2" sx={{ flex: 1 }}>
                    {r.title}
                  </Typography>
                  <StatusTag
                    value={r.status as TenderStatus}
                    map={TENDER_STATUS_TAG}
                    label={TENDER_STATUS_LABEL[r.status as TenderStatus] ?? r.status}
                  />
                  <StatusTag
                    value={r.invitationStatus as TenderInvitationStatus}
                    map={TENDER_INVITATION_STATUS_TAG}
                    label={
                      TENDER_INVITATION_STATUS_LABEL[
                        r.invitationStatus as TenderInvitationStatus
                      ] ?? r.invitationStatus
                    }
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {r.projectRef} — {r.projectTitle}
                  {r.dueDate ? ` · due ${r.dueDate}` : ""}
                </Typography>
              </Box>
            ))}
          </Stack>
        </DataState>
      </Stack>

      <Dialog open={!!openId} onClose={() => setOpenId(null)} fullWidth maxWidth="sm">
        <DialogTitle>{detail?.tender.title ?? "Tender"}</DialogTitle>
        <DialogContent>
          {detailQ.isLoading || !detail ? (
            <Typography variant="body2">Loading…</Typography>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {detail.projectRef} — {detail.projectTitle}
                {detail.tender.dueDate ? ` · due ${detail.tender.dueDate}` : ""}
              </Typography>
              {detail.tender.scope && (
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {detail.tender.scope}
                </Typography>
              )}
              {detail.tender.instructions && (
                <Alert severity="info">{detail.tender.instructions}</Alert>
              )}

              {detail.bid && (
                <Alert severity="success">
                  Your bid: {formatINR(detail.bid.amountPaise)}
                  {detail.bid.completionWeeks != null
                    ? ` · ${detail.bid.completionWeeks} weeks`
                    : ""}
                </Alert>
              )}

              {detail.canBid ? (
                <Stack spacing={1.5}>
                  <TextField
                    label="Bid amount (₹)"
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                  />
                  <TextField
                    label="Completion weeks (optional)"
                    value={weeks}
                    onChange={(e) => setWeeks(e.target.value)}
                  />
                  <TextField
                    label="Notes (optional)"
                    multiline
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  {submit.error && <Alert severity="error">{submit.error.message}</Alert>}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Bidding is closed for this invitation.
                </Typography>
              )}
              {decline.error && <Alert severity="error">{decline.error.message}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpenId(null)}>
            Close
          </Button>
          {detail?.canBid && detail.invitationStatus !== "SUBMITTED" && (
            <Button
              variant="outlined"
              color="inherit"
              disabled={decline.isPending}
              onClick={() => openId && decline.mutate({ invitationId: openId })}
            >
              Decline
            </Button>
          )}
          {detail?.canBid && (
            <Button
              variant="contained"
              disabled={submit.isPending || !amountRupees.trim()}
              onClick={() => {
                const paise = Math.round(Number(amountRupees) * 100);
                if (!Number.isFinite(paise) || paise <= 0) {
                  pushToast({ kind: "error", title: "Enter a valid bid amount" });
                  return;
                }
                const w = weeks.trim() ? Number(weeks) : undefined;
                if (weeks.trim() && (!Number.isFinite(w) || (w ?? 0) <= 0)) {
                  pushToast({ kind: "error", title: "Weeks must be a positive number" });
                  return;
                }
                openId &&
                  submit.mutate({
                    invitationId: openId,
                    amountPaise: paise,
                    completionWeeks: w,
                    notes: notes || undefined,
                  });
              }}
            >
              {submit.isPending ? "Submitting…" : detail.bid ? "Update bid" : "Submit bid"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </ExternalPortalShell>
  );
}
