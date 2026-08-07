import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { Surface, RADIUS } from "@hcw/ui-kit";
import { EstiOrchestrationStatus } from "./EstiOrchestrationStatus.js";

/**
 * Stage page shell — left rail retired (2026-08).
 *
 * Soft-neu header (title · description · tabs · filters · actions) above a
 * full-width scrolling main. Export name `RailLayout` kept for call-site compat.
 * Primary create/commit CTAs still belong in ActionDock via `useScreenActions`.
 *
 * Canon: docs/esti/PAGE-STRUCTURE.md
 */
export function RailLayout({
  title,
  description,
  actions,
  tabs,
  aside,
  children,
}: {
  title: string;
  description?: string;
  /** Secondary actions — prefer ActionDock for primary create/commit. */
  actions?: ReactNode;
  /** Section nav — rendered horizontally under the title. */
  tabs?: ReactNode;
  /** Filters / summary strip under tabs. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box
      className="esti-stage-page"
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        width: "100%",
        gap: 1.5,
      }}
    >
      <Surface
        layer="soft"
        className="esti-stage-page__header"
        sx={{
          p: { xs: 1.5, md: 2 },
          borderRadius: `${RADIUS}px`,
          flexShrink: 0,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between" }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
              Workspace
            </Typography>
            <Typography variant="h5" component="h1" sx={{ mt: 0.25, wordBreak: "break-word" }}>
              {title}
            </Typography>
            {description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, wordBreak: "break-word" }}>
                {description}
              </Typography>
            ) : null}
          </Box>
          {actions ? (
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexShrink: 0, alignItems: "center", flexWrap: "wrap" }}
            >
              {actions}
            </Stack>
          ) : null}
        </Stack>

        <EstiOrchestrationStatus />

        {tabs ? <Box sx={{ mt: 1.5, minWidth: 0 }}>{tabs}</Box> : null}
        {aside ? <Box sx={{ mt: 1.5, minWidth: 0 }}>{aside}</Box> : null}
      </Surface>

      <Box
        component="main"
        className="esti-stage-page__main"
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          overflowY: "auto",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
