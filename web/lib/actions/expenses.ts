"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { uploadReceiptFile } from "../receipts/upload";
import { toSafeErrorMessage } from "../security/safe-error";

export type ExpenseActionState = { error: string } | null;

/**
 * Roles with `has_capability('write')` (rank >= 40, or an explicit
 * allow-list role) — same set web/lib/actions/purchase-orders.ts's
 * WRITE_TIER_ROLES uses, mirrored here as an explicit, friendly-error
 * check in the Server Action (defense in depth): the real authorization
 * boundary is RLS (`expenses: staff create draft` / `expenses: staff
 * update draft`, migration 0086_accounts_and_expenses.sql).
 */
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

/**
 * Roles with `has_capability('finance:ops')` (rank >= 80, or the explicit
 * ACCOUNTANT allow-list role — see migration 0002_capability_helper.sql).
 * Gates the four state-transition functions below (submit is the one
 * exception — any write-tier staff member can submit their own draft,
 * matching migration 0086's "expenses: staff update draft" policy, which
 * intentionally allows exactly the DRAFT->SUBMITTED step without
 * requiring finance:ops).
 */
const FINANCE_OPS_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT"]);

const CATEGORIES = new Set(["TRAVEL", "FOOD", "ACCOMMODATION", "MISC", "INVOICING_COST"]);
const PAYMENT_METHODS = new Set(["CASH", "BANK", "CARD", "UPI"]);
const BILLING_CLASSES = new Set(["BILLABLE", "NON_BILLABLE"]);

async function requireProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ error: string } | { userId: string; role: string; firmId: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const { data: profile } = await supabase.from("profiles").select("role, firm_id").eq("id", user.id).maybeSingle();
  if (!profile) return { error: "Profile not found." };
  return { userId: user.id, role: profile.role as string, firmId: profile.firm_id as string | null };
}

export async function createExpenseRecord(
  _prev: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const scope = String(formData.get("scope") ?? "").trim();
  const projectIdRaw = String(formData.get("projectId") ?? "").trim();
  const billingClass = String(formData.get("billingClass") ?? "NON_BILLABLE").trim() || "NON_BILLABLE";
  const category = String(formData.get("category") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const accountIdRaw = String(formData.get("accountId") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const expenseDate = String(formData.get("expenseDate") ?? "").trim();
  const payee = String(formData.get("payee") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (scope !== "OFFICE" && scope !== "PROJECT") return { error: "Scope must be Office or Project." };
  if (scope === "PROJECT" && !projectIdRaw) return { error: "Project is required for a project expense." };
  const projectId = scope === "PROJECT" ? projectIdRaw : null;
  if (!BILLING_CLASSES.has(billingClass)) return { error: "Invalid billing class." };
  if (!CATEGORIES.has(category)) return { error: "Invalid category." };
  if (!PAYMENT_METHODS.has(paymentMethod)) return { error: "Invalid payment method." };

  const amountPaise = amountRaw ? Math.round(Number(amountRaw) * 100) : NaN;
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) return { error: "Amount must be a positive number." };
  if (!expenseDate) return { error: "Expense date is required." };

  const supabase = await createClient();
  const gate = await requireProfile(supabase);
  if ("error" in gate) return { error: gate.error };
  if (!WRITE_TIER_ROLES.has(gate.role)) {
    return { error: "You don't have permission to record expenses — contact a firm owner or partner." };
  }
  if (!gate.firmId) return { error: "No active firm on your profile — contact a firm owner." };

  // Seed this firm's default chart of accounts on its very first expense
  // (migration 0086's ensure_default_accounts()) — never assume it's
  // already there.
  const { count: accountCount } = await supabase.from("accounts").select("id", { count: "exact", head: true });
  if (!accountCount) {
    const { error: seedError } = await supabase.rpc("ensure_default_accounts", { p_firm_id: gate.firmId });
    if (seedError) return { error: `Could not set up the chart of accounts: ${toSafeErrorMessage(seedError)}` };
  }

  let accountId = accountIdRaw || null;
  if (!accountId) {
    const defaultCode = paymentMethod === "CASH" ? "CASH" : scope === "OFFICE" ? "OFFICE_EXPENSE" : "PROJECT_EXPENSE";
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("code", defaultCode)
      .maybeSingle();
    if (accountError) return { error: toSafeErrorMessage(accountError) };
    if (!account) return { error: `Default account "${defaultCode}" not found.` };
    accountId = account.id;
  }

  let receiptKey: string | null = null;
  const file = formData.get("receipt");
  if (file instanceof File && file.size > 0) {
    const uploadResult = await uploadReceiptFile(file);
    if ("error" in uploadResult) return { error: uploadResult.error };
    receiptKey = uploadResult.storageKey;
  }

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "expense",
    p_default_prefix: "EXP",
  });
  if (refError) return { error: `Could not mint a reference: ${toSafeErrorMessage(refError)}` };

  const recoveryStatus = scope === "PROJECT" && billingClass === "BILLABLE" ? "PENDING" : "NA";

  const { data: inserted, error } = await supabase
    .from("expenses")
    .insert({
      ref: refData,
      scope,
      project_id: projectId,
      billing_class: billingClass,
      category,
      payment_method: paymentMethod,
      account_id: accountId,
      amount_paise: amountPaise,
      expense_date: expenseDate,
      payee,
      description,
      receipt_key: receiptKey,
      status: "DRAFT",
      recovery_status: recoveryStatus,
      notes,
    })
    .select("id")
    .single();
  if (error) return { error: toSafeErrorMessage(error) };

  await supabase.rpc("write_audit", {
    p_entity: "expense",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, scope, projectId, category, amountPaise },
  });

  revalidatePath("/accounts");
  return null;
}

