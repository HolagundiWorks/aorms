import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { formatINR } from "@esti/contracts";
import { useState } from "react";
import { ExternalPortalShell } from "../components/portal/ExternalPortalShell.js";
import { StatusDot } from "../components/StatusTag.js";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";
import { trpc } from "../lib/trpc.js";

/** Contractor portal — package tender invites and sealed bid submission (AProc W2.3). */
export function ContractorPortal() {
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    meta: { errorTitle: "Couldn't sign out" },
    onSuccess: () => utils.auth.me.invalidate(),
  });
  const brandingQ = trpc.contractorPortal.branding.useQuery();
  const invitesQ = trpc.contractorPortal.myInvites.useQuery();

  const [bidFor, setBidFor] = useState<{
    packageId: string;
    packageRef: string;
    title: string;
    existingAmountInr?: string;
    existingNote?: string;
  } | null>(null);
  const [amountInr, setAmountInr] = useState("");
  const [coverNote, setCoverNote] = useState("");

  const submitBid = trpc.contractorPortal.submitBid.useMutation({
    meta: { errorTitle: "Couldn't submit the bid" },
    onSuccess: () => {
      void utils.contractorPortal.myInvites.invalidate();
      setBidFor(null);
      setAmountInr("");
      setCoverNote("");
    },
  });
  const withdrawBid = trpc.contractorPortal.withdrawBid.useMutation({
    meta: { errorTitle: "Couldn't withdraw the bid" },
    onSuccess: () => void utils.contractorPortal.myInvites.invalidate(),
  });
  const declineInvite = trpc.contractorPortal.declineInvite.useMutation({
    meta: { errorTitle: "Couldn't decline the invite" },
    onSuccess: () => void utils.contractorPortal.myInvites.invalidate(),
  });

  const invites = invitesQ.data ?? [];
  const firmName = brandingQ.data?.companyName ?? AORMS_PORTALS.contractor.label;

  return (
    <ExternalPortalShell
      portalLabel={AORMS_PORTALS.contractor.label}
      onSignOut={() => logout.mutate()}
      signingOut={logout.isPending}
    >
      <Stack spacing={3} sx={{ maxWidth: 720 }}>
        <Stack spacing={0.5}>
          <Typography variant="h5" component="h1">
            Package tenders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Invites from {firmName}. Submit sealed bids before the tender close date. Amounts stay
            sealed until the PMC opens bids.
          </Typography>
        </Stack>

        {invitesQ.isLoading && (
          <Stack spacing={1}>
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={72} />
            ))}
          </Stack>
        )}

        {!invitesQ.isLoading && invites.length === 0 && (
          <Box sx={{ py: 2 }}>
            <Typography variant="body1">No active package invites.</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              When the PMC invites your firm to tender a package, it will appear here.
            </Typography>
          </Box>
        )}

        <Stack spacing={1.5}>
          {invites.map((inv) => (
            <Box
              key={inv.inviteId}
              sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}
            >
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {inv.packageRef}
                  </Typography>
                  <StatusDot
                    color={inv.packageStatus === "AWARDED" ? "teal" : "blue"}
                    label={inv.packageStatus}
                  />
                  {inv.trade && (
                    <Typography variant="caption" color="text.secondary">
                      {inv.trade}
                    </Typography>
                  )}
                </Stack>
                <Typography variant="body2">{inv.packageTitle}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {inv.projectRef} — {inv.projectTitle}
                  {inv.tenderCloseDate ? ` · Closes ${inv.tenderCloseDate}` : ""}
                </Typography>
                {inv.bid && (
                  <Typography variant="body2">
                    Your bid: {formatINR(inv.bid.amountPaise)} · {inv.bid.status}
                  </Typography>
                )}
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  {inv.canBid && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        setBidFor({
                          packageId: inv.packageId,
                          packageRef: inv.packageRef,
                          title: inv.packageTitle,
                          existingAmountInr: inv.bid
                            ? String(Math.round(inv.bid.amountPaise / 100))
                            : undefined,
                          existingNote: inv.bid?.coverNote ?? undefined,
                        });
                        setAmountInr(
                          inv.bid ? String(Math.round(inv.bid.amountPaise / 100)) : "",
                        );
                        setCoverNote(inv.bid?.coverNote ?? "");
                      }}
                    >
                      {inv.bid ? "Update bid" : "Submit bid"}
                    </Button>
                  )}
                  {inv.bid?.status === "SUBMITTED" && inv.canBid && (
                    <Button
                      size="small"
                      variant="text"
                      color="error"
                      disabled={withdrawBid.isPending}
                      onClick={() => {
                        if (window.confirm("Withdraw this bid?")) {
                          withdrawBid.mutate({ bidId: inv.bid!.id });
                        }
                      }}
                    >
                      Withdraw bid
                    </Button>
                  )}
                  {inv.inviteStatus === "INVITED" && inv.packageStatus === "TENDERING" && (
                    <Button
                      size="small"
                      variant="text"
                      disabled={declineInvite.isPending}
                      onClick={() => {
                        if (window.confirm("Decline this invite?")) {
                          declineInvite.mutate({ inviteId: inv.inviteId });
                        }
                      }}
                    >
                      Decline
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Stack>

      <Dialog
        open={!!bidFor}
        onClose={() => setBidFor(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="contractor-bid-title"
      >
        <DialogTitle id="contractor-bid-title">
          Bid on {bidFor?.packageRef}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {bidFor?.title}
            </Typography>
            <TextField
              label="Bid amount (₹)"
              value={amountInr}
              onChange={(e) => setAmountInr(e.target.value)}
              fullWidth
              required
              helperText="Stored as paise — whole rupees"
            />
            <TextField
              label="Cover note"
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBidFor(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!amountInr.trim() || submitBid.isPending}
            onClick={() => {
              if (!bidFor) return;
              const rupees = Number(amountInr.replace(/,/g, ""));
              if (!Number.isFinite(rupees) || rupees <= 0) return;
              submitBid.mutate({
                packageId: bidFor.packageId,
                amountPaise: Math.round(rupees * 100),
                coverNote: coverNote.trim() || undefined,
              });
            }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </ExternalPortalShell>
  );
}
