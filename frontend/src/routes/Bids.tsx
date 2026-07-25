import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  BID_SOURCE_LABEL,
  BID_STATUS_LABEL,
  BID_STATUS_TAG,
  BID_TERMINAL_STATUSES,
  BidSource,
  BidStatus,
  canTransitionBidStatus,
  formatINRShort,
  type BidStatus as BidStatusT,
} from "@esti/contracts";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import { pushToast, useScreenActions } from "@hcw/ui-kit";
import { DataState } from "../components/DataState.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { StatusTag } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";

const SOURCE_OPTIONS = BidSource.options;
const STATUS_OPTIONS = BidStatus.options;

/**
 * Bid desk — RFPs / tenders the practice is pursuing (firm-as-bidder).
 * Does not restore contractor tendering (issue / sealed bids / award).
 */
export function Bids() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const listQ = trpc.bids.list.useQuery({});
  const inv = () => utils.bids.list.invalidate();

  const [open, setOpen] = useState(false);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [conflictOk, setConflictOk] = useState(false);
  const [conflictNotes, setConflictNotes] = useState("");

  useScreenActions(
    open || openLeadId
      ? []
      : [
          {
            id: "new-bid",
            zone: "center",
            tone: "primary",
            label: "New bid",
            icon: <AddIcon />,
            onClick: () => setOpen(true),
          },
        ],
    [open, openLeadId],
  );

  const blank = {
    title: "",
    issuerName: "",
    referenceNo: "",
    source: "TENDER_PORTAL" as const,
    portalUrl: "",
    submissionDueAt: "",
    emdRupees: "",
    estimatedFeeRupees: "",
    siteLocation: "",
    city: "",
    notes: "",
  };
  const [form, setForm] = useState(blank);

  const create = trpc.bids.create.useMutation({
    meta: { errorTitle: "Couldn't capture the bid" },
    onSuccess: () => {
      inv();
      setOpen(false);
      setForm(blank);
      pushToast({ kind: "success", title: "Bid captured" });
    },
  });

  const setStatus = trpc.bids.setStatus.useMutation({
    meta: { errorTitle: "Couldn't update bid status" },
    onMutate: async ({ id, status }) => {
      await utils.bids.list.cancel();
      const prev = utils.bids.list.getData({});
      utils.bids.list.setData({}, (old) =>
        old?.map((b) => (b.id === id ? { ...b, status } : b)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.bids.list.setData({}, ctx.prev);
    },
    onSuccess: (_d, v) =>
      pushToast({ kind: "success", title: `Bid marked ${BID_STATUS_LABEL[v.status]}` }),
    onSettled: inv,
  });

  const openAsLead = trpc.bids.openAsLead.useMutation({
    meta: { errorTitle: "Couldn't open a lead from this bid" },
    onSuccess: () => {
      inv();
      utils.leads.list.invalidate();
      setOpenLeadId(null);
      setConflictOk(false);
      setConflictNotes("");
      pushToast({ kind: "success", title: "Lead opened from bid" });
    },
  });

  const rows = listQ.data ?? [];

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 0.7, minWidth: 100 },
    {
      field: "title",
      headerName: "Opportunity",
      flex: 1.6,
      minWidth: 200,
      sortable: false,
      renderCell: (p) => (
        <Box sx={{ py: 0.5 }}>
          <div>{p.row.title}</div>
          <span className="esti-label--secondary">
            {[p.row.issuerName, p.row.referenceNo].filter(Boolean).join(" · ") || "—"}
          </span>
        </Box>
      ),
    },
    {
      field: "source",
      headerName: "Source",
      flex: 0.9,
      minWidth: 120,
      valueGetter: (_v, row) =>
        BID_SOURCE_LABEL[row.source as keyof typeof BID_SOURCE_LABEL] ?? row.source,
    },
    {
      field: "submissionDueAt",
      headerName: "Due",
      flex: 0.8,
      minWidth: 110,
      valueGetter: (_v, row) =>
        row.submissionDueAt
          ? new Date(row.submissionDueAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "—",
    },
    {
      field: "emdPaise",
      headerName: "EMD",
      flex: 0.7,
      minWidth: 90,
      valueGetter: (_v, row) =>
        row.emdPaise != null ? formatINRShort(row.emdPaise) : "—",
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1.1,
      minWidth: 150,
      sortable: false,
      renderCell: (p) => {
        const b = p.row;
        if (BID_TERMINAL_STATUSES.has(b.status as BidStatusT)) {
          return (
            <StatusTag
              value={b.status as BidStatusT}
              map={BID_STATUS_TAG}
              label={BID_STATUS_LABEL[b.status as BidStatusT] ?? b.status}
            />
          );
        }
        return (
          <TextField
            id={`bid-st-${b.id}`}
            select
            size="small"
            hiddenLabel
            value={b.status}
            onChange={(e) =>
              setStatus.mutate({ id: b.id, status: e.target.value as BidStatusT })
            }
            sx={{ minWidth: 140 }}
          >
            {STATUS_OPTIONS.filter(
              (s) => s === b.status || canTransitionBidStatus(b.status, s),
            ).map((s) => (
              <MenuItem key={s} value={s}>
                {BID_STATUS_LABEL[s]}
              </MenuItem>
            ))}
          </TextField>
        );
      },
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 120,
      renderCell: (p) => {
        const b = p.row;
        const actions = [];
        if (b.leadId) {
          actions.push({
            label: "Open lead",
            onClick: () => navigate("/leads"),
          });
        } else if (!BID_TERMINAL_STATUSES.has(b.status as BidStatusT) || b.status === "WON") {
          actions.push({
            label: "Open as lead",
            onClick: () => {
              setOpenLeadId(b.id);
              setConflictOk(false);
              setConflictNotes("");
            },
          });
        }
        if (b.portalUrl) {
          actions.push({
            label: "Portal",
            onClick: () => window.open(b.portalUrl!, "_blank", "noopener,noreferrer"),
          });
        }
        if (actions.length === 0) return null;
        return <RowActionsMenu actions={actions} />;
      },
    },
  ];

  return (
    <>
      <RailLayout
        title="Bids"
        description="RFP and tender opportunities the practice is pursuing — not contractor tendering."
      >
        <PageBreadcrumb items={[{ label: "Office" }, { label: "Bids" }]} />
        <DataState
          loading={listQ.isLoading}
          isEmpty={rows.length === 0}
          columnCount={7}
          empty={{
            title: "No bids yet",
            description:
              "Capture a government or private RFP the firm will respond to. Contractor sealed bids stay out of scope.",
            action: (
              <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
                Capture bid
              </Button>
            ),
          }}
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
      </RailLayout>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="bids-create-title"
      >
        <DialogTitle id="bids-create-title">New bid opportunity</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Firm-as-bidder register — GeM, state portals, private RFPs, EOIs.
            </Typography>
            <TextField
              id="bid-title"
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <TextField
              id="bid-issuer"
              label="Issuer / authority"
              value={form.issuerName}
              onChange={(e) => setForm({ ...form, issuerName: e.target.value })}
            />
            <TextField
              id="bid-refno"
              label="Tender / RFP number (optional)"
              value={form.referenceNo}
              onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
            />
            <TextField
              id="bid-src"
              select
              label="Source"
              value={form.source}
              onChange={(e) =>
                setForm({ ...form, source: e.target.value as typeof form.source })
              }
            >
              {SOURCE_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                  {BID_SOURCE_LABEL[s]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="bid-due"
              type="date"
              label="Submission due"
              slotProps={{ inputLabel: { shrink: true } }}
              value={form.submissionDueAt}
              onChange={(e) => setForm({ ...form, submissionDueAt: e.target.value })}
            />
            <TextField
              id="bid-emd"
              label="EMD (₹, optional)"
              value={form.emdRupees}
              onChange={(e) => setForm({ ...form, emdRupees: e.target.value })}
            />
            <TextField
              id="bid-fee"
              label="Estimated fee (₹, optional)"
              value={form.estimatedFeeRupees}
              onChange={(e) => setForm({ ...form, estimatedFeeRupees: e.target.value })}
            />
            <TextField
              id="bid-url"
              label="Portal URL (optional)"
              value={form.portalUrl}
              onChange={(e) => setForm({ ...form, portalUrl: e.target.value })}
            />
            <TextField
              id="bid-city"
              label="City (optional)"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <TextField
              id="bid-loc"
              label="Site location (optional)"
              value={form.siteLocation}
              onChange={(e) => setForm({ ...form, siteLocation: e.target.value })}
            />
            <TextField
              id="bid-notes"
              label="Notes (optional)"
              multiline
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            {create.error && <Alert severity="error">{create.error.message}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!form.title || !form.issuerName || create.isPending}
            onClick={() => {
              const emd = form.emdRupees.trim()
                ? Math.round(Number(form.emdRupees) * 100)
                : null;
              const fee = form.estimatedFeeRupees.trim()
                ? Math.round(Number(form.estimatedFeeRupees) * 100)
                : null;
              if (
                (form.emdRupees && Number.isNaN(emd!)) ||
                (form.estimatedFeeRupees && Number.isNaN(fee!))
              ) {
                pushToast({ kind: "error", title: "EMD and fee must be numbers" });
                return;
              }
              create.mutate({
                title: form.title,
                issuerName: form.issuerName,
                referenceNo: form.referenceNo || undefined,
                source: form.source,
                portalUrl: form.portalUrl || undefined,
                submissionDueAt: form.submissionDueAt || undefined,
                emdPaise: emd,
                estimatedFeePaise: fee,
                siteLocation: form.siteLocation || undefined,
                city: form.city || undefined,
                notes: form.notes || undefined,
              });
            }}
          >
            {create.isPending ? "Saving…" : "Capture bid"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!openLeadId}
        onClose={() => setOpenLeadId(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="bids-open-lead-title"
      >
        <DialogTitle id="bids-open-lead-title">Open as lead</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Continues into the Studio acquisition path (Leads → Proposals → Project). Confirm
              the COA conflict check first.
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={conflictOk}
                  onChange={(e) => setConflictOk(e.target.checked)}
                />
              }
              label="No other architect is engaged on this commission without written release"
            />
            <TextField
              id="bid-conflict-notes"
              label="Conflict notes (optional)"
              multiline
              rows={2}
              value={conflictNotes}
              onChange={(e) => setConflictNotes(e.target.value)}
            />
            {openAsLead.error && <Alert severity="error">{openAsLead.error.message}</Alert>}
            <Button component={Link} to="/leads" size="small" variant="text">
              Go to Leads
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" color="inherit" onClick={() => setOpenLeadId(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!conflictOk || openAsLead.isPending || !openLeadId}
            onClick={() =>
              openLeadId &&
              openAsLead.mutate({
                id: openLeadId,
                conflictCheckDone: conflictOk,
                conflictCheckNotes: conflictNotes || undefined,
              })
            }
          >
            {openAsLead.isPending ? "Opening…" : "Open lead"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
