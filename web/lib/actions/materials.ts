"use server";

/**
 * AORMS Platform — Material Catalogue Server Actions. Phase C of the
 * Studio/Company split + Material Catalogue plan: a Company (material
 * supplier — see web/lib/actions/company.ts) owns and operates a list of
 * Products, each with a flexible key-value spec list and structured
 * test-result rows. See platform/supabase/migrations/0008_material_catalogue.sql
 * for the schema — RLS itself is the real enforcement (platform-wide read,
 * owning company's OWNER only for writes); these actions don't re-check
 * ownership client-side, they just surface whatever RLS returns.
 *
 * Same house style as platform.ts/company.ts throughout: errors as
 * {error} objects, never thrown; revalidatePath before a successful
 * return; no write_audit (platform-side, no audit_log table there).
 * MRP follows this codebase's integer-paise money convention (see root
 * CLAUDE.md Conventions) — the `mrpPaise` form field actually carries a
 * rupee amount typed by the user, multiplied by 100 before the insert
 * (same naming convention already used by web/lib/actions/rate-books.ts's
 * `ratePaise` field).
 */
import { revalidatePath } from "next/cache";
import { createClient as createPlatformClient } from "../platform/server";
import type { PlatformActionState } from "./platform";

// ── Products ─────────────────────────────────────────────────────────────

export async function addProduct(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const companyId = String(formData.get("companyId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  if (!companyId || !name) return { error: "Product name is required." };
  if (!["BUILDING_MATERIAL", "INTERIOR_MATERIAL", "FINISH", "OTHER"].includes(category)) {
    return { error: "Choose a category." };
  }

  const mrpRaw = String(formData.get("mrpPaise") ?? "").trim();
  const mrpPaise = mrpRaw ? Math.round(Number(mrpRaw) * 100) : null;
  if (mrpRaw && !Number.isFinite(mrpPaise)) return { error: "MRP must be a number." };

  const supabase = await createPlatformClient();
  const { error } = await supabase.from("products").insert({
    company_id: companyId,
    name,
    category,
    sku: String(formData.get("sku") ?? "").trim() || null,
    mrp_paise: mrpPaise,
    description: String(formData.get("description") ?? "").trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/materials");
  return null;
}

export async function updateProduct(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const productId = String(formData.get("productId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  if (!productId || !companyId || !name) return { error: "Product name is required." };
  if (!["BUILDING_MATERIAL", "INTERIOR_MATERIAL", "FINISH", "OTHER"].includes(category)) {
    return { error: "Choose a category." };
  }

  const mrpRaw = String(formData.get("mrpPaise") ?? "").trim();
  const mrpPaise = mrpRaw ? Math.round(Number(mrpRaw) * 100) : null;
  if (mrpRaw && !Number.isFinite(mrpPaise)) return { error: "MRP must be a number." };

  const supabase = await createPlatformClient();
  const { error } = await supabase
    .from("products")
    .update({
      name,
      category,
      sku: String(formData.get("sku") ?? "").trim() || null,
      mrp_paise: mrpPaise,
      description: String(formData.get("description") ?? "").trim() || null,
    })
    .eq("id", productId);
  if (error) return { error: error.message };

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/materials");
  return null;
}

export async function removeProduct(productId: string, companyId: string): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { error: error.message };

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/materials");
  return {};
}

// ── Specifications (flexible key-value) ─────────────────────────────────

export async function addProductSpecification(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const productId = String(formData.get("productId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  if (!productId || !label || !value) return { error: "Label and value are required." };

  const supabase = await createPlatformClient();
  const { error } = await supabase.from("product_specifications").insert({ product_id: productId, label, value });
  if (error) return { error: error.message };

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/materials");
  return null;
}

export async function updateProductSpecification(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const specId = String(formData.get("specId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  if (!specId || !label || !value) return { error: "Label and value are required." };

  const supabase = await createPlatformClient();
  const { error } = await supabase.from("product_specifications").update({ label, value }).eq("id", specId);
  if (error) return { error: error.message };

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/materials");
  return null;
}

export async function removeProductSpecification(specId: string, companyId: string): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { error } = await supabase.from("product_specifications").delete().eq("id", specId);
  if (error) return { error: error.message };

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/materials");
  return {};
}

// ── Test results (structured) ───────────────────────────────────────────

export async function addProductTestResult(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const productId = String(formData.get("productId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const testName = String(formData.get("testName") ?? "").trim();
  const result = String(formData.get("result") ?? "").trim();
  if (!productId || !testName || !result) return { error: "Test name and result are required." };

  const supabase = await createPlatformClient();
  const { error } = await supabase.from("product_test_results").insert({
    product_id: productId,
    test_name: testName,
    result,
    lab_name: String(formData.get("labName") ?? "").trim() || null,
    tested_at: String(formData.get("testedAt") ?? "").trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/materials");
  return null;
}

export async function updateProductTestResult(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const testResultId = String(formData.get("testResultId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const testName = String(formData.get("testName") ?? "").trim();
  const result = String(formData.get("result") ?? "").trim();
  if (!testResultId || !testName || !result) return { error: "Test name and result are required." };

  const supabase = await createPlatformClient();
  const { error } = await supabase
    .from("product_test_results")
    .update({
      test_name: testName,
      result,
      lab_name: String(formData.get("labName") ?? "").trim() || null,
      tested_at: String(formData.get("testedAt") ?? "").trim() || null,
    })
    .eq("id", testResultId);
  if (error) return { error: error.message };

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/materials");
  return null;
}

export async function removeProductTestResult(testResultId: string, companyId: string): Promise<{ error?: string }> {
  const supabase = await createPlatformClient();
  const { error } = await supabase.from("product_test_results").delete().eq("id", testResultId);
  if (error) return { error: error.message };

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/materials");
  return {};
}
