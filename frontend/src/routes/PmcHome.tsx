import { Box, Stack, Typography } from "@mui/material";
import { AORMS_PMC, AORMS_PLATFORM } from "../lib/product-nomenclature.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";

const PILLARS = [
  {
    title: "Programme",
    body: "Master programme, milestones, and client reporting — governance, not contractor CPM.",
  },
  {
    title: "Packages",
    body: "Work packages and tender oversight from the client's side — certify, don't bid as the firm.",
  },
  {
    title: "Site certification",
    body: "RA bills, steel reconciliation, and site checks the PMC certifies for the client.",
  },
  {
    title: "Stakeholders",
    body: "Client, consultants, and contractors coordinated through one PMC workspace.",
  },
] as const;

/**
 * AProc home — Accelerated Project Management (PMC) workspace entry.
 * Greenfield chrome; modules land behind this shell.
 */
export function PmcHome() {
  return (
    <RailLayout
      title={AORMS_PMC.title}
      description={`${AORMS_PMC.expansion} · ${AORMS_PMC.tagline}`}
    >
      <PageBreadcrumb items={[{ label: AORMS_PMC.title }, { label: "Home" }]} />
      <Stack spacing={2}>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 52 * 8 }}>
          {AORMS_PMC.title} is the third {AORMS_PLATFORM.name} app — for project management
          consultancies that plan, coordinate, and certify delivery. Preview workspace; modules
          ship behind this home.
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
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {p.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {p.body}
              </Typography>
            </Box>
          ))}
        </Box>
      </Stack>
    </RailLayout>
  );
}
