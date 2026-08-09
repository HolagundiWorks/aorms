import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { can, JOINT_MEASUREMENT_STATUS_LABEL } from "@esti/contracts";
import { pushToast, RADIUS, Surface } from "@hcw/ui-kit";
import { useState } from "react";
import { DataState } from "../DataState.js";
import { trpc } from "../../lib/trpc.js";

/**
 * Firm triage — approve / reject submitted joint measurements (`cost:approve`).
 */
export function JointMeasurementQueue() {
  const meQ = trpc.auth.me.useQuery();
  const canApprove = can(meQ.data?.role, "cost:approve");
  const utils = trpc.useUtils();
  const pendingQ = trpc.jointMeasurement.listPending.useQuery(undefined, {
    enabled: canApprove,
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const detailQ = trpc.jointMeasurement.getForStaff.useQuery(
    { id: activeId! },
    { enabled: !!activeId },
  );

  const approve = trpc.jointMeasurement.approve.useMutation({
    meta: { errorTitle: "Couldn't approve" },
    onSuccess: (res) => {
      utils.jointMeasurement.listPending.invalidate();
      utils.jointMeasurement.listApproved.invalidate();
      setActiveId(null);
      setNote("");
      pushToast({
        kind: "success",
        title: `Approved — ${res.importedRows} line(s) added to measurement book`,
      });
    },
  });
  const reject = trpc.jointMeasurement.reject.useMutation({
    meta: { errorTitle: "Couldn't reject" },
    onSuccess: () => {
      utils.jointMeasurement.listPending.invalidate();
      setActiveId(null);
      setNote("");
      pushToast({ kind: "success", title: "Joint measurement rejected" });
    },
  });

  if (!canApprove) return null;

  const rows = pendingQ.data ?? [];

  return (
    <Stack spacing={1.5}>
      <Typography variant="h6" component="h3">
        Joint measurement — approval
      </Typography>
      <DataState
        loading={pendingQ.isLoading}
        isEmpty={rows.length === 0}
        columnCount={2}
        empty={{
          title: "No joint measurements awaiting approval",
          description: "Site supervisors submit abstracts from the site portal.",
        }}
      >
        <Stack spacing={1}>
          {rows.map((r) => (
            <Surface
              key={r.id}
              layer="soft"
              sx={{ p: 1.5, borderRadius: `${RADIUS}px`, cursor: "pointer" }}
              onClick={() => setActiveId(r.id)}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                  {r.subject}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {r.measuredOn ?? "—"}
                </Typography>
                <Typography variant="caption">
                  {JOINT_MEASUREMENT_STATUS_LABEL.SUBMITTED}
                </Typography>
              </Stack>
              {r.attentionToName ? (
                <Typography variant="caption" color="text.secondary">
                  Tagged: {r.attentionToName}
                </Typography>
              ) : null}
            </Surface>
          ))}
        </Stack>
      </DataState>

      <Dialog
        open={!!activeId}
        onClose={() => setActiveId(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Review joint measurement</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="subtitle1">{detailQ.data?.header.subject}</Typography>
            <Typography variant="body2" color="text.secondary">
              {detailQ.data?.header.details || "No details"}
            </Typography>
            <Stack spacing={0.5}>
              {(detailQ.data?.lines ?? []).map((l) => (
                <Typography key={l.id} variant="body2">
                  {l.code ? `${l.code} · ` : ""}
                  {l.description} — {l.quantity} {l.uom}
                </Typography>
              ))}
            </Stack>
            <TextField
              label="Review note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              helperText="Required to reject; optional on approve"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setActiveId(null)}>
            Close
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={!note.trim() || reject.isPending || !activeId}
            onClick={() =>
              activeId && reject.mutate({ id: activeId, reviewNote: note.trim() })
            }
          >
            Reject
          </Button>
          <Button
            variant="contained"
            disabled={approve.isPending || !activeId}
            onClick={() =>
              activeId &&
              approve.mutate({
                id: activeId,
                reviewNote: note.trim() || undefined,
              })
            }
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