export async function updateExpenseRecord(
  id: string,
  _prev: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const scope = String(formData.get("scope") ?? "").trim();
  const projectIdRaw = String(formData.get("projectId") ?? "").trim();
  const billingClass = String(formData.get("billingClass") ?? "NON_BILLABLE").trim() || "NON_BILLABLE";
  const category = String(formData.get("category") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const expenseDate = String(formData.get("expenseDate") ?? "").trim();
  const payee = String(formData.get("payee") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (scope !== "OFFICE" && scope !== "PROJECT") return { error: "Scope must be Office or Project." };
  if (scope === "PROJECT" && !projectIdRaw) return { error: "Project is required for a project expense." };
  const projectId = scope === "PROJECT" ? projectIdRaw : null;
  if (!BILLING_CLASSES.has(billingClass)) return { error: "Invalid billing class." };
  if (!CATEGORIES.has(category)) return { error: "Invalid category." };
  if (!PAYMENT_METHODS.has(paymentMethod)) return { error: "Invalid payment method." };

  const amountPaise = amountRaw ? Math.round(Number(amountRaw) * 100) : NaN;
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) return { error: "Amount must be a positive number." };
  if (!expenseDate) return { error: "Expense date is required." };

  const supabase = await createClient();
  const gate = await requireProfile(supabase);
  if ("error" in gate) return { error: gate.error };
  if (!WRITE_TIER_ROLES.has(gate.role)) {
    return { error: "You don't have permission to edit expenses — contact a firm owner or partner." };
  }

  // RLS ("expenses: staff update draft") already backstops this — the
  // explicit .eq("status", "DRAFT") here just turns a silent RLS denial
  // into a clear "already submitted" error instead of a generic one.
  const { data: updated, error } = await supabase
    .from("expenses")
    .update({
      scope,
      project_id: projectId,
      billing_class: billingClass,
      category,
      payment_method: paymentMethod,
      amount_paise: amountPaise,
      expense_date: expenseDate,
      payee,
      description,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "DRAFT")
    .select("id")
    .maybeSingle();
  if (error) return { error: toSafeErrorMessage(error) };
  if (!updated) return { error: "This expense can only be edited while it's still a draft." };

  revalidatePath("/accounts");
  return null;
}

export async function submitExpense(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const gate = await requireProfile(supabase);
  if ("error" in gate) return { error: gate.error };
  if (!WRITE_TIER_ROLES.has(gate.role)) {
    return { error: "You don't have permission to submit expenses — contact a firm owner or partner." };
  }

  const { data: expense, error } = await supabase
    .from("expenses")
    .update({ status: "SUBMITTED", submitted_by_id: gate.userId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "DRAFT")
    .select("ref")
    .maybeSingle();
  if (error) return { error: toSafeErrorMessage(error) };
  if (!expense) return { error: "Already submitted, or not found." };

  await supabase.rpc("write_audit", {
    p_entity: "expense",
    p_entity_id: id,
    p_action: "SUBMIT",
    p_before: { status: "DRAFT" },
    p_after: { status: "SUBMITTED" },
  });

  revalidatePath("/accounts");
  return {};
}

const AUDIT_DECISIONS = new Set(["AUDITED", "REJECTED"]);

export async function auditExpense(id: string, decision: string, notes?: string): Promise<{ error?: string }> {
  if (!AUDIT_DECISIONS.has(decision)) return { error: "Invalid decision." };

  const supabase = await createClient();
  const gate = await requireProfile(supabase);
  if ("error" in gate) return { error: gate.error };
  if (!FINANCE_OPS_ROLES.has(gate.role)) {
    return { error: "Only finance/ownership roles can audit expenses." };
  }

  const patch: Record<string, unknown> = {
    status: decision,
    audited_by_id: gate.userId,
    audited_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (notes !== undefined) patch.notes = notes;

  const { data: expense, error } = await supabase
    .from("expenses")
    .update(patch)
    .eq("id", id)
    .eq("status", "SUBMITTED")
    .select("ref")
    .maybeSingle();
  if (error) return { error: toSafeErrorMessage(error) };
  if (!expense) return { error: "Not awaiting audit, or not found." };

  await supabase.rpc("write_audit", {
    p_entity: "expense",
    p_entity_id: id,
    p_action: decision === "AUDITED" ? "AUDIT_APPROVE" : "AUDIT_REJECT",
    p_before: { status: "SUBMITTED" },
    p_after: { status: decision },
  });

  revalidatePath("/accounts");
  return {};
}

export async function closeExpense(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const gate = await requireProfile(supabase);
  if ("error" in gate) return { error: gate.error };
  if (!FINANCE_OPS_ROLES.has(gate.role)) {
    return { error: "Only finance/ownership roles can close expenses." };
  }

  const { data: expense, error } = await supabase
    .from("expenses")
    .update({ status: "CLOSED", closed_by_id: gate.userId, closed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "AUDITED")
    .select("ref")
    .maybeSingle();
  if (error) return { error: toSafeErrorMessage(error) };
  if (!expense) return { error: "Not awaiting close, or not found." };

  await supabase.rpc("write_audit", {
    p_entity: "expense",
    p_entity_id: id,
    p_action: "CLOSE",
    p_before: { status: "AUDITED" },
    p_after: { status: "CLOSED" },
  });

  revalidatePath("/accounts");
  return {};
}

const RECOVERY_STATUSES = new Set(["PENDING", "INVOICED", "WRITTEN_OFF"]);

export async function markExpenseRecovered(
  id: string,
  recoveryStatus: string,
  invoiceId?: string,
): Promise<{ error?: string }> {
  if (!RECOVERY_STATUSES.has(recoveryStatus)) return { error: "Invalid recovery status." };
  if (recoveryStatus === "INVOICED" && !invoiceId) return { error: "An invoice is required to mark this recovered." };

  const supabase = await createClient();
  const gate = await requireProfile(supabase);
  if ("error" in gate) return { error: gate.error };
  if (!FINANCE_OPS_ROLES.has(gate.role)) {
    return { error: "Only finance/ownership roles can mark expenses recovered." };
  }

  const { data: expense, error } = await supabase
    .from("expenses")
    .update({
      recovery_status: recoveryStatus,
      recovered_on_invoice_id: recoveryStatus === "INVOICED" ? invoiceId : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "CLOSED")
    .eq("billing_class", "BILLABLE")
    .select("ref")
    .maybeSingle();
  if (error) return { error: toSafeErrorMessage(error) };
  if (!expense) return { error: "Only a closed, billable expense can be marked recovered." };

  await supabase.rpc("write_audit", {
    p_entity: "expense",
    p_entity_id: id,
    p_action: "MARK_RECOVERED",
    p_before: null,
    p_after: { recoveryStatus, invoiceId: invoiceId ?? null },
  });

  revalidatePath("/accounts");
  return {};
}

export type ExpenseFilters = {
  scope?: string;
  projectId?: string;
  category?: string;
  billingClass?: string;
  recoveryStatus?: string;
  status?: string;
  paymentMethod?: string;
};

export async function listExpenses(filters: ExpenseFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("expenses")
    .select(
      "id, ref, scope, project_id, billing_class, category, payment_method, amount_paise, expense_date, payee, description, status, recovery_status, account_id, created_at, project_offices(title), accounts(name)",
    )
    .order("expense_date", { ascending: false });

  if (filters.scope) query = query.eq("scope", filters.scope);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.billingClass) query = query.eq("billing_class", filters.billingClass);
  if (filters.recoveryStatus) query = query.eq("recovery_status", filters.recoveryStatus);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.paymentMethod) query = query.eq("payment_method", filters.paymentMethod);

  return query;
}

/** Per-account SUM of CLOSED expenses' amount_paise, optionally bounded
 * to an expense_date range — the account-balances view the Cash Book /
 * Office Expenses page's KPI row reads. Only CLOSED expenses count: a
 * DRAFT/SUBMITTED/AUDITED row is not yet a settled account movement. */
export async function getAccountBalances(periodStart?: string, periodEnd?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("expenses")
    .select("account_id, amount_paise, accounts(code, name, kind)")
    .eq("status", "CLOSED");
  if (periodStart) query = query.gte("expense_date", periodStart);
  if (periodEnd) query = query.lte("expense_date", periodEnd);

  const { data, error } = await query;
  if (error) return { data: null, error };

  const balances = new Map<string, { accountId: string; code: string; name: string; kind: string; totalPaise: number }>();
  for (const row of data ?? []) {
    const account = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
    if (!account) continue;
    const existing = balances.get(row.account_id);
    if (existing) {
      existing.totalPaise += row.amount_paise;
    } else {
      balances.set(row.account_id, {
        accountId: row.account_id,
        code: account.code,
        name: account.name,
        kind: account.kind,
        totalPaise: row.amount_paise,
      });
    }
  }

  return { data: Array.from(balances.values()), error: null };
}

/** CLOSED expenses for one project, split into non-billable / billable-
 * pending / billable-recovered totals — the Project Expenses summary. */
export async function getExpenseSummaryByProject(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("amount_paise, billing_class, recovery_status")
    .eq("project_id", projectId)
    .eq("status", "CLOSED");
  if (error) return { data: null, error };

  let nonBillablePaise = 0;
  let billablePendingPaise = 0;
  let billableRecoveredPaise = 0;
  for (const row of data ?? []) {
    if (row.billing_class !== "BILLABLE") {
      nonBillablePaise += row.amount_paise;
    } else if (row.recovery_status === "INVOICED") {
      billableRecoveredPaise += row.amount_paise;
    } else {
      billablePendingPaise += row.amount_paise;
    }
  }

  return { data: { nonBillablePaise, billablePendingPaise, billableRecoveredPaise }, error: null };
}
