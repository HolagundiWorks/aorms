"use server";

import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { createClient } from "../supabase/server";
import { createServiceRoleClient } from "../supabase/service";
import { parseAndMatchFile, type ColumnMapping } from "../reconcile/match";
import { toSafeErrorMessage } from "../security/safe-error";

export type ReconcileActionState = { error: string } | null;

// Not exported — "use server" files may only export async functions
// (plus the type below, exempted since it's type-only and erased at
// build time); next build enforces this even though tsc alone doesn't
// (see CLAUDE.md's own standing rule on this exact gap).
const RECONCILE_BUCKET = "esti-reconcile";
const MAX_RECONCILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

/**
 * Roles with `has_capability('finance:ops')` (rank >= 80, or the explicit
 * ACCOUNTANT allow-list role) — reconciliation has a single uniform gate
 * (migration 0087_reconcile.sql's "reconcile: finance ops" policy, no
 * read/write split), mirrored here as defense in depth the same way
 * every other Server Action in this codebase mirrors its own RLS gate.
 */
const FINANCE_OPS_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT"]);

async function requireFinanceOps(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ error: string } | { ok: true }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !FINANCE_OPS_ROLES.has(profile.role)) {
    return { error: "Only finance/ownership roles can manage reconciliation." };
  }
  return { ok: true };
}

function parseColumnMapping(raw: string | null): ColumnMapping | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const mapping: ColumnMapping = {};
    if (typeof parsed.date === "string" && parsed.date.trim()) mapping.date = parsed.date.trim();
    if (typeof parsed.description === "string" && parsed.description.trim()) mapping.description = parsed.description.trim();
    if (typeof parsed.amount === "string" && parsed.amount.trim()) mapping.amount = parsed.amount.trim();
    return Object.keys(mapping).length ? mapping : null;
  } catch {
    return null;
  }
}

/**
 * The upload dialog's 3 optional column-override inputs are 3 plain
 * named fields (`mapDate`/`mapDescription`/`mapAmount`), not a single
 * JSON blob — a native `<Form action={formAction}>` submission (this
 * codebase's standard Server Action form pattern, see
 * NewPurchaseOrderForm.tsx) has no client-side JS step to serialize 3
 * inputs into one JSON string before submit, so a real form field per
 * override is simpler and just as expressive. A `columnMapping` JSON
 * string field is still accepted too (parseColumnMapping above), for any
 * future non-form caller.
 */
function columnMappingFromDiscreteFields(formData: FormData): ColumnMapping | null {
  const mapping: ColumnMapping = {};
  const date = String(formData.get("mapDate") ?? "").trim();
  const description = String(formData.get("mapDescription") ?? "").trim();
  const amount = String(formData.get("mapAmount") ?? "").trim();
  if (date) mapping.date = date;
  if (description) mapping.description = description;
  if (amount) mapping.amount = amount;
  return Object.keys(mapping).length ? mapping : null;
}

/** Fetches this firm's own open (ISSUED) invoices — RLS-scoped via the
 * normal, caller's client, same access an authenticated finance-ops user
 * already has on /invoices itself. */
async function fetchOpenInvoices(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase.from("invoices").select("id, ref, grand_total_paise, net_receivable_paise").eq("status", "ISSUED");
}

