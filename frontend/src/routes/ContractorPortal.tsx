import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import ConstructionOutlined from "@mui/icons-material/ConstructionOutlined";
import DrawingOutlined from "@mui/icons-material/ArchitectureOutlined";
import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import HelpOutlineOutlined from "@mui/icons-material/HelpOutlineOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import SquareFootOutlined from "@mui/icons-material/SquareFootOutlined";
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
import {
  CONTRACTOR_PORTAL_SUBMISSION_KIND_LABEL,
  CONTRACTOR_PORTAL_SUBMISSION_STATUS_LABEL,
  TENDER_INVITATION_STATUS_LABEL,
  TENDER_INVITATION_STATUS_TAG,
  TENDER_STATUS_LABEL,
  TENDER_STATUS_TAG,
  formatINR,
  type ContractorPortalSubmissionKind,
  type TenderInvitationStatus,
  type TenderStatus,
} from "@esti/contracts";
import { pushToast, Surface, RADIUS, useScreenActions } from "@hcw/ui-kit";
import { useMemo, useState } from "react";
import { DataState } from "../components/DataState.js";
import { ExternalPortalShell } from "../components/portal/ExternalPortalShell.js";
import {
  FirmPortalDocumentsPanel,
  FirmPortalDrawingsPanel,
  FirmPortalProjectPanel,
} from "../components/portal/FirmPortalHubPanels.js";
import { StatusTag } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";

const PORTAL_DIALOG_SLOT = {
  paper: { className: "esti-portal-dialog", sx: { borderRadius: `${RADIUS}px` } },
} as const;

type RequestKind = ContractorPortalSubmissionKind;

const REQUEST_KINDS: RequestKind[] = [
  "TICKET",
  "RFI",
  "DRAWING_REQUEST",
  "MEETING_REQUEST",
  "SITE_VISIT_REQUEST",
  "JOINT_MEASUREMENT",
];

const NEEDS_DATE: RequestKind[] = [
  "MEETING_REQUEST",
  "SITE_VISIT_REQUEST",
  "JOINT_MEASUREMENT",
];

/**
 * Contractor portal — tender bids + site coordination ActionDock
 * (ticket · site visit · drawing · meeting · clarification · RA · joint measurement).
 */
