import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  PMC_RA_BILL_STATUS_LABEL,
  PmcRaBillStatus,
  can,
  formatINR,
  pmcRaLineAmountPaise,
  pmcRaNetPayablePaise,
} from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../../lib/auth.js";
import { trpc } from "../../lib/trpc.js";
import { StatusDot } from "../StatusTag.js";

const STATUS_TAG: Record<string, "gray" | "green" | "red" | "blue" | "teal"> = {
  DRAFT: "gray",
  SITE_CHECKED: "blue",
  CERTIFIED: "teal",
  SENT_TO_CLIENT: "green",
  CLOSED: "green",
};

const shrink = { slotProps: { inputLabel: { shrink: true } } } as const;

type LineForm = {
  description: string;
  unit: string;
  previousQty: string;
  thisQty: string;
  rateInr: string;
};

const emptyLine = (): LineForm => ({
  description: "",
  unit: "",
  previousQty: "0",
  thisQty: "",
  rateInr: "",
});

/** AProc Wave 3 — RA bill certification (owner-side). */
export function ProjectRaCertification({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const listQ = trpc.pmcRaBills.listByProject.useQuery({ projectId });
  const packagesQ = trpc.pmcPackages.listByProject.useQuery({ projectId });
  const invalidate = () => {
    void utils.pmcRaBills.listByProject.invalidate({ projectId });
    void utils.pmcRaBills.portfolioOpen.invalidate();
  };

  const create = trpc.pmcRaBills.create.useMutation({
    meta: { errorTitle: "Couldn't create the RA bill" },
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      resetForm();
    },
  });
  const transition = trpc.pmcRaBills.transition.useMutation({
    meta: { errorTitle: "Couldn't update bill status" },
    onSuccess: invalidate,
  });
  const certify = trpc.pmcRaBills.certify.useMutation({
    meta: { errorTitle: "Couldn't certify the bill" },
    onSuccess: invalidate,
  });
  const pdf = trpc.pmcRaBills.generatePdf.useMutation({
    meta: { errorTitle: "Couldn't queue the PDF" },
    onSuccess: invalidate,
  });
  const remove = trpc.pmcRaBills.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the bill" },
    onSuccess: invalidate,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    billNo: "",
    periodStart: "",
    periodEnd: "",
    packageId: "",
    narrative: "",
    advanceInr: "0",
    retentionInr: "0",
    otherInr: "0",
    otherNote: "",
    gstNote: "",
    tdsNote: "",
    lines: [emptyLine()] as LineForm[],
  });
  const resetForm = () =>
    setForm({
      billNo: "",
      periodStart: "",
      periodEnd: "",
      packageId: "",
      narrative: "",
      advanceInr: "0",
      retentionInr: "0",
      otherInr: "0",
      otherNote: "",
      gstNote: "",
      tdsNote: "",
      lines: [emptyLine()],
    });

  const canWrite = can(user?.role, "write");
  const canCertify = can(user?.role, "cost:approve");
  const rows = listQ.data ?? [];
  const packages = packagesQ.data ?? [];

  const toPaise = (inr: string) => {
    const n = Number(String(inr).replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n * 100);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="h6" component="h4">
          RA certification
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Certify contractor interim bills for the client · IS 1200 practice
        </Typography>
        {canWrite && (
          <Button size="small" variant="contained" onClick={() => setCreateOpen(true)}>
            New RA bill
          </Button>
        )}
      </Stack>

      {listQ.isLoading && (
        <Stack spacing={0.5}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={48} />
          ))}
        </Stack>
      )}
      {rows.length === 0 && !listQ.isLoading && (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2">
            No RA bills yet. Draft measured quantities, site-check, then certify (L2+) before sending
            to the client.
          </Typography>
        </Box>
      )}

      <Stack spacing={1}>
        {rows.map((b) => (
          <Box key={b.id} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {b.billNo} · {b.ref}
                </Typography>
                <StatusDot
                  color={STATUS_TAG[b.status] ?? "gray"}
                  label={PMC_RA_BILL_STATUS_LABEL[b.status as PmcRaBillStatus] ?? b.status}
                />
                <Typography variant="caption" color="text.secondary">
                  {b.periodStart} → {b.periodEnd}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Gross {formatINR(b.grossPaise)} · Net {formatINR(b.netPaise)}
                </Typography>
              </Stack>
              {canWrite && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  {b.status === "DRAFT" && (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={transition.isPending}
                      onClick={() =>
                        transition.mutate({ id: b.id, projectId, to: "SITE_CHECKED" })
                      }
                    >
                      Site checked
                    </Button>
                  )}
                  {b.status === "SITE_CHECKED" && (
                    <>
                      <Button
                        size="small"
                        variant="text"
                        disabled={transition.isPending}
                        onClick={() => transition.mutate({ id: b.id, projectId, to: "DRAFT" })}
                      >
                        Back to draft
                      </Button>
                      {canCertify && (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={certify.isPending}
                          onClick={() => certify.mutate({ id: b.id, projectId })}
                        >
                          Certify
                        </Button>
                      )}
                    </>
                  )}
                  {b.status === "CERTIFIED" && (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={transition.isPending}
                      onClick={() =>
                        transition.mutate({ id: b.id, projectId, to: "SENT_TO_CLIENT" })
                      }
                    >
                      Send to client
                    </Button>
                  )}
                  {b.status === "SENT_TO_CLIENT" && (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={transition.isPending}
                      onClick={() => transition.mutate({ id: b.id, projectId, to: "CLOSED" })}
                    >
                      Close
                    </Button>
                  )}
                  {b.status !== "DRAFT" && (
                    <Button
                      size="small"
                      variant="text"
                      disabled={pdf.isPending}
                      onClick={() => pdf.mutate({ id: b.id, projectId })}
                    >
                      PDF
                    </Button>
                  )}
                  {b.status === "DRAFT" && (
                    <Button
                      size="small"
                      variant="text"
                      color="error"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (window.confirm(`Delete draft ${b.ref}?`)) {
                          remove.mutate({ id: b.id, projectId });
                        }
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog
        aria-labelledby="pmc-ra-create-title"
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetForm();
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle id="pmc-ra-create-title">New RA bill draft</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Bill no."
                value={form.billNo}
                onChange={(e) => setForm((f) => ({ ...f, billNo: e.target.value }))}
                fullWidth
                required
                placeholder="RA-03"
              />
              <TextField
                select
                label="Package (optional)"
                value={form.packageId}
                onChange={(e) => setForm((f) => ({ ...f, packageId: e.target.value }))}
                fullWidth
              >
                <MenuItem value="">—</MenuItem>
                {packages.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.ref} · {p.title}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Period start"
                type="date"
                value={form.periodStart}
                onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                fullWidth
                required
                {...shrink}
              />
              <TextField
                label="Period end"
                type="date"
                value={form.periodEnd}
                onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                fullWidth
                required
                {...shrink}
              />
            </Stack>
            {form.lines.map((line, idx) => (
              <Stack key={idx} direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  label="Description"
                  value={line.description}
                  onChange={(e) =>
                    setForm((f) => {
                      const lines = [...f.lines];
                      lines[idx] = { ...lines[idx]!, description: e.target.value };
                      return { ...f, lines };
                    })
                  }
                  fullWidth
                />
                <TextField
                  label="Unit"
                  value={line.unit}
                  onChange={(e) =>
                    setForm((f) => {
                      const lines = [...f.lines];
                      lines[idx] = { ...lines[idx]!, unit: e.target.value };
                      return { ...f, lines };
                    })
                  }
                  sx={{ width: { sm: 88 } }}
                />
                <TextField
                  label="This qty"
                  value={line.thisQty}
                  onChange={(e) =>
                    setForm((f) => {
                      const lines = [...f.lines];
                      lines[idx] = { ...lines[idx]!, thisQty: e.target.value };
                      return { ...f, lines };
                    })
                  }
                  sx={{ width: { sm: 100 } }}
                />
                <TextField
                  label="Rate ₹"
                  value={line.rateInr}
                  onChange={(e) =>
                    setForm((f) => {
                      const lines = [...f.lines];
                      lines[idx] = { ...lines[idx]!, rateInr: e.target.value };
                      return { ...f, lines };
                    })
                  }
                  sx={{ width: { sm: 110 } }}
                />
              </Stack>
            ))}
            <Button size="small" onClick={() => setForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }))}>
              Add line
            </Button>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Advance recovery ₹"
                value={form.advanceInr}
                onChange={(e) => setForm((f) => ({ ...f, advanceInr: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Retention ₹"
                value={form.retentionInr}
                onChange={(e) => setForm((f) => ({ ...f, retentionInr: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Other deduction ₹"
                value={form.otherInr}
                onChange={(e) => setForm((f) => ({ ...f, otherInr: e.target.value }))}
                fullWidth
              />
            </Stack>
            <TextField
              label="Other deduction note"
              value={form.otherNote}
              onChange={(e) => setForm((f) => ({ ...f, otherNote: e.target.value }))}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="GST note"
                value={form.gstNote}
                onChange={(e) => setForm((f) => ({ ...f, gstNote: e.target.value }))}
                fullWidth
                placeholder="e.g. GST as applicable on works contract"
              />
              <TextField
                label="TDS note"
                value={form.tdsNote}
                onChange={(e) => setForm((f) => ({ ...f, tdsNote: e.target.value }))}
                fullWidth
                placeholder="e.g. TDS u/s 194C"
              />
            </Stack>
            <TextField
              label="Narrative"
              value={form.narrative}
              onChange={(e) => setForm((f) => ({ ...f, narrative: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            <Typography variant="caption" color="text.secondary">
              Preview net{" "}
              {formatINR(
                pmcRaNetPayablePaise({
                  grossPaise: form.lines.reduce((s, l) => {
                    const qty = Number(l.thisQty);
                    const rate = toPaise(l.rateInr);
                    if (!Number.isFinite(qty) || qty < 0) return s;
                    return s + pmcRaLineAmountPaise(qty, rate);
                  }, 0),
                  advanceRecoveryPaise: toPaise(form.advanceInr),
                  retentionPaise: toPaise(form.retentionInr),
                  otherDeductionPaise: toPaise(form.otherInr),
                }),
              )}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={
              !form.billNo.trim() ||
              !form.periodStart ||
              !form.periodEnd ||
              form.lines.every((l) => l.description.trim().length < 1) ||
              create.isPending
            }
            onClick={() => {
              const lines = form.lines
                .filter((l) => l.description.trim() && l.thisQty !== "" && l.rateInr !== "")
                .map((l) => ({
                  description: l.description.trim(),
                  unit: l.unit.trim() || undefined,
                  previousQty: Number(l.previousQty) || 0,
                  thisQty: Number(l.thisQty),
                  ratePaise: toPaise(l.rateInr),
                }))
                .filter((l) => Number.isFinite(l.thisQty) && l.thisQty >= 0);
              if (lines.length === 0) return;
              create.mutate({
                projectId,
                billNo: form.billNo.trim(),
                periodStart: form.periodStart,
                periodEnd: form.periodEnd,
                packageId: form.packageId || undefined,
                narrative: form.narrative.trim() || undefined,
                advanceRecoveryPaise: toPaise(form.advanceInr),
                retentionPaise: toPaise(form.retentionInr),
                otherDeductionPaise: toPaise(form.otherInr),
                otherDeductionNote: form.otherNote.trim() || undefined,
                gstNote: form.gstNote.trim() || undefined,
                tdsNote: form.tdsNote.trim() || undefined,
                lines,
              });
            }}
          >
            Create draft
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
