import { Stack, Tab, TabList, Tabs } from "@carbon/react";
import { Download } from "@carbon/icons-react";
import { formatINR } from "@esti/contracts";
import type { PeriodFilterInput } from "@esti/contracts";
import { useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { CarbonScope } from "../carbon/CarbonScope.js";
import { DataGrid, PageBreadcrumb, type GridColDef } from "../carbon/adapters/index.js";
import { RailLayout } from "../components/RailLayout.js";
import { PeriodFilter } from "../components/PeriodFilter.js";
import { downloadXlsx } from "../lib/exportXlsx.js";
import { trpc } from "../lib/trpc.js";

function periodLabel(p: string): string {
  const [y, m] = p.split("-");
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m)] ?? m} ${y}`;
}

const inr = (v: number) => formatINR(v);

const gstColumns: GridColDef[] = [
  { field: "period", headerName: "Period", flex: 1, minWidth: 120, valueFormatter: (v: string) => periodLabel(v) },
  { field: "count", headerName: "Invoices", flex: 1, minWidth: 100, type: "number" },
  { field: "taxable", headerName: "Taxable", flex: 1, minWidth: 140, type: "number", valueFormatter: inr },
  { field: "gst", headerName: "GST", flex: 1, minWidth: 140, type: "number", valueFormatter: inr },
  { field: "grandTotal", headerName: "Grand total", flex: 1, minWidth: 140, type: "number", valueFormatter: inr },
];

const tdsColumns: GridColDef[] = [
  { field: "period", headerName: "Period", flex: 1, minWidth: 120, valueFormatter: (v: string) => periodLabel(v) },
  { field: "count", headerName: "Invoices", flex: 1, minWidth: 100, type: "number" },
  { field: "gross", headerName: "Gross fees", flex: 1, minWidth: 140, type: "number", valueFormatter: inr },
  { field: "tds", headerName: "TDS", flex: 1, minWidth: 140, type: "number", valueFormatter: inr },
  { field: "net", headerName: "Net receivable", flex: 1, minWidth: 140, type: "number", valueFormatter: inr },
];

export function Filing() {
  const [period, setPeriod] = useState<PeriodFilterInput>({ preset: "CURRENT_FY" });
  const [tab, setTab] = useState(0);

  const gst = trpc.reports.gstAbstract.useQuery({ period });
  const tds = trpc.reports.tdsAbstract.useQuery({ period });
  const exportQ = trpc.reports.invoiceRegisterExport.useQuery({ period }, { enabled: false });

  const gstRows = (gst.data?.periods ?? []).map((p) => ({
    id: p.period,
    period: p.period,
    count: p.count,
    taxable: p.taxablePaise,
    gst: p.gstTotalPaise,
    grandTotal: p.invoiceTotalPaise,
  }));

  const tdsRows = (tds.data?.periods ?? []).map((p) => ({
    id: p.period,
    period: p.period,
    count: p.count,
    gross: p.grossPaise,
    tds: p.tdsPaise,
    net: p.netReceivablePaise,
  }));

  async function exportRegister() {
    const r = await exportQ.refetch();
    if (r.data?.rows.length) downloadXlsx(r.data.rows, "Register", `invoice-register-${r.data.from}`);
  }

  useScreenActions(
    gst.data
      ? [
          {
            id: "export-register",
            zone: "right",
            tone: "primary",
            label: "Export register",
            icon: <Download />,
            onClick: () => void exportRegister(),
          },
        ]
      : [],
    [gst.data],
  );

  return (
    <RailLayout
      title="Filing abstracts"
      description="GST output tax (GSTR-1 / GSTR-3B) and TDS deducted u/s 194J, aggregated by month from issued and paid invoices."
      aside={
        <Stack gap={4}>
          <PeriodFilter value={period} onChange={setPeriod} />
          {gst.data && (
            <p className="cds--type-body-01" style={{ margin: 0 }}>
              <strong>{gst.data.label}</strong> · {gst.data.from} to {gst.data.to}
            </p>
          )}
        </Stack>
      }
    >
      <CarbonScope>
        <PageBreadcrumb items={[{ label: "Office" }, { label: "Financial Reports" }]} />
        <Tabs selectedIndex={tab} onChange={({ selectedIndex }) => setTab(selectedIndex)}>
          <TabList aria-label="Filing tabs" contained>
            <Tab>GST abstract</Tab>
            <Tab>TDS abstract</Tab>
          </TabList>
        </Tabs>
        {tab === 0 && (
          <div style={{ marginTop: "1rem" }}>
            <p className="cds--type-heading-compact-01" style={{ margin: "0 0 0.5rem" }}>
              GST by month
            </p>
            <DataGrid rows={gstRows} columns={gstColumns} loading={gst.isLoading} density="compact" autoHeight hideFooter disableRowSelectionOnClick />
          </div>
        )}
        {tab === 1 && (
          <div style={{ marginTop: "1rem" }}>
            <p className="cds--type-heading-compact-01" style={{ margin: "0 0 0.5rem" }}>
              TDS by month
            </p>
            <DataGrid rows={tdsRows} columns={tdsColumns} loading={tds.isLoading} density="compact" autoHeight hideFooter disableRowSelectionOnClick />
          </div>
        )}
      </CarbonScope>
    </RailLayout>
  );
}
