import { CurrencyRupee, Money, Receipt, Wallet } from "@carbon/icons-react";
import {
  Column,
  Grid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { listExpenses } from "../../../lib/actions/expenses";
import { AddExpenseForm } from "../../../components/aorms/AddExpenseForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { ExpenseRowActions } from "../../../components/aorms/ExpenseRowActions";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";

// Roles with has_capability('write') — see migration
// 0086_accounts_and_expenses.sql's "expenses: staff create draft" /
// "expenses: staff update draft" policies, mirrored the same way every
// other page in this app mirrors its own RLS write gate.
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);
// has_capability('finance:ops') — "expenses: finance approve". Kept
// separate from canWrite: finance:ops is strictly narrower (rank >= 80,
// or the explicit ACCOUNTANT allow-list role) and gates
// audit/close/mark-recovered, not just create/submit.
const FINANCE_OPS_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT"]);

const STATUS_TAG: Record<string, "gray" | "blue" | "cyan" | "green" | "red"> = {
  DRAFT: "gray",
  SUBMITTED: "blue",
  AUDITED: "cyan",
  CLOSED: "green",
  REJECTED: "red",
};

function formatInr(paise: number | null): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

type ExpenseRow = {
  id: string;
  ref: string;
  scope: string;
  project_id: string | null;
  billing_class: string;
  category: string;
  payment_method: string;
  amount_paise: number;
  expense_date: string;
  payee: string | null;
  status: string;
  recovery_status: string;
  project_offices: { title: string } | { title: string }[] | null;
  accounts: { name: string } | { name: string }[] | null;
};

function ExpensesTable({
  rows,
  canWrite,
  hasFinanceOps,
  projectInvoices,
}: {
  rows: ExpenseRow[];
  canWrite: boolean;
  hasFinanceOps: boolean;
  projectInvoices: { id: string; ref: string; project_id: string }[];
}) {
  return (
    <Table aria-label="Expenses" className="aorms-table-spaced">
      <TableHead>
        <TableRow>
          <TableHeader>Ref</TableHeader>
          <TableHeader>Date</TableHeader>
          <TableHeader>Category</TableHeader>
          <TableHeader>Scope / Project</TableHeader>
          <TableHeader>Payee</TableHeader>
          <TableHeader>Account</TableHeader>
          <TableHeader>Amount</TableHeader>
          <TableHeader>Status</TableHeader>
          <TableHeader>Recovery</TableHeader>
          <TableHeader>Actions</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => {
          const project = Array.isArray(row.project_offices) ? row.project_offices[0] : row.project_offices;
          const account = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
          return (
            <TableRow key={row.id}>
              <TableCell>{row.ref}</TableCell>
              <TableCell>{row.expense_date}</TableCell>
              <TableCell>{row.category.replace(/_/g, " ")}</TableCell>
              <TableCell>{row.scope === "PROJECT" ? project?.title ?? "—" : "Office"}</TableCell>
              <TableCell>{row.payee ?? "—"}</TableCell>
              <TableCell>{account?.name ?? "—"}</TableCell>
              <TableCell>{formatInr(row.amount_paise)}</TableCell>
              <TableCell>
                <Tag type={STATUS_TAG[row.status] ?? "gray"} size="sm">
                  {row.status}
                </Tag>
              </TableCell>
              <TableCell>{row.billing_class === "BILLABLE" ? row.recovery_status : "—"}</TableCell>
              <TableCell>
                <ExpenseRowActions
                  expenseId={row.id}
                  status={row.status}
                  scope={row.scope}
                  billingClass={row.billing_class}
                  projectId={row.project_id}
                  canWrite={canWrite}
                  hasFinanceOps={hasFinanceOps}
                  projectInvoices={projectInvoices}
                />
              </TableCell>
            </TableRow>
          );
        })}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={10}>
              <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                No expenses yet.
              </p>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: expenses, error }, { data: projects }, { data: accounts }, { data: invoices }, { data: myProfile }] =
    await Promise.all([
      listExpenses(),
      supabase.from("project_offices").select("id, title").order("title"),
      supabase.from("accounts").select("id, code, name").order("code"),
      supabase.from("invoices").select("id, ref, project_id"),
      user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

  const canWrite = !!myProfile && WRITE_TIER_ROLES.has(myProfile.role);
  const hasFinanceOps = !!myProfile && FINANCE_OPS_ROLES.has(myProfile.role);

  const rows = (expenses ?? []) as ExpenseRow[];
  const cashRows = rows.filter((r) => r.payment_method === "CASH");
  const projectInvoices = invoices ?? [];

  const closedTotalPaise = rows.filter((r) => r.status === "CLOSED").reduce((sum, r) => sum + r.amount_paise, 0);
  const pendingRecoveryCount = rows.filter((r) => r.recovery_status === "PENDING").length;
  const cashTotalPaise = cashRows.filter((r) => r.status === "CLOSED").reduce((sum, r) => sum + r.amount_paise, 0);

  return (
    <ContextPanelLayout>
      {canWrite && (
        <ContextPanel title="Record expense" description="Office or project expense — cash, bank, card, or UPI.">
          <AddExpenseForm projects={projects ?? []} accounts={accounts ?? []} />
        </ContextPanel>
      )}
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Office Expenses / Cash Book"
              description="Office and project expenses, receipts, and recovery tracking."
              actions={canWrite ? <ContextPanelTrigger size="sm">Record expense</ContextPanelTrigger> : undefined}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total records" value={rows.length} icon={Receipt} />
              <KpiTile label="Closed total" value={formatInr(closedTotalPaise)} icon={CurrencyRupee} />
              <KpiTile label="Pending recovery" value={pendingRecoveryCount} icon={Money} />
              <KpiTile label="Cash total" value={formatInr(cashTotalPaise)} icon={Wallet} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load expenses: {error.message}
              </p>
            ) : (
              <Tabs>
                <TabList aria-label="Expense views">
                  <Tab>Office Expenses</Tab>
                  <Tab>Cash Book</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel>
                    <ExpensesTable rows={rows} canWrite={canWrite} hasFinanceOps={hasFinanceOps} projectInvoices={projectInvoices} />
                  </TabPanel>
                  <TabPanel>
                    <ExpensesTable
                      rows={cashRows}
                      canWrite={canWrite}
                      hasFinanceOps={hasFinanceOps}
                      projectInvoices={projectInvoices}
                    />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            )}
          </Column>
        </Grid>
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
