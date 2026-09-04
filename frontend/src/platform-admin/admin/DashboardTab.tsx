import { useEffect, useState } from "react";
import { ProgressBar, Stack, Tag, Tile } from "@carbon/react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { DataGrid, StatusDot, type GridColDef } from "../../carbon/adapters/index.js";
import { trpc } from "../lib/trpc";

type Overview = Awaited<ReturnType<typeof trpc.admin.dashboard.overview.query>>;
type Usage = Awaited<ReturnType<typeof trpc.admin.dashboard.usage.query>>;

const GIB = 1024 ** 3;
/** Bytes → human GB/MB, matching how storage is billed (GB-month). */
function fmtBytes(n: number): string {
  if (n >= GIB) return `${(n / GIB).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  TRIAL: "Trial",
  SUSPENDED: "Suspended",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "green",
  TRIAL: "teal",
  SUSPENDED: "cool-gray",
  REVOKED: "red",
  EXPIRED: "gray",
};
const fmtDate = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString() : "—");
const fmtDateTime = (d: Date | string) => new Date(d).toLocaleString();

const SUBTLE: React.CSSProperties = { margin: 0, color: "var(--cds-text-secondary)" };

function Kpi({ label, value, tone, onClick }: { label: string; value: number | string; tone?: "warn" | "default"; onClick?: () => void }) {
  const warn = tone === "warn" && Number(value) > 0;
  return (
    <Tile
      style={{ height: "100%", cursor: onClick ? "pointer" : undefined }}
      onClick={onClick}
    >
      <p className="cds--type-body-01" style={SUBTLE}>{label}</p>
      <p
        className="cds--type-productive-heading-05"
        style={{ margin: "0.25rem 0 0", color: warn ? "var(--cds-support-warning)" : undefined }}
      >
        {value}
      </p>
    </Tile>
  );
}

const KPI_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "1rem",
};

/** License-manager landing page — KPI overview for the platform-admin console. */
export default function DashboardTab({ onGoTo }: { onGoTo: (section: "licenses" | "requests" | "orgs") => void }) {
  const [data, setData] = useState<Overview | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    void trpc.admin.dashboard.overview.query().then(setData);
    void trpc.admin.dashboard.usage.query().then(setUsage);
  }, []);

  if (!data) return null;

  const storagePct =
    usage && usage.storageQuotaBytes > 0
      ? Math.min(100, (usage.storageUsedBytes / usage.storageQuotaBytes) * 100)
      : 0;

  const expiringColumns: GridColDef<Overview["expiringSoon"][number]>[] = [
    { field: "orgName", headerName: "Organization", flex: 1.2, minWidth: 160 },
    { field: "productCode", headerName: "Product", flex: 0.8, minWidth: 100 },
    { field: "key", headerName: "Key", flex: 1.2, minWidth: 180 },
    {
      field: "status",
      headerName: "Status",
      flex: 0.7,
      minWidth: 100,
      renderCell: (p) => (
        <StatusDot color={STATUS_COLOR[p.row.status] ?? "gray"} label={STATUS_LABEL[p.row.status] ?? p.row.status} />
      ),
    },
    { field: "expiresAt", headerName: "Expires", flex: 0.8, minWidth: 110, renderCell: (p) => fmtDate(p.row.expiresAt) },
  ];

  const eventColumns: GridColDef<Overview["recentEvents"][number]>[] = [
    { field: "at", headerName: "When", flex: 1, minWidth: 160, renderCell: (p) => fmtDateTime(p.row.at) },
    { field: "type", headerName: "Event", flex: 0.8, minWidth: 120 },
    { field: "orgName", headerName: "Organization", flex: 1, minWidth: 140 },
    { field: "licenseKey", headerName: "License", flex: 1, minWidth: 160 },
    { field: "actor", headerName: "Actor", flex: 1, minWidth: 140, valueGetter: (v) => v ?? "—" },
  ];

  return (
    <CarbonScope>
      <Stack gap={6}>
        <div style={KPI_GRID}>
          <Kpi label="Total licenses" value={data.totalLicenses} />
          <Kpi label="Organizations" value={data.totalOrgs} />
          <Kpi label="Active devices" value={data.activeDevices} />
          <Kpi label="New this month" value={data.newThisMonth} />
          <Kpi label="Pending requests" value={data.pendingRequests} tone="warn" onClick={() => onGoTo("requests")} />
          <Kpi label="Unlicensed orgs" value={data.unlicensedOrgs} tone="warn" onClick={() => onGoTo("orgs")} />
          <Kpi label="Expiring in 30 days" value={data.expiringSoon.length} tone="warn" onClick={() => onGoTo("licenses")} />
          <Kpi
            label="Suspended / revoked"
            value={(data.byStatus.SUSPENDED ?? 0) + (data.byStatus.REVOKED ?? 0)}
            tone="warn"
          />
        </div>

        {usage && (
          <div>
            <h3 className="cds--type-heading-03" style={{ margin: "0 0 0.5rem" }}>
              {usage.source === "reports"
                ? `Metered usage — ${usage.reportedOrgCount} org${usage.reportedOrgCount === 1 ? "" : "s"} reported`
                : "Metered usage — this workspace"}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
              <Tile style={{ height: "100%" }}>
                <p className="cds--type-body-01" style={SUBTLE}>Storage used</p>
                <p className="cds--type-productive-heading-05" style={{ margin: "0.25rem 0" }}>{fmtBytes(usage.storageUsedBytes)}</p>
                <div style={{ margin: "0.5rem 0" }}>
                  <ProgressBar
                    label="Storage used"
                    hideLabel
                    value={storagePct}
                    max={100}
                    status={storagePct >= 90 ? "error" : "active"}
                  />
                </div>
                <p className="cds--type-body-01" style={SUBTLE}>
                  {storagePct.toFixed(1)}% of {fmtBytes(usage.storageQuotaBytes)}
                  {usage.storagePurchasedBytes > 0 &&
                    ` (incl. ${fmtBytes(usage.storagePurchasedBytes)} add-on)`}
                </p>
              </Tile>
            </div>
            {usage.source === "reports" && usage.reports.length > 1 && (
              <Stack gap={2} style={{ marginTop: "0.75rem" }}>
                {usage.reports.slice(0, 8).map((r) => (
                  <p key={`${r.orgId}-${r.productCode}`} className="cds--type-body-01" style={SUBTLE}>
                    {`${r.orgName}: ${fmtBytes(r.storageUsedBytes)}`}
                  </p>
                ))}
              </Stack>
            )}
          </div>
        )}

        <div>
          <h3 className="cds--type-heading-03" style={{ margin: "0 0 0.5rem" }}>Licenses by status</h3>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {Object.entries(data.byStatus).map(([status, n]) => (
              <StatusDot key={status} color={STATUS_COLOR[status] ?? "gray"} label={`${STATUS_LABEL[status] ?? status}: ${n}`} />
            ))}
          </div>
        </div>

        {data.byProduct.length > 0 && (
          <div>
            <h3 className="cds--type-heading-03" style={{ margin: "0 0 0.5rem" }}>Licenses by product</h3>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {data.byProduct.map((p) => (
                <Tag key={p.code} type="outline">{`${p.name}: ${p.n}`}</Tag>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="cds--type-heading-03" style={{ margin: "0 0 0.5rem" }}>Expiring in the next 30 days</h3>
          <DataGrid
            rows={data.expiringSoon}
            columns={expiringColumns}
            getRowId={(r) => r.id}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </div>

        <div>
          <h3 className="cds--type-heading-03" style={{ margin: "0 0 0.5rem" }}>Recent license activity</h3>
          <DataGrid
            rows={data.recentEvents}
            columns={eventColumns}
            getRowId={(r) => r.id}
            density="compact"
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </div>
      </Stack>
    </CarbonScope>
  );
}
