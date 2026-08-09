import { useEffect, useState } from "react";
import {
  Box,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
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

function Kpi({ label, value, tone, onClick }: { label: string; value: number | string; tone?: "warn" | "default"; onClick?: () => void }) {
  const warn = tone === "warn" && Number(value) > 0;
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, height: "100%", cursor: onClick ? "pointer" : undefined }}
      onClick={onClick}
    >
      <Typography variant="body2" color="text.secondary" sx={{ m: 0 }}>{label}</Typography>
      <Typography
        variant="h5"
        sx={{ mt: 0.5, mb: 0, color: warn ? "warning.main" : undefined }}
      >
        {value}
      </Typography>
    </Paper>
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
    <Stack spacing={2.5}>
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
        <Box>
          <Typography variant="h6" component="h3" sx={{ m: 0, mb: 1 }}>
            {usage.source === "reports"
              ? `Metered usage — ${usage.reportedOrgCount} org${usage.reportedOrgCount === 1 ? "" : "s"} reported`
              : "Metered usage — this workspace"}
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
              <Typography variant="body2" color="text.secondary" sx={{ m: 0 }}>Storage used</Typography>
              <Typography variant="h5" sx={{ my: 0.5 }}>{fmtBytes(usage.storageUsedBytes)}</Typography>
              <Box sx={{ my: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={storagePct}
                  color={storagePct >= 90 ? "error" : "primary"}
                  aria-label="Storage used"
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ m: 0 }}>
                {storagePct.toFixed(1)}% of {fmtBytes(usage.storageQuotaBytes)}
                {usage.storagePurchasedBytes > 0 &&
                  ` (incl. ${fmtBytes(usage.storagePurchasedBytes)} add-on)`}
              </Typography>
            </Paper>
          </Box>
          {usage.source === "reports" && usage.reports.length > 1 && (
            <Stack spacing={0.5} sx={{ mt: 1.5 }}>
              {usage.reports.slice(0, 8).map((r) => (
                <Typography key={`${r.orgId}-${r.productCode}`} variant="body2" color="text.secondary" sx={{ m: 0 }}>
                  {`${r.orgName}: ${fmtBytes(r.storageUsedBytes)}`}
                </Typography>
              ))}
            </Stack>
          )}
        </Box>
      )}

      <Box>
        <Typography variant="h6" component="h3" sx={{ m: 0, mb: 1 }}>Licenses by status</Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {Object.entries(data.byStatus).map(([status, n]) => (
            <StatusDot key={status} color={STATUS_COLOR[status] ?? "gray"} label={`${STATUS_LABEL[status] ?? status}: ${n}`} />
          ))}
        </Box>
      </Box>

      {data.byProduct.length > 0 && (
        <Box>
          <Typography variant="h6" component="h3" sx={{ m: 0, mb: 1 }}>Licenses by product</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {data.byProduct.map((p) => (
              <Chip key={p.code} variant="outlined" size="small" label={`${p.name}: ${p.n}`} />
            ))}
          </Box>
        </Box>
      )}

      <Box>
        <Typography variant="h6" component="h3" sx={{ m: 0, mb: 1 }}>Expiring in the next 30 days</Typography>
        <DataGrid
          rows={data.expiringSoon}
          columns={expiringColumns}
          getRowId={(r) => r.id}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </Box>

      <Box>
        <Typography variant="h6" component="h3" sx={{ m: 0, mb: 1 }}>Recent license activity</Typography>
        <DataGrid
          rows={data.recentEvents}
          columns={eventColumns}
          getRowId={(r) => r.id}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </Box>
    </Stack>
  );
}
