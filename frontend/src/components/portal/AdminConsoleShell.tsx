import { Surface } from "@hcw/ui-kit";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { AORMS_PORTALS } from "../../lib/product-nomenclature.js";

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
    <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            {AORMS_PORTALS.account.licensing}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage accounts, organizations, licences, and API keys for AORMS Standard.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Chip
            size="small"
            label={isPlatformAdmin ? "Platform admin" : "Member"}
            color={isPlatformAdmin ? "success" : "default"}
            variant="outlined"
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
        sx={{ flexWrap: "wrap", alignItems: "center" }}
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
              onClick={() => onSectionChange(s.key)}
              sx={{ borderRadius: "8px", textTransform: "none", minHeight: 36 }}
            >
              {label}
            </Button>
          );
        })}
      </Stack>

      <Surface layer="flat" className="esti-admin-console__stage" sx={{ flex: 1, minHeight: 0, p: 2 }}>
        {children}
      </Surface>
    </Stack>
  );
}
