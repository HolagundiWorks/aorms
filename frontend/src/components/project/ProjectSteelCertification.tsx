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
  PMC_STEEL_CERT_STATUS_LABEL,
  PMC_STEEL_TRANSITIONS,
  PmcSteelCertStatus,
  can,
  pmcSteelWastagePct,
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

/** AProc Wave 3.3 — lightweight steel certification (issued vs consumed kg). */
export function ProjectSteelCertification({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const listQ = trpc.pmcSteelCerts.listByProject.useQuery({ projectId });
  const packagesQ = trpc.pmcPackages.listByProject.useQuery({ projectId });

  const invalidate = () => void utils.pmcSteelCerts.listByProject.invalidate({ projectId });

  const create = trpc.pmcSteelCerts.create.useMutation({
    meta: { errorTitle: "Couldn't create steel cert" },
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      resetForm();
    },
  });
  const transition = trpc.pmcSteelCerts.transition.useMutation({
    meta: { errorTitle: "Couldn't update status" },
    onSuccess: invalidate,
  });
  const remove = trpc.pmcSteelCerts.remove.useMutation({
    meta: { errorTitle: "Couldn't remove cert" },
    onSuccess: invalidate,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    packageId: "",
    periodStart: "",
    periodEnd: "",
    issuedKg: "",
    consumedKg: "",
    narrative: "",
  });
  const resetForm = () =>
    setForm({
      packageId: "",
      periodStart: "",
      periodEnd: "",
      issuedKg: "",
      consumedKg: "",
      narrative: "",
    });

  const canWrite = can(user?.role, "write");
  const canCertify = can(user?.role, "cost:approve");
  const rows = listQ.data ?? [];
  const packages = packagesQ.data ?? [];

  const previewWastage = (() => {
    const issued = Number(form.issuedKg);
    const consumed = Number(form.consumedKg);
    if (!Number.isFinite(issued) || !Number.isFinite(consumed)) return null;
    return pmcSteelWastagePct(issued, consumed);
  })();

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="h6" component="h4">
          Steel certification
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {rows.length} records
        </Typography>
        {canWrite && (
          <Button size="small" variant="contained" onClick={() => setCreateOpen(true)}>
            New steel cert
          </Button>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Owner-side issued vs consumed steel (kg) with wastage %. Not a full BBS / cutting schedule
        ERP — certify quantities for the client.
      </Typography>

      {listQ.isLoading && (
        <Stack spacing={0.5}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={48} />
          ))}
        </Stack>
      )}
      {rows.length === 0 && !listQ.isLoading && (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2">No steel certifications yet.</Typography>
        </Box>
      )}

      <Stack spacing={1}>
        {rows.map((c) => {
          const next = PMC_STEEL_TRANSITIONS[c.status as PmcSteelCertStatus] ?? [];
          return (
            <Box key={c.id} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {c.ref}
                  </Typography>
                  <StatusDot
                    color={STATUS_TAG[c.status] ?? "gray"}
                    label={
                      PMC_STEEL_CERT_STATUS_LABEL[c.status as PmcSteelCertStatus] ?? c.status
                    }
                  />
                </Stack>
                <Typography variant="body2">
                  {c.periodStart} → {c.periodEnd} · Issued {c.issuedKg} kg · Consumed{" "}
                  {c.consumedKg} kg · Wastage {c.wastagePct}%
                </Typography>
                {canWrite && next.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                    {next.map((to) => {
                      const needsCert = to === "CERTIFIED";
                      if (needsCert && !canCertify) return null;
                      return (
                        <Button
                          key={to}
                          size="small"
                          variant={needsCert ? "contained" : "outlined"}
                          disabled={transition.isPending}
                          onClick={() =>
                            transition.mutate({ id: c.id, projectId, to })
                          }
                        >
                          {PMC_STEEL_CERT_STATUS_LABEL[to]}
                        </Button>
                      );
                    })}
                    {c.status === "DRAFT" && (
                      <Button
                        size="small"
                        variant="text"
                        color="error"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (window.confirm(`Remove ${c.ref}?`)) {
                            remove.mutate({ id: c.id, projectId });
                          }
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </Stack>
                )}
              </Stack>
            </Box>
          );
        })}
      </Stack>

      <Dialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetForm();
        }}
        fullWidth
        maxWidth="sm"
        aria-labelledby="steel-cert-create-title"
      >
        <DialogTitle id="steel-cert-create-title">New steel certification</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {packages.length > 0 && (
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
                    {p.ref} — {p.title}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              label="Period start"
              type="date"
              value={form.periodStart}
              onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
              fullWidth
              {...shrink}
            />
            <TextField
              label="Period end"
              type="date"
              value={form.periodEnd}
              onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
              fullWidth
              {...shrink}
            />
            <TextField
              label="Issued (kg)"
              value={form.issuedKg}
              onChange={(e) => setForm((f) => ({ ...f, issuedKg: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Consumed (kg)"
              value={form.consumedKg}
              onChange={(e) => setForm((f) => ({ ...f, consumedKg: e.target.value }))}
              fullWidth
              helperText={
                previewWastage != null ? `Wastage preview: ${previewWastage}%` : undefined
              }
            />
            <TextField
              label="Narrative"
              value={form.narrative}
              onChange={(e) => setForm((f) => ({ ...f, narrative: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
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
              !form.periodStart ||
              !form.periodEnd ||
              form.issuedKg === "" ||
              form.consumedKg === "" ||
              create.isPending
            }
            onClick={() => {
              const issuedKg = Number(form.issuedKg);
              const consumedKg = Number(form.consumedKg);
              if (!Number.isFinite(issuedKg) || !Number.isFinite(consumedKg)) return;
              create.mutate({
                projectId,
                packageId: form.packageId || undefined,
                periodStart: form.periodStart,
                periodEnd: form.periodEnd,
                issuedKg,
                consumedKg,
                narrative: form.narrative.trim() || undefined,
              });
            }}
          >
            Save draft
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
