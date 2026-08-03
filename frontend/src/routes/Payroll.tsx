import { Modal, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { formatINR, parseRupeeInput } from "@esti/contracts";
import { useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { CarbonScope } from "../carbon/CarbonScope.js";
import {
  DataGrid,
  DataState,
  PageBreadcrumb,
  StatusDot,
  type GridColDef,
} from "../carbon/adapters/index.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { PayslipPdfCell } from "../components/PayslipPdfCell.js";
import { useCapabilities } from "../lib/capabilities.js";
import { trpc } from "../lib/trpc.js";

/** Finance › Payroll — monthly payslips (relocated from HR). Wave 3 (Carbon). */
export function Payroll() {
  const utils = trpc.useUtils();
  const { canSalary } = useCapabilities();
  const payrollQ = trpc.payroll.list.useQuery();
  const teamQ = trpc.team.list.useQuery();
  const team = teamQ.data ?? [];

  const markPaid = trpc.payroll.markPaid.useMutation({
    meta: { errorTitle: "Couldn't mark the payslip as paid" },
    onSuccess: () => utils.payroll.list.invalidate(),
  });

  const [open, setOpen] = useState(false);

  useScreenActions(
    open
      ? []
      : [
          {
            id: "generate-payslip",
            zone: "center",
            tone: "primary",
            label: "Generate payslip",
            icon: <Add />,
            disabled: team.length === 0,
            onClick: () => setOpen(true),
          },
        ],
    [open, team.length],
  );

  const [py, setPy] = useState({ teamMemberId: "", month: "", gross: "", deductions: "" });
  const generate = trpc.payroll.generate.useMutation({
    meta: { errorTitle: "Couldn't generate the payslip" },
    onSuccess: () => {
      utils.payroll.list.invalidate();
      setOpen(false);
      setPy({ teamMemberId: "", month: "", gross: "", deductions: "" });
    },
  });

  const rows = payrollQ.data ?? [];

  const columns: GridColDef[] = [
    { field: "name", headerName: "Member", flex: 1, minWidth: 140 },
    { field: "month", headerName: "Month", flex: 0.8, minWidth: 110 },
    ...(canSalary
      ? ([
          { field: "grossPaise", headerName: "Gross", flex: 0.8, minWidth: 120, type: "number", renderCell: (p) => formatINR(p.row.grossPaise, { paise: false }) },
          { field: "deductionsPaise", headerName: "Deductions", flex: 0.8, minWidth: 120, type: "number", renderCell: (p) => formatINR(p.row.deductionsPaise, { paise: false }) },
          { field: "netPaise", headerName: "Net", flex: 0.8, minWidth: 120, type: "number", renderCell: (p) => formatINR(p.row.netPaise, { paise: false }) },
        ] as GridColDef[])
      : []),
    {
      field: "paid",
      headerName: "Status",
      flex: 0.8,
      minWidth: 130,
      sortable: false,
      renderCell: (p) => (
        <StatusDot
          color={p.row.paid ? "green" : "gray"}
          label={p.row.paid ? `Paid ${p.row.paidDate ?? ""}` : "Unpaid"}
        />
      ),
    },
    {
      field: "action",
      headerName: "",
      width: 60,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <RowActionsMenu actions={[!p.row.paid && { label: "Mark paid", onClick: () => markPaid.mutate({ id: p.row.id }) }]} />
      ),
    },
    {
      field: "slip",
      headerName: "Slip",
      flex: 1,
      minWidth: 160,
      sortable: false,
      filterable: false,
      renderCell: (p) => <PayslipPdfCell payslipId={p.row.id} initialStatus={p.row.pdfStatus} />,
    },
  ];

  return (
    <>
      <RailLayout title="Payroll" description="Monthly payslips — gross, deductions and net pay.">
        <PageBreadcrumb items={[{ label: "Office" }, { label: "Payroll" }]} />
        <DataState
          loading={payrollQ.isLoading}
          isEmpty={rows.length === 0}
          columnCount={5}
          empty={{ title: "No payslips", description: "Generate a monthly payslip for a team member." }}
        >
          <DataGrid rows={rows} columns={columns} density="compact" disableRowSelectionOnClick hideFooter autoHeight />
        </DataState>
      </RailLayout>

      <CarbonScope>
        <Modal
          open={open}
          size="sm"
          modalHeading="Generate payslip"
          primaryButtonText={generate.isPending ? "Generating…" : "Generate"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!py.teamMemberId || !/^\d{4}-\d{2}$/.test(py.month) || generate.isPending}
          onRequestClose={() => setOpen(false)}
          onRequestSubmit={() =>
            generate.mutate({
              teamMemberId: py.teamMemberId,
              month: py.month,
              grossPaise: py.gross ? parseRupeeInput(py.gross) : undefined,
              deductionsPaise: py.deductions ? parseRupeeInput(py.deductions) : 0,
            })
          }
        >
          <Stack gap={5}>
            <Select
              id="py-m"
              labelText="Member"
              value={py.teamMemberId}
              onChange={(e) => setPy((f) => ({ ...f, teamMemberId: e.target.value }))}
            >
              <SelectItem value="" text="Select…" />
              {team.map((m) => (
                <SelectItem key={m.id} value={m.id} text={m.name} />
              ))}
            </Select>
            <TextInput
              id="py-month"
              labelText="Month (YYYY-MM)"
              placeholder="2026-06"
              value={py.month}
              onChange={(e) => setPy((f) => ({ ...f, month: e.target.value }))}
            />
            {canSalary && (
              <TextInput
                id="py-gross"
                labelText="Gross (₹) — defaults to monthly salary"
                value={py.gross}
                onChange={(e) => setPy((f) => ({ ...f, gross: e.target.value }))}
              />
            )}
            {canSalary && (
              <TextInput
                id="py-ded"
                labelText="Deductions (₹)"
                value={py.deductions}
                onChange={(e) => setPy((f) => ({ ...f, deductions: e.target.value }))}
              />
            )}
          </Stack>
        </Modal>
      </CarbonScope>
    </>
  );
}
