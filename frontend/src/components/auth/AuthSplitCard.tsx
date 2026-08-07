import { Box, Stack, TextField, Typography, type TextFieldProps } from "@mui/material";
import type { ReactNode } from "react";
import { AuthBrandBlock } from "../AormsLogo.js";
import { COMPOSITION_RHYTHM } from "../../lib/composition.js";

/**
 * Shared horizontal brand | form card body for every AORMS sign-in surface
 * (workspace, external portals, account, licensing console).
 */
export function AuthSplitCard({
  brand,
  children,
}: {
  brand: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box
      className="esti-auth-card__split"
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: "stretch",
        minHeight: { md: 360 },
      }}
    >
      <Stack
        className="esti-auth-card__brand"
        spacing={COMPOSITION_RHYTHM.md}
        sx={{
          flex: { md: "0 0 38%" },
          width: { xs: "100%", md: "auto" },
          p: { xs: COMPOSITION_RHYTHM.md, md: COMPOSITION_RHYTHM.lg },
          justifyContent: "center",
          borderBottom: { xs: 1, md: 0 },
          borderRight: { xs: 0, md: 1 },
          borderColor: "divider",
          backgroundColor: "action.hover",
        }}
      >
        {brand}
      </Stack>
      <Stack
        className="esti-auth-form"
        spacing={COMPOSITION_RHYTHM.md}
        sx={{
          flex: 1,
          minWidth: 0,
          p: { xs: COMPOSITION_RHYTHM.md, md: COMPOSITION_RHYTHM.lg },
          justifyContent: "center",
        }}
      >
        {children}
      </Stack>
    </Box>
  );
}

/** Left-pane brand + title + lead for AuthSplitCard. */
export function AuthBrandPane({
  product,
  tagline,
  title,
  lead,
}: {
  product?: string;
  tagline?: string;
  title: string;
  lead: ReactNode;
}) {
  return (
    <>
      <AuthBrandBlock product={product} tagline={tagline} logoVariant="rail" />
      <Box>
        <Typography variant="h5" component="h1" className="esti-auth-title">
          {title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          component="div"
          className="esti-auth-lead"
          sx={{ mt: 1 }}
        >
          {lead}
        </Typography>
      </Box>
    </>
  );
}

/** Label above the field (not on the outlined notch). */
export function AuthLabeledField({
  id,
  label,
  ...props
}: { id: string; label: string } & Omit<TextFieldProps, "id" | "label">) {
  return (
    <Stack spacing={0.75}>
      <Typography component="label" htmlFor={id} variant="body2" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <TextField id={id} fullWidth aria-label={label} {...props} />
    </Stack>
  );
}