export async function uploadReconcileBatch(
  _prev: ReconcileActionState,
  formData: FormData,
): Promise<ReconcileActionState> {
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Label is required." };

  const columnMapping =
    parseColumnMapping(typeof formData.get("columnMapping") === "string" ? (formData.get("columnMapping") as string) : null) ??
    columnMappingFromDiscreteFields(formData);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "A statement file is required." };
  if (file.size > MAX_RECONCILE_BYTES) return { error: "File is too large (10MB max)." };
  const lowerName = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    return { error: "File must be a .csv, .xlsx, or .xls statement export." };
  }

  const supabase = await createClient();
  const gate = await requireFinanceOps(supabase);
  if ("error" in gate) return { error: gate.error };

  const fileBuf = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(fileBuf).digest("hex");
  const ext = lowerName.slice(lowerName.lastIndexOf("."));
  const storageKey = `${fileHash}${ext}`;

  // Same division of labor as lib/drawings/upload.ts: this caller-scoped
  // client authorizes/inserts the `reconcile` row (below); only the
  // Storage write itself goes through the service-role client.
  const serviceClient = createServiceRoleClient();
  const { error: uploadError } = await serviceClient.storage
    .from(RECONCILE_BUCKET)
    .upload(storageKey, fileBuf, { upsert: true });
  if (uploadError) return { error: `Storage upload failed: ${uploadError.message}` };

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "reconcile",
    p_default_prefix: "RCN",
  });
  if (refError) return { error: `Could not mint a reference: ${toSafeErrorMessage(refError)}` };

  const { data: inserted, error: insertError } = await supabase
    .from("reconcile")
    .insert({
      ref: refData,
      label,
      file_name: file.name,
      file_hash: fileHash,
      storage_key: storageKey,
      size_bytes: fileBuf.length,
      status: "PENDING",
      column_mapping: columnMapping,
    })
    .select("id")
    .single();
  if (insertError) return { error: toSafeErrorMessage(insertError) };

  const { data: openInvoices, error: invoicesError } = await fetchOpenInvoices(supabase);
  if (invoicesError) {
    await supabase
      .from("reconcile")
      .update({ status: "FAILED", error_text: toSafeErrorMessage(invoicesError), updated_at: new Date().toISOString() })
      .eq("id", inserted.id);
    return { error: toSafeErrorMessage(invoicesError) };
  }

  // No queue — parsing/matching runs synchronously inside this Server
  // Action (already-made architecture decision).
  const result = parseAndMatchFile(fileBuf, file.name, columnMapping, openInvoices ?? []);

  if (result.error) {
    await supabase
      .from("reconcile")
      .update({ status: "FAILED", error_text: result.error, updated_at: new Date().toISOString() })
      .eq("id", inserted.id);
  } else {
    await supabase
      .from("reconcile")
      .update({
        status: "READY",
        row_count: result.rows,
        matched_count: result.matched,
        unmatched_count: result.unmatched,
        total_credit_paise: result.totalCreditPaise,
        matched_credit_paise: result.matchedCreditPaise,
        lines: result.lines,
        error_text: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inserted.id);
  }

  await supabase.rpc("write_audit", {
    p_entity: "reconcile",
    p_entity_id: inserted.id,
    p_action: "UPLOAD",
    p_before: null,
    p_after: { ref: refData, label, fileName: file.name, status: result.error ? "FAILED" : "READY" },
  });

  revalidatePath("/reconcile");
  return null;
}

export async function settleReconcileBatch(
  id: string,
): Promise<{ error?: string; applied?: number; settled?: number; skipped?: number; alreadyApplied?: number }> {
  const supabase = await createClient();
  const gate = await requireFinanceOps(supabase);
  if ("error" in gate) return { error: gate.error };

  const { data, error } = await supabase.rpc("settle_reconcile_batch", { p_reconcile_id: id });
  if (error) return { error: toSafeErrorMessage(error) };

  const result = (data ?? {}) as { applied?: number; settled?: number; skipped?: number; alreadyApplied?: number };

  revalidatePath("/reconcile");
  revalidatePath(`/reconcile/${id}`);
  revalidatePath("/invoices");
  return {
    applied: result.applied ?? 0,
    settled: result.settled ?? 0,
    skipped: result.skipped ?? 0,
    alreadyApplied: result.alreadyApplied ?? 0,
  };
}

export async function setReconcileColumnMapping(id: string, mapping: ColumnMapping): Promise<{ error?: string }> {
  const supabase = await createClient();
  const gate = await requireFinanceOps(supabase);
  if ("error" in gate) return { error: gate.error };

  const { data: batch, error: fetchError } = await supabase
    .from("reconcile")
    .select("storage_key, file_name")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return { error: toSafeErrorMessage(fetchError) };
  if (!batch) return { error: "Reconciliation batch not found." };

  const serviceClient = createServiceRoleClient();
  const { data: fileBlob, error: downloadError } = await serviceClient.storage.from(RECONCILE_BUCKET).download(batch.storage_key);
  if (downloadError) return { error: `Could not re-read the stored file: ${downloadError.message}` };
  const fileBuf = Buffer.from(await fileBlob.arrayBuffer());

  const cleanMapping: ColumnMapping = {};
  if (mapping.date?.trim()) cleanMapping.date = mapping.date.trim();
  if (mapping.description?.trim()) cleanMapping.description = mapping.description.trim();
  if (mapping.amount?.trim()) cleanMapping.amount = mapping.amount.trim();
  const mappingOrNull = Object.keys(cleanMapping).length ? cleanMapping : null;

  const { data: openInvoices, error: invoicesError } = await fetchOpenInvoices(supabase);
  if (invoicesError) return { error: toSafeErrorMessage(invoicesError) };

  const result = parseAndMatchFile(fileBuf, batch.file_name, mappingOrNull, openInvoices ?? []);

  if (result.error) {
    await supabase
      .from("reconcile")
      .update({ status: "FAILED", error_text: result.error, column_mapping: mappingOrNull, updated_at: new Date().toISOString() })
      .eq("id", id);
    return { error: result.error };
  }

  await supabase
    .from("reconcile")
    .update({
      status: "READY",
      row_count: result.rows,
      matched_count: result.matched,
      unmatched_count: result.unmatched,
      total_credit_paise: result.totalCreditPaise,
      matched_credit_paise: result.matchedCreditPaise,
      lines: result.lines,
      column_mapping: mappingOrNull,
      error_text: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/reconcile");
  revalidatePath(`/reconcile/${id}`);
  return {};
}
