import { Box, Button, Skeleton, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { AORMS_PMC, AORMS_PLATFORM } from "../lib/product-nomenclature.js";
import { JointMeasurementQueue } from "../components/jointMeasurement/JointMeasurementQueue.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { StatusDot } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";

const PILLARS = [
  {
    title: "Programme",
    body: "Master programme milestones for client reporting — live under Project → Site › Coordination › Programme.",
    wave: "Wave 2 ✅",
  },
  {
    title: "Packages & tenders",
    body: "Invite contractors from Project → Site › Coordination › Packages; they bid in the contractor portal (sealed until open).",
    wave: "Wave 2 ✅",
  },
  {
    title: "Site certification",
    body: "RA bills and steel certification under Project → Site › Technical — certify for the client.",
    wave: "Wave 3 ✅",
  },
  {
    title: "Stakeholders",
    body: "Client, consultants, and contractors coordinated through one PMC workspace.",
    wave: "Reuse",
  },
] as const;

/**
 * AProc home — Accelerated Project Management (PMC) workspace entry.
 * Waves 0–4: portfolio KPIs, digest email, Delivery deep-links.
 */
export function PmcHome() {
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 12, offset: 0 });
  const snagsQ = trpc.snags.portfolioOpen.useQuery();
  const milestonesQ = trpc.pmcMilestones.portfolioAttention.useQuery();
  const packagesQ = trpc.pmcPackages.portfolioOpen.useQuery();
  const raQ = trpc.pmcRaBills.portfolioOpen.useQuery();
  const [digestMsg, setDigestMsg] = useState<string | null>(null);
  const sendDigest = trpc.pmcDigest.send.useMutation({
    meta: { errorTitle: "Couldn't send portfolio digest" },
    onSuccess: (res) => {
      setDigestMsg(
        res.sent
          ? `Digest sent to ${res.to}`
          : `Digest not sent${res.reason ? `: ${res.reason}` : ""}`,
      );
    },
  });

  const projectRows = projectsQ.data ?? [];
  const openSnags = snagsQ.data ?? [];
  const attentionMs = milestonesQ.data ?? [];
  const openPkgs = packagesQ.data ?? [];
  const openRa = raQ.data ?? [];
  const totalOpenSnags = openSnags.reduce((n, r) => n + Number(r.openCount), 0);
  const totalOpenPkgs = openPkgs.reduce((n, r) => n + Number(r.openCount), 0);

  return (
    <RailLayout
      title={AORMS_PMC.title}
      description={`${AORMS_PMC.expansion} · ${AORMS_PMC.tagline}`}
    >
      <PageBreadcrumb items={[{ label: AORMS_PMC.title }, { label: "Home" }]} />
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between" }}
        >
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 56 * 8 }}>
            {AORMS_PMC.title} is the third {AORMS_PLATFORM.name} app — for project management
            consultancies that plan, coordinate, and certify delivery. Programme, packages, tenders,
            RA and steel certification live under each project’s Site group (Coordination · Technical).
          </Typography>
          <Button
            size="small"
            variant="outlined"
            disabled={sendDigest.isPending}
            onClick={() => {
              setDigestMsg(null);
              sendDigest.mutate({});
            }}
            sx={{ flexShrink: 0 }}
          >
            {sendDigest.isPending ? "Sending…" : "Email portfolio digest"}
          </Button>
        </Stack>
        {digestMsg && (
          <Typography variant="caption" color="text.secondary">
            {digestMsg}
          </Typography>
        )}

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" },
          }}
        >
          <Box sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="overline" color="text.secondary">
              Open snags
            </Typography>
            {snagsQ.isLoading ? (
              <Skeleton width={48} height={36} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {totalOpenSnags}
              </Typography>
            )}
          </Box>
          <Box sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="overline" color="text.secondary">
              Milestone alerts
            </Typography>
            {milestonesQ.isLoading ? (
              <Skeleton width={48} height={36} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {attentionMs.length}
              </Typography>
            )}
          </Box>
          <Box sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="overline" color="text.secondary">
              Open packages
            </Typography>
            {packagesQ.isLoading ? (
              <Skeleton width={48} height={36} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {totalOpenPkgs}
              </Typography>
            )}
          </Box>
          <Box sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="overline" color="text.secondary">
              RA in flight
            </Typography>
            {raQ.isLoading ? (
              <Skeleton width={48} height={36} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {openRa.length}
              </Typography>
            )}
          </Box>
          <Box sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="overline" color="text.secondary">
              Active projects
            </Typography>
            {projectsQ.isLoading ? (
              <Skeleton width={48} height={36} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {projectRows.length}
              </Typography>
            )}
            <Button component={RouterLink} to="/projects" size="small" sx={{ mt: 0.5, px: 0 }}>
              Open projects
            </Button>
          </Box>
        </Box>

        {(openRa.length > 0 || raQ.isLoading) && (
          <Stack spacing={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Attention — RA certification
            </Typography>
            {raQ.isLoading && <Skeleton variant="rectangular" height={48} />}
            {openRa.slice(0, 8).map((b) => (
              <Stack
                key={b.id}
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  py: 1,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {b.projectRef} · {b.billNo}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {b.ref} · {b.status.replace(/_/g, " ")}
                  </Typography>
                </Box>
                <Button
                  component={RouterLink}
                  to={`/projects/${b.projectId}?tab=technical&facet=ra-certification`}
                  size="small"
                  variant="outlined"
                >
                  Open
                </Button>
              </Stack>
            ))}
          </Stack>
        )}

        <JointMeasurementQueue />

        {(attentionMs.length > 0 || milestonesQ.isLoading) && (
          <Stack spacing={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Attention — programme
            </Typography>
            {milestonesQ.isLoading && <Skeleton variant="rectangular" height={48} />}
            {attentionMs.slice(0, 8).map((m) => (
              <Stack
                key={m.id}
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  py: 1,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {m.projectRef} · {m.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {m.ref}
                    {m.plannedDate ? ` · planned ${m.plannedDate}` : ""}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <StatusDot
                    color={m.status === "DELAYED" ? "red" : "teal"}
                    label={m.status === "DELAYED" ? "Delayed" : "At risk"}
                  />
                  <Button
                    component={RouterLink}
                    to={`/projects/${m.projectId}?tab=coordination&facet=programme`}
                    size="small"
                    variant="outlined"
                  >
                    Programme
                  </Button>
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}

        {(openSnags.length > 0 || snagsQ.isLoading) && (
          <Stack spacing={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Attention — open snags
            </Typography>
            {snagsQ.isLoading && <Skeleton variant="rectangular" height={48} />}
            {openSnags.slice(0, 8).map((row) => (
              <Stack
                key={row.projectId}
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  py: 1,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {row.projectRef} · {row.projectTitle}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <StatusDot color="red" label={`${row.openCount} open`} />
                  <Button
                    component={RouterLink}
                    to={`/projects/${row.projectId}?tab=site&facet=snags`}
                    size="small"
                    variant="outlined"
                  >
                    Site
                  </Button>
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Pillars
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            }}
          >
            {PILLARS.map((p) => (
              <Box
                key={p.title}
                sx={{
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {p.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {p.wave}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {p.body}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Stack>
    </RailLayout>
  );
}
