import { STANDARD_LICENCE_LABEL } from "@esti/contracts";
import { Stack, Tile } from "@carbon/react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { StatusDot } from "../../carbon/adapters/index.js";
import type { MyLicense } from "../../platform-admin/lib/auth.js";

/**
 * Licence summary card for account / company portals.
 *
 * Wave 3 tranche 1 reference migration (docs/esti/CARBON-MIGRATION.md): stock
 * Carbon `Tile`/`Stack` + the `StatusDot` adapter, self-wrapped in `CarbonScope`
 * so it themes correctly while its portal host is still on the kit. Was
 * `Surface` + MUI `Stack`/`Typography` + kit `StatusDot`.
 */
export function PortalLicenceCard({
  title = "Licence",
  license,
}: {
  title?: string;
  license: MyLicense;
}) {
  return (
    <CarbonScope>
      <Tile>
        <Stack gap={4}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <h2 className="cds--type-heading-03" style={{ flex: 1, margin: 0 }}>
              {title}
            </h2>
            <StatusDot
              color={license.status === "ACTIVE" ? "green" : "gray"}
              label={STANDARD_LICENCE_LABEL}
            />
          </div>
          <p className="cds--type-body-01" style={{ margin: 0 }}>
            Seats: {license.seats == null ? "Unlimited" : license.seats}
            {" · "}
            Devices: {license.deviceLimit == null ? "Unlimited" : license.deviceLimit}
          </p>
          <p className="cds--type-body-01" style={{ margin: 0 }}>
            {license.expiresAt
              ? `Renews / expires ${new Date(license.expiresAt).toLocaleDateString()}`
              : "Perpetual — no expiry"}
          </p>
        </Stack>
      </Tile>
    </CarbonScope>
  );
}
