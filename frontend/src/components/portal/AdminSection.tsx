import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { COMPOSITION_RHYTHM } from "../../lib/composition.js";

/** Standard header + body for an admin console section. */
export function AdminSection({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Stack spacing={COMPOSITION_RHYTHM.md} sx={{ height: "100%", minHeight: 0 }}>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h6" component="h2" sx={{ m: 0 }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        {actions && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", flexShrink: 0 }}>
            {actions}
          </Box>
        )}
      </Box>
      <Stack spacing={COMPOSITION_RHYTHM.md} sx={{ flex: 1, minHeight: 0 }}>
        {children}
      </Stack>
    </Stack>
  );
}
