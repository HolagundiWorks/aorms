import { Surface, RADIUS, StatusDot } from "@hcw/ui-kit";
import { Box, Button, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { AORMS_PORTALS } from "../../lib/product-nomenclature.js";
import { COMPOSITION_RHYTHM } from "../../lib/composition.js";

export type AdminSectionKey =
  | "dashboard"
  | "requests"
  | "licenses"
  | "accounts"
  | "orgs"
  | "products"
  | "apikeys"
  | "usage"
  | "certifications"
  | "components";

const SECTIONS: { key: AdminSectionKey; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "requests", label: "Requests" },
  { key: "licenses", label: "Licences" },
  { key: "usage", label: "Usage billing" },
  { key: "accounts", label: "Accounts" },
  { key: "orgs", label: "Organizations" },
  { key: "products", label: "Products & plans" },
  { key: "apikeys", label: "API keys" },
  { key: "certifications", label: "Certifications" },
  { key: "components", label: "Component releases" },
];

/** Licensing console — horizontal section nav + stage (no left rail). */
export function AdminConsoleShell({
  section,
  onSectionChange,
  pendingRequests = 0,
  email,
  isPlatformAdmin,
  children,
}: {
  section: AdminSectionKey;
  onSectionChange: (key: AdminSectionKey) => void;
  pendingRequests?: number;
  email: string;
  isPlatformAdmin: boolean;
  children: ReactNode;
}) {
  return (
    <Stack spacing={COMPOSITION_RHYTHM.stageGap} sx={{ height: "100%", minHeight: 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={COMPOSITION_RHYTHM.sm}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            {AORMS_PORTALS.account.licensing}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Manage accounts, organizations, licences, and API keys for AORMS Standard.
          </Typography>
        </Box>
        <Stack direction="row" spacing={COMPOSITION_RHYTHM.sm} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <StatusDot
            color={isPlatformAdmin ? "green" : "cool-gray"}
            label={isPlatformAdmin ? "Platform admin" : "Member"}
          />
          <Typography variant="body2" color="text.secondary">
            {email}
          </Typography>
        </Stack>
      </Stack>

      <Stack
        component="nav"
        aria-label="Licensing sections"
        direction="row"
        spacing={0.5}
        useFlexGap
        sx={{ flexWrap: "wrap", alignItems: "center", gap: 1 }}
      >
        {SECTIONS.map((s) => {
          const selected = section === s.key;
          const label =
            s.key === "requests" && pendingRequests > 0
              ? `${s.label} (${pendingRequests})`
              : s.label;
          return (
            <Button
              key={s.key}
              size="small"
              variant={selected ? "contained" : "text"}
              color={selected ? "primary" : "inherit"}
              aria-current={selected ? "page" : undefined}
              onClick={() => onSectionChange(s.key)}
              sx={{ borderRadius: `${RADIUS}px`, textTransform: "none", minHeight: 44 }}
            >
              {label}
            </Button>
          );
        })}
      </Stack>

      <Surface
        layer="flat"
        className="esti-admin-console__stage"
        sx={{ flex: 1, minHeight: 0, p: COMPOSITION_RHYTHM.headerPad }}
      >
        {children}
      </Surface>
    </Stack>
  );
}
