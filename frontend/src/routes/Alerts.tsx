import { SkeletonPlaceholder, SkeletonText, Stack } from "@carbon/react";
import { Link as RouterLink } from "react-router-dom";
import { CarbonScope } from "../carbon/CarbonScope.js";
import {
  DataGrid,
  DataState,
  PageBreadcrumb,
  StatusDot,
  type GridColDef,
} from "../carbon/adapters/index.js";
import { RailLayout } from "../components/RailLayout.js";
import { trpc } from "../lib/trpc.js";

const KIND_LABEL: Record<string, string> = {
  approval: "Client decision",
  followup: "Follow-up",
  permit: "Permit",
  submission: "Portal request",
  task: "Overdue task",
  leave: "Leave impact",
  tender: "Tender closing",
  construction: "Site coordination",
};

type AlertRow = {
  id: string;
  kind: string;
  severity: string;
  title: string;
  detail: string;
  projectId: string | null;
  projectRef: string | null;
  date: string | null;
};

const SEVERITY_COLOR: Record<string, string> = {
  high: "red",
  medium: "magenta",
};

function AlertTable({ title, alerts }: { title: string; alerts: AlertRow[] }) {
  const columns: GridColDef<AlertRow>[] = [
    {
      field: "severity",
      headerName: "Severity",
      width: 120,
      renderCell: (p) => {
        const color = SEVERITY_COLOR[p.row.severity] ?? "gray";
        return <StatusDot color={color} label={p.row.severity} />;
      },
    },
    {
      field: "kind",
      headerName: "Type",
      width: 160,
      valueGetter: (_v, row) => KIND_LABEL[row.kind] ?? row.kind,
    },
    {
      field: "title",
      headerName: "Alert",
      flex: 2,
      minWidth: 240,
      renderCell: (p) => (
        <div style={{ padding: "0.25rem 0" }}>
          <p className="cds--type-body-01" style={{ margin: 0 }}>{p.row.title}</p>
          <p className="cds--type-label-01" style={{ margin: 0, color: "var(--cds-text-secondary)" }}>
            {p.row.detail}
          </p>
        </div>
      ),
    },
    {
      field: "projectRef",
      headerName: "Project",
      width: 140,
      renderCell: (p) =>
        p.row.projectId && p.row.projectRef ? (
          <RouterLink to={`/projects/${p.row.projectId}`} className="cds--link">
            {p.row.projectRef}
          </RouterLink>
        ) : (
          "—"
        ),
    },
    {
      field: "date",
      headerName: "Date",
      width: 140,
      valueGetter: (_v, row) => row.date ?? "—",
    },
  ];

  return (
    <Stack gap={3}>
      <p className="cds--type-heading-compact-01" style={{ margin: 0 }}>{title}</p>
      <DataState
        loading={false}
        isEmpty={alerts.length === 0}
        columnCount={5}
        empty={{ title: "Nothing in this view", description: "No alerts to show here." }}
      >
        <DataGrid
          rows={alerts}
          columns={columns}
          getRowHeight={() => "auto"}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />
      </DataState>
    </Stack>
  );
}

export function Alerts() {
  const alertsQ = trpc.notifications.list.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 2,
    meta: { silent: true },
  });
  const digestQ = trpc.notifications.digest.useQuery(undefined, {
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
    retry: 2,
    meta: { silent: true },
  });
  const alerts = alertsQ.data ?? [];
  const digest = digestQ.data;

  if (alertsQ.isLoading && alertsQ.data == null) {
    return (
      <RailLayout
        title="Alerts"
        description="Immediate items needing action, plus a daily digest of lower-priority follow-ups."
      >
        <PageBreadcrumb items={[{ label: "Alerts" }]} />
        <CarbonScope>
          <Stack gap={5} aria-busy="true" aria-label="Loading alerts">
            <SkeletonText width="180px" heading />
            <SkeletonPlaceholder style={{ height: 220, width: "100%" }} />
          </Stack>
        </CarbonScope>
      </RailLayout>
    );
  }

  return (
    <RailLayout
      title="Alerts"
      description="Immediate items needing action, plus a daily digest of lower-priority follow-ups."
    >
      <PageBreadcrumb items={[{ label: "Alerts" }]} />
      <CarbonScope>
        <Stack gap={6}>
          <AlertTable title={`Immediate action (${alerts.length})`} alerts={alerts} />

          {digest && (
            <>
              <hr style={{ border: 0, borderTop: "1px solid var(--cds-border-subtle)", margin: 0 }} />
              <Stack gap={4}>
                <h3 className="cds--type-heading-03" style={{ margin: 0 }}>
                  Daily digest · {digest.date}
                </h3>
                <p className="cds--type-body-01" style={{ margin: 0 }}>
                  Medium-priority follow-ups and upcoming leave — configured in Company → Alert
                  escalation.
                </p>
                <AlertTable title={`Digest items (${digest.count})`} alerts={digest.items} />
              </Stack>
            </>
          )}
        </Stack>
      </CarbonScope>
    </RailLayout>
  );
}
