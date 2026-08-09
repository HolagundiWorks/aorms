import { Box, Tab, Tabs } from "@mui/material";
import type { ReactNode } from "react";
import { COMPOSITION_RHYTHM } from "../../lib/composition.js";

export type ProjectFacet = { id: string; label: string; panel: ReactNode };

/**
 * Nested MUI facet tabs for project panels (Site · Finance · …).
 * One panel visible at a time; parent owns URL/`facet` if needed.
 */
export function ProjectFacetTabs({
  facets,
  value,
  onChange,
  ariaLabel,
}: {
  facets: ProjectFacet[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}) {
  if (facets.length === 0) return null;
  if (facets.length === 1) {
    return <Box sx={{ pt: COMPOSITION_RHYTHM.xs }}>{facets[0]!.panel}</Box>;
  }

  const index = Math.max(
    0,
    facets.findIndex((f) => f.id === value),
  );
  const active = facets[index] ?? facets[0]!;

  return (
    <Box>
      <Tabs
        value={active.id}
        onChange={(_, next: string) => onChange(next)}
        aria-label={ariaLabel}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 40,
          borderBottom: 1,
          borderColor: "divider",
          mb: COMPOSITION_RHYTHM.sm,
          "& .MuiTab-root": {
            textTransform: "none",
            minHeight: 40,
            fontWeight: 500,
          },
        }}
      >
        {facets.map((f) => (
          <Tab key={f.id} value={f.id} label={f.label} />
        ))}
      </Tabs>
      <Box sx={{ pt: COMPOSITION_RHYTHM.xs }}>{active.panel}</Box>
    </Box>
  );
}
