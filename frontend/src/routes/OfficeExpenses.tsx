import {
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  SkeletonPlaceholder,
  Stack,
  TextInput,
  Toggle,
} from "@carbon/react";
import {
  EXPENSE_BILLING_CLASS_LABEL,
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_PAYMENT_METHOD_LABEL,
  EXPENSE_STATUS_LABEL,
  ExpenseCategory,
  ExpensePaymentMethod,
  can,
  formatINR,
  resolvePeriodRange,
  type PeriodFilterInput,
} from "@esti/contracts";
import { useState } from "react";
import { Add } from "@carbon/icons-react";
import { useScreenActions } from "@hcw/ui-kit";
import { CarbonScope } from "../carbon/CarbonScope.js";
import {
  DataGrid,
  PageBreadcrumb,
  StatusDot,
  type GridColDef,
} from "../carbon/adapters/index.js";
import { AccountsCarryForward } from "../components/accounting/AccountsCarryForward.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

const DEFAULT_PERIOD: PeriodFilterInput = { preset: "CURRENT_FY" };

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red" | "teal"> = {
  DRAFT: "gray",
  SUBMITTED: "blue",
  AUDITED: "teal",
  CLOSED: "green",
  REJECTED: "red",
};

type ExpenseRow = {
  id: string;
  ref: string;
  category: string;
  paymentMethod: string;
  amountPaise: number;
  expenseDate: string;
  payee: string | null;
  description: string | null;
  status: string;
};

function LoadingRows() {
  return (
    <Stack gap={2}>
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonPlaceholder key={i} style={{ height: 32, width: "100%" }} />
      ))}
    </Stack>
  );
}

function ExpenseFormModal({
  open,
  scope,
  projectId,
  onClose,
}: {
  open: boolean;
  scope: "OFFICE" | "PROJECT";
  projectId?: string;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const create = trpc.expenses.create.useMutation({
    meta: { errorTitle: "Couldn't save the expense" },
    onSuccess: () => {
      void utils.expenses.list.invalidate();
      void utils.accounts.list.invalidate();
      if (projectId) void utils.expenses.summaryByProject.invalidate({ projectId });
      onClose();
    },
  });

  const [category, setCategory] = useState<string>("MISC");
  const [paymentMethod, setPaymentMethod] = useState<string>("BANK");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [payee, setPayee] = useState("");
  const [description, setDescription] = useState("");
  const [cashVoucher, setCashVoucher] = useState(false);
  const [billable, setBillable] = useState(false);

  const amountPaise = Math.round(parseFloat(amount || "0") * 100);

  return (
    <CarbonScope>
      <Modal
        open={open}
        size="sm"
        modalHeading={scope === "OFFICE" ? "New office expense" : "New project expense"}
        primaryButtonText={create.isPending ? "Saving…" : "Save draft"}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={create.isPending || !amountPaise || amountPaise <= 0}
        onRequestClose={onClose}
        onRequestSubmit={() =>
          create.mutate({
            scope,
            projectId,
            category: category as (typeof ExpenseCategory.options)[number],
            paymentMethod: (cashVoucher ? "CASH" : paymentMethod) as (typeof ExpensePaymentMethod.options)[number],
            amountPaise,
            expenseDate,
            payee: payee || undefined,
            description: description || undefined,
            billingClass: scope === "PROJECT" && billable ? "BILLABLE" : "NON_BILLABLE",
          })
        }
      >
        <Stack gap={5}>
          <Select id="exp-cat" labelText="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {ExpenseCategory.options.map((c) => (
              <SelectItem key={c} value={c} text={EXPENSE_CATEGORY_LABEL[c]} />
            ))}
          </Select>
          <TextInput id="exp-amt" labelText="Amount (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <TextInput id="exp-date" labelText="Expense date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          <TextInput id="exp-payee" labelText="Payee" value={payee} onChange={(e) => setPayee(e.target.value)} />
          <TextInput id="exp-desc" labelText="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Toggle id="exp-cash" labelText="Cash voucher" labelA="No" labelB="Yes" toggled={cashVoucher} onToggle={(v) => setCashVoucher(v)} />
          {!cashVoucher && (
            <Select id="exp-pay" labelText="Payment method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {ExpensePaymentMethod.options.map((m) => (
                <SelectItem key={m} value={m} text={EXPENSE_PAYMENT_METHOD_LABEL[m]} />
              ))}
            </Select>
          )}
          {scope === "PROJECT" && (
            <Toggle
              id="exp-bill"
              labelText={`Billing class — ${billable ? EXPENSE_BILLING_CLASS_LABEL.BILLABLE : EXPENSE_BILLING_CLASS_LABEL.NON_BILLABLE}`}
              labelA="Non-billable"
              labelB="Billable"
              toggled={billable}
              onToggle={(v) => setBillable(v)}
            />
          )}
          {create.error && <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={create.error.message} />}
        </Stack>
      </Modal>
    </CarbonScope>
  );
}

