import { STANDARD_LICENCE_LABEL } from "@esti/contracts";
import { Box, Stack, Typography } from "@mui/material";
import { StatusDot, Surface, RADIUS } from "@hcw/ui-kit";
import { COMPOSITION_RHYTHM } from "../../lib/composition.js";
import type { MyLicense } from "../../platform-admin/lib/auth.js";

/**
 * Licence summary card for account / company portals — soft Surface + kit StatusDot.
 */
export function PortalLicenceCard({
  title = "Licence",
  license,
}: {
  title?: string;
  license: MyLicense;
}) {
  return (
    <Surface layer="soft" sx={{ borderRadius: `${RADIUS}px`, p: COMPOSITION_RHYTHM.md }}>
      <Stack spacing={COMPOSITION_RHYTHM.sm}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="h6" component="h2" sx={{ flex: 1, m: 0 }}>
            {title}
          </Typography>
          <StatusDot
            color={license.status === "ACTIVE" ? "green" : "gray"}
            label={STANDARD_LICENCE_LABEL}
          />
        </Box>
        <Typography variant="body2" sx={{ m: 0 }}>
          Seats: {license.seats == null ? "Unlimited" : license.seats}
          {" · "}
          Devices: {license.deviceLimit == null ? "Unlimited" : license.deviceLimit}
        </Typography>
        <Typography variant="body2" sx={{ m: 0 }}>
          {license.expiresAt
            ? `Renews / expires ${new Date(license.expiresAt).toLocaleDateString()}`
            : "Perpetual — no expiry"}
        </Typography>
      </Stack>
    </Surface>
  );
}