export function ContractorPortal() {
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    meta: { errorTitle: "Couldn't sign out" },
    onSuccess: () => utils.auth.me.invalidate(),
  });
  const brandingQ = trpc.contractorPortal.branding.useQuery();
  const listQ = trpc.contractorPortal.myTenders.useQuery();
  /** Invitation open in bid dialog. */
  const [openId, setOpenId] = useState<string | null>(null);
  /** Invitation selected for Project / Drawings / Documents (survives dialog close). */
  const [focusId, setFocusId] = useState<string | null>(null);
  const [amountRupees, setAmountRupees] = useState("");
  const [weeks, setWeeks] = useState("");
  const [notes, setNotes] = useState("");

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestKind, setRequestKind] = useState<RequestKind>("TICKET");
  const [requestLockKind, setRequestLockKind] = useState(false);
  const [request, setRequest] = useState({ subject: "", body: "", preferredDate: "" });
  const [billsOpen, setBillsOpen] = useState(false);

  const detailQ = trpc.contractorPortal.getInvitation.useQuery(
    { invitationId: openId! },
    { enabled: !!openId },
  );
  const projectQ = trpc.contractorPortal.projectDetail.useQuery(
    { invitationId: focusId! },
    { enabled: !!focusId },
  );
  const billsQ = trpc.contractorPortal.myRunningBills.useQuery(
    { invitationId: focusId! },
    { enabled: !!focusId },
  );
  const submissionsQ = trpc.contractorPortal.mySubmissions.useQuery(
    { invitationId: focusId! },
    { enabled: !!focusId },
  );

  function selectInvitation(invitationId: string) {
    setOpenId(invitationId);
    setFocusId(invitationId);
    setAmountRupees("");
    setWeeks("");
    setNotes("");
  }

  function openRequest(kind: RequestKind, lock = true) {
    setRequestKind(kind);
    setRequestLockKind(lock);
    setRequest({
      subject: CONTRACTOR_PORTAL_SUBMISSION_KIND_LABEL[kind],
      body: "",
      preferredDate: "",
    });
    setRequestOpen(true);
  }

  const submitBid = trpc.contractorPortal.submitBid.useMutation({
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

  const submitRequest = trpc.contractorPortal.submitRequest.useMutation({
    meta: { errorTitle: "Couldn't submit the request" },
    onSuccess: () => {
      utils.contractorPortal.mySubmissions.invalidate();
      setRequestOpen(false);
      pushToast({
        kind: "success",
        title: `${CONTRACTOR_PORTAL_SUBMISSION_KIND_LABEL[requestKind]} submitted`,
      });
    },
  });

  const dockDialogOpen = requestOpen || billsOpen || !!openId;
  const dockActions = useMemo(() => {
    if (!focusId || dockDialogOpen) return [];
    return [
      {
        id: "c-ticket",
        zone: "center" as const,
        tone: "primary" as const,
        label: "Raise ticket",
        icon: <AssignmentOutlined />,
        onClick: () => openRequest("TICKET", false),
      },
      {
        id: "c-visit",
        zone: "center" as const,
        tone: "default" as const,
        label: "Site visit",
        icon: <ConstructionOutlined />,
        onClick: () => openRequest("SITE_VISIT_REQUEST"),
      },
      {
        id: "c-drawing",
        zone: "center" as const,
        tone: "default" as const,
        label: "Drawing",
        icon: <DrawingOutlined />,
        onClick: () => openRequest("DRAWING_REQUEST"),
      },
      {
        id: "c-meeting",
        zone: "center" as const,
        tone: "default" as const,
        label: "Meeting",
        icon: <EventAvailableOutlined />,
        onClick: () => openRequest("MEETING_REQUEST"),
      },
      {
        id: "c-bills",
        zone: "right" as const,
        tone: "primary" as const,
        label: "Running bills",
        icon: <ReceiptLongOutlined />,
        onClick: () => setBillsOpen(true),
      },
    ];
  }, [focusId, dockDialogOpen]);

  useScreenActions(dockActions, [dockActions]);

  const rows = listQ.data ?? [];
  const detail = detailQ.data;
  const pd = projectQ.data;
  const submissions = submissionsQ.data ?? [];
  const runningBills = (billsQ.data ?? []).map((b) => ({
    id: b.id,
    ref: b.ref,
    title: b.title,
    billType: b.billType,
    status: b.status,
    measurementDate: b.measurementDate,
    totalPaise: b.totalPaise,
    netPayablePaise: b.netPayablePaise,
  }));

  const portalPanels = {
    project: (
      <FirmPortalProjectPanel
        loading={!!focusId && projectQ.isLoading}
        project={pd?.project ?? null}
        phases={pd?.phases ?? []}
        pickProjectHint="Open a tender invitation from Updates to see the project summary and stages."
      />
    ),
    drawings: (
      <FirmPortalDrawingsPanel
        loading={!!focusId && projectQ.isLoading}
        drawings={(pd?.drawings ?? []).map((dr) => ({
          id: dr.id,
          ref: dr.ref,
          title: dr.title,
          status: dr.status,
        }))}
        transmittals={(pd?.transmittals ?? []).map((t) => ({
          id: t.id,
          ref: t.ref,
          purpose: t.purpose,
          channel: t.channel,
          dateIssued: t.dateIssued,
        }))}
      />
    ),
    documents: (
      <FirmPortalDocumentsPanel
        loading={!!focusId && billsQ.isLoading}
        invoices={[]}
        approvals={[]}
        runningBills={runningBills}
      />
    ),
  };

  return (
    <ExternalPortalShell
      companyName={brandingQ.data?.companyName}
      portalLabel={AORMS_PORTALS.contractor.label}
      onSignOut={() => logout.mutate()}
      signingOut={logout.isPending}
      panels={portalPanels}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" component="h1">
            Tender invitations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bid on tenders, then use the action dock for site visits, drawings, meetings,
            clarifications, running bills, and joint measurement.
          </Typography>
        </Box>

        {!focusId ? (
          <Alert severity="info">
            Select an invitation to activate the action dock and project tabs.
          </Alert>
        ) : null}

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
              <Surface
                key={r.invitationId}
                layer="soft"
                sx={{
                  borderRadius: `${RADIUS}px`,
                  p: 1.5,
                  cursor: "pointer",
                  outline:
                    focusId === r.invitationId ? `2px solid var(--esti-brand-accent, #FF4F18)` : "none",
                }}
                onClick={() => selectInvitation(r.invitationId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectInvitation(r.invitationId);
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
                      TENDER_INVITATION_STATUS_LABEL[r.invitationStatus as TenderInvitationStatus] ??
                      r.invitationStatus
                    }
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {r.projectRef} · {r.projectTitle}
                  {r.dueDate ? ` · Due ${r.dueDate}` : ""}
                </Typography>
              </Surface>
            ))}
          </Stack>
        </DataState>

        {focusId ? (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
                My requests
              </Typography>
              <Button
                size="small"
                startIcon={<HelpOutlineOutlined />}
                onClick={() => openRequest("RFI")}
              >
                Clarification
              </Button>
              <Button
                size="small"
                startIcon={<SquareFootOutlined />}
                onClick={() => openRequest("JOINT_MEASUREMENT")}
              >
                Joint measurement
              </Button>
            </Stack>
            <DataState
              loading={submissionsQ.isLoading}
              isEmpty={submissions.length === 0}
              columnCount={3}
              empty={{
                title: "No requests yet",
                description: "Use the action dock to raise tickets and site coordination requests.",
              }}
            >
              <Stack spacing={1}>
                {submissions.map((s) => (
                  <Surface key={s.id} layer="soft" sx={{ borderRadius: `${RADIUS}px`, p: 1.5 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                      <Typography variant="subtitle2" sx={{ flex: 1 }}>
                        {s.subject}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {CONTRACTOR_PORTAL_SUBMISSION_KIND_LABEL[
                          s.kind as RequestKind
                        ] ?? s.kind}
                      </Typography>
                      <Typography variant="caption">
                        {CONTRACTOR_PORTAL_SUBMISSION_STATUS_LABEL[
                          s.status as keyof typeof CONTRACTOR_PORTAL_SUBMISSION_STATUS_LABEL
                        ] ?? s.status}
                      </Typography>
                    </Stack>
                    {s.body ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {s.body}
                      </Typography>
                    ) : null}
                  </Surface>
                ))}
              </Stack>
            </DataState>
          </Stack>
        ) : null}
      </Stack>

      <Dialog
        open={!!openId}
        onClose={() => setOpenId(null)}
        fullWidth
        maxWidth="sm"
        slotProps={PORTAL_DIALOG_SLOT}
      >
        <DialogTitle>{detail?.tender.title ?? "Tender"}</DialogTitle>
        <DialogContent>
          {detailQ.isLoading || !detail ? (
            <Typography variant="body2">Loading…</Typography>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {detail.projectRef} · {detail.projectTitle}
              </Typography>
              {detail.tender.scope ? (
                <Typography variant="body2">{detail.tender.scope}</Typography>
              ) : null}
              {detail.tender.instructions ? (
                <Alert severity="info">{detail.tender.instructions}</Alert>
              ) : null}
              {detail.bid ? (
                <Alert severity="success">
                  Bid on file: {formatINR(detail.bid.amountPaise)}
                  {detail.bid.completionWeeks != null
                    ? ` · ${detail.bid.completionWeeks} weeks`
                    : ""}
                </Alert>
              ) : null}
              {detail.canBid ? (
                <>
                  <TextField
                    label="Lump-sum amount (₹)"
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Completion weeks"
                    value={weeks}
                    onChange={(e) => setWeeks(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    fullWidth
                    multiline
                    minRows={2}
                  />
                </>
              ) : (
                <Alert severity="warning">Bidding is closed for this invitation.</Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setOpenId(null)}>
            Close
          </Button>
          {detail?.canBid && detail.invitationStatus !== "SUBMITTED" ? (
            <Button
              color="inherit"
              disabled={decline.isPending}
              onClick={() => openId && decline.mutate({ invitationId: openId })}
            >
              Decline
            </Button>
          ) : null}
          {detail?.canBid ? (
            <Button
              variant="contained"
              disabled={submitBid.isPending || !amountRupees.trim()}
              onClick={() => {
                if (!openId) return;
                const rupees = Number(amountRupees.replace(/,/g, ""));
                if (!Number.isFinite(rupees) || rupees <= 0) {
                  pushToast({ kind: "error", title: "Enter a valid amount" });
                  return;
                }
                submitBid.mutate({
                  invitationId: openId,
                  amountPaise: Math.round(rupees * 100),
                  completionWeeks: weeks.trim() ? Number(weeks) : undefined,
                  notes: notes.trim() || undefined,
                });
              }}
            >
              {detail.bid ? "Update bid" : "Submit bid"}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        fullWidth
        maxWidth="sm"
        slotProps={PORTAL_DIALOG_SLOT}
      >
        <DialogTitle>
          {CONTRACTOR_PORTAL_SUBMISSION_KIND_LABEL[requestKind] ?? "Request"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {!requestLockKind ? (
              <TextField
                select
                label="Request type"
                value={requestKind}
                onChange={(e) => setRequestKind(e.target.value as RequestKind)}
                fullWidth
              >
                {REQUEST_KINDS.map((k) => (
                  <MenuItem key={k} value={k}>
                    {CONTRACTOR_PORTAL_SUBMISSION_KIND_LABEL[k]}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            <TextField
              label="Subject"
              value={request.subject}
              onChange={(e) => setRequest((r) => ({ ...r, subject: e.target.value }))}
              fullWidth
              required
            />
            {NEEDS_DATE.includes(requestKind) ? (
              <TextField
                label="Preferred date"
                type="date"
                value={request.preferredDate}
                onChange={(e) => setRequest((r) => ({ ...r, preferredDate: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            ) : null}
            <TextField
              label="Details"
              value={request.body}
              onChange={(e) => setRequest((r) => ({ ...r, body: e.target.value }))}
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setRequestOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!focusId || !request.subject.trim() || submitRequest.isPending}
            onClick={() => {
              if (!focusId) return;
              submitRequest.mutate({
                invitationId: focusId,
                kind: requestKind,
                subject: request.subject.trim(),
                body: request.body.trim() || undefined,
                preferredDate: request.preferredDate || undefined,
              });
            }}
          >
            {submitRequest.isPending ? "Submitting…" : "Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={billsOpen}
        onClose={() => setBillsOpen(false)}
        fullWidth
        maxWidth="sm"
        slotProps={PORTAL_DIALOG_SLOT}
      >
        <DialogTitle>Running bills</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Certified RA bills for this project. Request a joint measurement when quantities need
              a site check.
            </Typography>
            <DataState
              loading={billsQ.isLoading}
              isEmpty={runningBills.length === 0}
              columnCount={2}
              empty={{
                title: "No certified bills yet",
                description: "When the architect certifies an RA bill, it appears here.",
              }}
            >
              <Stack spacing={1}>
                {runningBills.map((b) => (
                  <Surface key={b.id} layer="soft" sx={{ borderRadius: `${RADIUS}px`, p: 1.5 }}>
                    <Typography variant="subtitle2">
                      {b.ref}
                      {b.title ? ` — ${b.title}` : ""}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {b.status}
                      {b.netPayablePaise != null ? ` · ${formatINR(b.netPayablePaise)}` : ""}
                      {b.measurementDate ? ` · ${b.measurementDate}` : ""}
                    </Typography>
                  </Surface>
                ))}
              </Stack>
            </DataState>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<SquareFootOutlined />}
            onClick={() => {
              setBillsOpen(false);
              openRequest("JOINT_MEASUREMENT");
            }}
          >
            Request joint measurement
          </Button>
          <Button variant="contained" onClick={() => setBillsOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </ExternalPortalShell>
  );
}
