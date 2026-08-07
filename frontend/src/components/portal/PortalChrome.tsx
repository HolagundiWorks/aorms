import { SoftSurface } from "../landing/SoftSurface.js";
import { Stack, Tab, Tabs, Typography } from "@mui/material";
import type { ReactNode, SyntheticEvent } from "react";
import { useEffect } from "react";
import { COMPOSITION_RHYTHM } from "../../lib/composition.js";
import { AORMS_PORTALS } from "../../lib/product-nomenclature.js";

/** Shared padding for portal content cards (8px rhythm). */
export const portalPaperSx = { p: COMPOSITION_RHYTHM.md } as const;

/** Soft neu content card for account / company / licensing hubs. */
export function PortalCard({
  children,
  sx,
  id,
}: {
  children: ReactNode;
  sx?: Record<string, unknown>;
  id?: string;
}) {
  return (
    <SoftSurface id={id} sx={{ ...portalPaperSx, ...(sx ?? {}) }}>
      {children}
    </SoftSurface>
  );
}

export function PortalPageHeader({
  title,
  subtitle,
  meta,
  actions,
  documentTitle,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  /** Browser tab title; defaults to `{title} — AORMS account`. */
  documentTitle?: string;
}) {
  useEffect(() => {
    document.title = documentTitle ?? `${title} — ${AORMS_PORTALS.account.name}`;
  }, [title, documentTitle]);

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={COMPOSITION_RHYTHM.sm}
      sx={{ alignItems: { md: "flex-start" }, justifyContent: "space-between" }}
    >
      <Stack spacing={0.75} className="esti-grow" sx={{ minWidth: 0 }}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        {meta}
      </Stack>
      {actions && (
        <Stack
          direction="row"
          spacing={COMPOSITION_RHYTHM.xs}
          sx={{ flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}
        >
          {actions}
        </Stack>
      )}
    </Stack>
  );
}

export function PortalTabs({
  value,
  onChange,
  labels,
  ariaLabel,
}: {
  value: number;
  onChange: (_e: SyntheticEvent, v: number) => void;
  labels: string[];
  ariaLabel: string;
}) {
  return (
    <SoftSurface
      sx={{
        px: { xs: COMPOSITION_RHYTHM.xs, sm: COMPOSITION_RHYTHM.sm },
        py: 0.5,
      }}
    >
      <Tabs
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          minHeight: 44,
          "& .MuiTab-root": {
            textTransform: "none",
            minHeight: 44,
            fontWeight: 600,
          },
        }}
      >
        {labels.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>
    </SoftSurface>
  );
}

export function PortalTabPanel({
  active,
  children,
  id,
}: {
  active: boolean;
  children: ReactNode;
  id?: string;
}) {
  if (!active) return null;
  return (
    <Stack id={id} spacing={COMPOSITION_RHYTHM.md}>
      {children}
    </Stack>
  );
}