function ExpenseTable({
  rows,
  canManage,
  canAudit,
}: {
  rows: ExpenseRow[];
  canManage: boolean;
  canAudit: boolean;
}) {
  const utils = trpc.useUtils();
  const submit = trpc.expenses.submit.useMutation({
    meta: { errorTitle: "Couldn't submit the expense" },
    onSuccess: () => void utils.expenses.list.invalidate(),
  });
  const audit = trpc.expenses.audit.useMutation({
    meta: { errorTitle: "Couldn't audit the expense" },
    onSuccess: () => {
      void utils.expenses.list.invalidate();
      void utils.accounts.list.invalidate();
    },
  });
  const close = trpc.expenses.close.useMutation({
    meta: { errorTitle: "Couldn't close the expense" },
    onSuccess: () => {
      void utils.expenses.list.invalidate();
      void utils.accounts.list.invalidate();
    },
  });

  const columns: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 0.8, minWidth: 110 },
    { field: "expenseDate", headerName: "Date", flex: 0.8, minWidth: 120 },
    {
      field: "category",
      headerName: "Category",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) =>
        EXPENSE_CATEGORY_LABEL[row.category as keyof typeof EXPENSE_CATEGORY_LABEL] ?? row.category,
    },
    { field: "payee", headerName: "Payee", flex: 1, minWidth: 140, valueGetter: (v) => v ?? "—" },
    {
      field: "amountPaise",
      headerName: "Amount",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => formatINR(p.row.amountPaise),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      renderCell: (p) => (
        <StatusDot
          color={STATUS_TAG[p.row.status] ?? "gray"}
          label={EXPENSE_STATUS_LABEL[p.row.status as keyof typeof EXPENSE_STATUS_LABEL] ?? p.row.status}
        />
      ),
    },
    {
      field: "actions",
      headerName: "",
      width: 60,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <RowActionsMenu
          actions={[
            canManage && p.row.status === "DRAFT" && {
              label: "Submit",
              onClick: () => submit.mutate({ id: p.row.id }),
              disabled: submit.isPending,
            },
            canAudit && p.row.status === "SUBMITTED" && {
              label: "Audit",
              onClick: () => audit.mutate({ id: p.row.id, approved: true }),
              disabled: audit.isPending,
            },
            canAudit && p.row.status === "SUBMITTED" && {
              label: "Reject",
              onClick: () => audit.mutate({ id: p.row.id, approved: false }),
              danger: true,
              disabled: audit.isPending,
            },
            canAudit && p.row.status === "AUDITED" && {
              label: "Close",
              onClick: () => close.mutate({ id: p.row.id }),
              disabled: close.isPending,
            },
          ]}
        />
      ),
    },
  ];

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      density="compact"
      disableRowSelectionOnClick
      hideFooter
      autoHeight
    />
  );
}

export function OfficeExpenses() {
  const { user } = useAuth();
  const canManage = can(user?.role, "invoice:manage");
  const canAudit = can(user?.role, "reports:view");
  const [period, setPeriod] = useState<PeriodFilterInput>(DEFAULT_PERIOD);
  const range = resolvePeriodRange(period);
  const listQ = trpc.expenses.list.useQuery({
    scope: "OFFICE",
    dateFrom: range.from,
    dateTo: range.to,
    limit: 200,
  });
  const [open, setOpen] = useState(false);

  useScreenActions(
    open || !canManage
      ? []
      : [
          {
            id: "new-expense",
            zone: "center",
            tone: "primary",
            label: "New expense",
            icon: <Add />,
            onClick: () => setOpen(true),
          },
        ],
    [open, canManage],
  );

  return (
    <>
      <RailLayout
        title="Office expenses"
        description="Firm overhead not tied to a single project. Always non-billable — separate from client GST invoices."
        aside={<AccountsCarryForward period={period} onPeriodChange={setPeriod} />}
      >
        <PageBreadcrumb items={[{ label: "Office" }, { label: "Office Expenses" }]} />
        {listQ.isLoading && <LoadingRows />}
        {listQ.data && (
          <ExpenseTable rows={listQ.data as ExpenseRow[]} canManage={canManage} canAudit={canAudit} />
        )}
      </RailLayout>
      {open && <ExpenseFormModal open scope="OFFICE" onClose={() => setOpen(false)} />}
    </>
  );
}

export function CashBook() {
  const { user } = useAuth();
  const canManage = can(user?.role, "invoice:manage");
  const canAudit = can(user?.role, "reports:view");
  const [period, setPeriod] = useState<PeriodFilterInput>(DEFAULT_PERIOD);
  const range = resolvePeriodRange(period);
  const accountsQ = trpc.accounts.list.useQuery(period);
  const cashAccount = accountsQ.data?.find((a) => a.code === "CASH");
  const listQ = trpc.expenses.list.useQuery({
    paymentMethod: "CASH",
    accountCode: "CASH",
    dateFrom: range.from,
    dateTo: range.to,
    limit: 200,
  });
  const [open, setOpen] = useState(false);

  useScreenActions(
    open || !canManage
      ? []
      : [
          {
            id: "new-cash-voucher",
            zone: "center",
            tone: "primary",
            label: "New cash voucher",
            icon: <Add />,
            onClick: () => setOpen(true),
          },
        ],
    [open, canManage],
  );

  return (
    <>
      <RailLayout
        title="Cash book"
        description="Petty cash and physical cash outflows. Balance reflects closed cash vouchers in the selected financial year."
        aside={
          <Stack gap={4}>
            <AccountsCarryForward period={period} onPeriodChange={setPeriod} />
            {cashAccount && (
              <p className="cds--type-body-01" style={{ margin: 0, wordBreak: "break-word" }}>
                <strong>Cash balance ({range.label}):</strong>{" "}
                {formatINR(cashAccount.balancePaise)}
              </p>
            )}
          </Stack>
        }
      >
        <PageBreadcrumb items={[{ label: "Office" }, { label: "Cashbook" }]} />
        {listQ.isLoading && <LoadingRows />}
        {listQ.data && (
          <ExpenseTable rows={listQ.data as ExpenseRow[]} canManage={canManage} canAudit={canAudit} />
        )}
      </RailLayout>
      {open && <ExpenseFormModal open scope="OFFICE" onClose={() => setOpen(false)} />}
    </>
  );
}
