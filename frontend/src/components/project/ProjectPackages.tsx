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
  PMC_PACKAGE_STATUS_LABEL,
  PmcPackageStatus,
  can,
  formatINR,
} from "@esti/contracts";
import { useState } from "react";
import { useAuth } from "../../lib/auth.js";
import { trpc } from "../../lib/trpc.js";
import { StatusDot } from "../StatusTag.js";

const STATUS_TAG: Record<string, "gray" | "green" | "red" | "blue" | "teal"> = {
  DRAFT: "gray",
  TENDERING: "blue",
  AWARDED: "teal",
  IN_PROGRESS: "blue",
  COMPLETE: "green",
  CANCELLED: "red",
};

const shrink = { slotProps: { inputLabel: { shrink: true } } } as const;

function PackageTenderPanel({
  projectId,
  packageId,
  canWrite,
}: {
  projectId: string;
  packageId: string;
  canWrite: boolean;
}) {
  const utils = trpc.useUtils();
  const contractorsQ = trpc.contractors.list.useQuery(
    { activeOnly: true },
    { enabled: canWrite },
  );
  const invitesQ = trpc.pmcPackageTenders.listInvites.useQuery({ projectId, packageId });
  const bidsQ = trpc.pmcPackageTenders.listBids.useQuery({ projectId, packageId });
  const [inviteContractorId, setInviteContractorId] = useState("");

  const invalidate = () => {
    void utils.pmcPackageTenders.listInvites.invalidate({ projectId, packageId });
    void utils.pmcPackageTenders.listBids.invalidate({ projectId, packageId });
    void utils.pmcPackages.listByProject.invalidate({ projectId });
    void utils.pmcPackages.portfolioOpen.invalidate();
  };

  const invite = trpc.pmcPackageTenders.invite.useMutation({
    meta: { errorTitle: "Couldn't invite contractor" },
    onSuccess: () => {
      invalidate();
      setInviteContractorId("");
    },
  });
  const withdrawInvite = trpc.pmcPackageTenders.withdrawInvite.useMutation({
    meta: { errorTitle: "Couldn't withdraw invite" },
    onSuccess: invalidate,
  });
  const openBids = trpc.pmcPackageTenders.openBids.useMutation({
    meta: { errorTitle: "Couldn't open bids" },
    onSuccess: invalidate,
  });
  const award = trpc.pmcPackageTenders.award.useMutation({
    meta: { errorTitle: "Couldn't award package" },
    onSuccess: invalidate,
  });

  const invites = invitesQ.data ?? [];
  const bidData = bidsQ.data;
  const contractors = contractorsQ.data ?? [];
  const invitedIds = new Set(invites.filter((i) => i.status === "INVITED").map((i) => i.contractorId));

  return (
    <Stack spacing={1} sx={{ mt: 1, pl: 1, borderLeft: 2, borderColor: "divider" }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        Tender invites & bids
      </Typography>
      {canWrite && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            select
            size="small"
            label="Invite contractor"
            value={inviteContractorId}
            sx={{ minWidth: 180 }}
            onChange={(e) => setInviteContractorId(e.target.value)}
          >
            <MenuItem value="">—</MenuItem>
            {contractors
              .filter((c) => !invitedIds.has(c.id))
              .map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
          </TextField>
          <Button
            size="small"
            variant="outlined"
            disabled={!inviteContractorId || invite.isPending}
            onClick={() =>
              invite.mutate({
                projectId,
                packageId,
                contractorId: inviteContractorId,
                startTendering: true,
              })
            }
          >
            Invite
          </Button>
          {bidData?.sealed && (
            <Button
              size="small"
              variant="contained"
              disabled={openBids.isPending}
              onClick={() => openBids.mutate({ projectId, packageId })}
            >
              Open bids ({bidData.submittedCount} sealed)
            </Button>
          )}
        </Stack>
      )}
      {invites.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          Invites:{" "}
          {invites
            .map((i) => `${i.contractorName} (${i.status})`)
            .join(" · ")}
        </Typography>
      )}
      {canWrite &&
        invites
          .filter((i) => i.status === "INVITED")
          .map((i) => (
            <Button
              key={i.id}
              size="small"
              variant="text"
              color="error"
              sx={{ alignSelf: "flex-start" }}
              disabled={withdrawInvite.isPending}
              onClick={() =>
                withdrawInvite.mutate({ projectId, packageId, inviteId: i.id })
              }
            >
              Withdraw {i.contractorName}
            </Button>
          ))}
      {bidData && bidData.bids.length > 0 && (
        <Stack spacing={0.5}>
          {bidData.bids.map((b) => (
            <Stack
              key={b.id}
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", flexWrap: "wrap" }}
            >
              <Typography variant="body2">
                {b.contractorName}
                {bidData.sealed
                  ? " — bid submitted (sealed)"
                  : b.amountPaise != null
                    ? ` — ${formatINR(b.amountPaise)}`
                    : ""}{" "}
                [{b.status}]
              </Typography>
              {canWrite && !bidData.sealed && b.status === "SUBMITTED" && (
                <Button
                  size="small"
                  variant="contained"
                  disabled={award.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Award this package to ${b.contractorName}${b.amountPaise != null ? ` at ${formatINR(b.amountPaise)}` : ""}?`,
                      )
                    ) {
                      award.mutate({ projectId, packageId, bidId: b.id });
                    }
                  }}
                >
                  Award
                </Button>
              )}
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

/** Package register — AProc Wave 2 owner-side tender oversight + W2.3 invites/bids. */
export function ProjectPackages({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const listQ = trpc.pmcPackages.listByProject.useQuery({ projectId });
  const contractorsQ = trpc.contractors.list.useQuery(
    { activeOnly: true },
    { enabled: can(user?.role, "write") },
  );
  const invalidate = () => {
    void utils.pmcPackages.listByProject.invalidate({ projectId });
    void utils.pmcPackages.portfolioOpen.invalidate();
  };

  const create = trpc.pmcPackages.create.useMutation({
    meta: { errorTitle: "Couldn't create the package" },
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      resetForm();
    },
  });
  const update = trpc.pmcPackages.update.useMutation({
    meta: { errorTitle: "Couldn't update the package" },
    onSuccess: invalidate,
  });
  const remove = trpc.pmcPackages.remove.useMutation({
    meta: { errorTitle: "Couldn't remove the package" },
    onSuccess: invalidate,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    trade: "",
    contractValueInr: "",
    tenderCloseDate: "",
    notes: "",
  });
  const resetForm = () =>
    setForm({ title: "", trade: "", contractValueInr: "", tenderCloseDate: "", notes: "" });

  const canWrite = can(user?.role, "write");
  const rows = listQ.data ?? [];
  const contractors = contractorsQ.data ?? [];
  const openCount = rows.filter((r) => r.status !== "COMPLETE" && r.status !== "CANCELLED").length;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="h6" component="h4">
          Packages
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {openCount} open · {rows.length} total
        </Typography>
        {canWrite && (
          <Button size="small" variant="contained" onClick={() => setCreateOpen(true)}>
            Add package
          </Button>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Owner-side work / tender packages. Invite contractors from here; they bid in the contractor
        portal. The PMC certifies and awards — the firm does not bid.
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
          <Typography variant="body2">
            No packages yet. Register packages you will tender or award on the client’s behalf.
          </Typography>
        </Box>
      )}

      <Stack spacing={1}>
        {rows.map((p) => (
          <Box key={p.id} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {p.ref}
                </Typography>
                <StatusDot
                  color={STATUS_TAG[p.status] ?? "gray"}
                  label={PMC_PACKAGE_STATUS_LABEL[p.status as PmcPackageStatus] ?? p.status}
                />
                {p.trade && (
                  <Typography variant="caption" color="text.secondary">
                    {p.trade}
                  </Typography>
                )}
                {p.contractValuePaise != null && (
                  <Typography variant="caption" color="text.secondary">
                    {formatINR(p.contractValuePaise)}
                  </Typography>
                )}
              </Stack>
              <Typography variant="body2">{p.title}</Typography>
              {(p.tenderCloseDate || p.awardDate) && (
                <Typography variant="caption" color="text.secondary">
                  {[
                    p.tenderCloseDate ? `Tender close ${p.tenderCloseDate}` : null,
                    p.awardDate ? `Awarded ${p.awardDate}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Typography>
              )}
              {canWrite && p.status !== "CANCELLED" && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
                  <TextField
                    select
                    size="small"
                    label="Status"
                    value={p.status}
                    sx={{ minWidth: 140 }}
                    disabled={update.isPending}
                    onChange={(e) => {
                      const status = e.target.value as PmcPackageStatus;
                      update.mutate({
                        id: p.id,
                        projectId,
                        status,
                        ...(status === "AWARDED" && !p.awardDate
                          ? { awardDate: new Date().toISOString().slice(0, 10) }
                          : {}),
                      });
                    }}
                  >
                    {PmcPackageStatus.options.map((s) => (
                      <MenuItem key={s} value={s}>
                        {PMC_PACKAGE_STATUS_LABEL[s]}
                      </MenuItem>
                    ))}
                  </TextField>
                  {contractors.length > 0 && (
                    <TextField
                      select
                      size="small"
                      label="Contractor"
                      value={p.contractorId ?? ""}
                      sx={{ minWidth: 160 }}
                      disabled={update.isPending}
                      onChange={(e) =>
                        update.mutate({
                          id: p.id,
                          projectId,
                          contractorId: e.target.value || null,
                        })
                      }
                    >
                      <MenuItem value="">—</MenuItem>
                      {contractors.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  >
                    {expandedId === p.id ? "Hide tender" : "Tender desk"}
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    color="error"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Remove package ${p.ref}?`)) {
                        remove.mutate({ id: p.id, projectId });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </Stack>
              )}
              {(expandedId === p.id || (!canWrite && p.status === "TENDERING")) && (
                <PackageTenderPanel
                  projectId={projectId}
                  packageId={p.id}
                  canWrite={canWrite}
                />
              )}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog
        aria-labelledby="pmc-package-create-title"
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetForm();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="pmc-package-create-title">Add package</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Trade"
              value={form.trade}
              onChange={(e) => setForm((f) => ({ ...f, trade: e.target.value }))}
              fullWidth
              placeholder="Civil · Structural · MEP…"
            />
            <TextField
              label="Indicative value (₹)"
              value={form.contractValueInr}
              onChange={(e) => setForm((f) => ({ ...f, contractValueInr: e.target.value }))}
              fullWidth
              helperText="Stored as paise — whole rupees only"
            />
            <TextField
              label="Tender close date"
              type="date"
              value={form.tenderCloseDate}
              onChange={(e) => setForm((f) => ({ ...f, tenderCloseDate: e.target.value }))}
              fullWidth
              {...shrink}
            />
            <TextField
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
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
            disabled={form.title.trim().length < 2 || create.isPending}
            onClick={() => {
              const rupees = form.contractValueInr.trim()
                ? Number(form.contractValueInr.replace(/,/g, ""))
                : undefined;
              const paise =
                rupees != null && Number.isFinite(rupees) && rupees >= 0
                  ? Math.round(rupees * 100)
                  : undefined;
              create.mutate({
                projectId,
                title: form.title.trim(),
                trade: form.trade.trim() || undefined,
                contractValuePaise: paise,
                tenderCloseDate: form.tenderCloseDate || undefined,
                notes: form.notes.trim() || undefined,
              });
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
