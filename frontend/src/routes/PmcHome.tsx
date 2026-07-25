import { Box, Button, Skeleton, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { AORMS_PMC, AORMS_PLATFORM } from "../lib/product-nomenclature.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { StatusDot } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";

const PILLARS = [
  {
    title: "Programme",
    body: "Master programme, milestones, and client reporting — governance, not contractor CPM.",
    wave: "Wave 2",
  },
  {
    title: "Packages",
    body: "Work packages and tender oversight from the client's side — certify, don't bid as the firm.",
    wave: "Wave 2",
  },
  {
    title: "Site certification",
    body: "RA bills and steel checks the PMC certifies for the client. Snags + progress reports are live now.",
    wave: "Wave 1–3",
  },
  {
    title: "Stakeholders",
    body: "Client, consultants, and contractors coordinated through one PMC workspace.",
    wave: "Reuse",
  },
] as const;

/**
 * AProc home — Accelerated Project Management (PMC) workspace entry.
 * Wave 1: live open-snag portfolio + links into reused Studio project Delivery.
 */
export function PmcHome() {
  const projectsQ = trpc.projectOffice.list.useQuery({ limit: 12, offset: 0 });
  const snagsQ = trpc.snags.portfolioOpen.useQuery();

  const projectRows = projectsQ.data ?? [];
  const openSnags = snagsQ.data ?? [];
  const totalOpen = openSnags.reduce((n, r) => n + Number(r.openCount), 0);

  return (
    <RailLayout
      title={AORMS_PMC.title}
      description={`${AORMS_PMC.expansion} · ${AORMS_PMC.tagline}`}
    >
      <PageBreadcrumb items={[{ label: AORMS_PMC.title }, { label: "Home" }]} />
      <Stack spacing={3}>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 56 * 8 }}>
          {AORMS_PMC.title} is the third {AORMS_PLATFORM.name} app — for project management
          consultancies that plan, coordinate, and certify delivery. Site snags and progress
          reports reuse the Studio Delivery spine; programme, packages, and RA certification
          land in later waves.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          }}
        >
          <Box sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="overline" color="text.secondary">
              Open snags
            </Typography>
            {snagsQ.isLoading ? (
              <Skeleton width={64} height={40} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {totalOpen}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Across {openSnags.length} project{openSnags.length === 1 ? "" : "s"}
            </Typography>
          </Box>
          <Box sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="overline" color="text.secondary">
              Active projects
            </Typography>
            {projectsQ.isLoading ? (
              <Skeleton width={64} height={40} />
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
                    to={`/projects/${row.projectId}?tab=delivery`}
                    size="small"
                    variant="outlined"
                  >
                    Delivery
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
