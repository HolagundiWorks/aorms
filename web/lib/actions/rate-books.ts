"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type RateBookActionState = { error: string } | null;

export async function createRateBookRecord(
  _prev: RateBookActionState,
  formData: FormData,
): Promise<RateBookActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const versionLabel = String(formData.get("versionLabel") ?? "").trim() || null;
  const effectiveDate = String(formData.get("effectiveDate") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) return { error: "Name is required." };

  const supabase = await createClient();

  const { data: inserted, error } = await supabase
    .from("rate_books")
    .insert({ name, version_label: versionLabel, effective_date: effectiveDate, description })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "rate_book",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { name, versionLabel, effectiveDate },
  });

  revalidatePath("/rate-books");
  return null;
}

export type RateBookItemActionState = { error: string } | null;

export async function createRateBookItemRecord(
  _prev: RateBookItemActionState,
  formData: FormData,
): Promise<RateBookItemActionState> {
  const rateBookId = String(formData.get("rateBookId") ?? "").trim();
  const itemCode = String(formData.get("itemCode") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const rateRaw = String(formData.get("ratePaise") ?? "").trim();

  if (!rateBookId) return { error: "Missing rate book." };
  if (!description) return { error: "Description is required." };
  if (!unit) return { error: "Unit is required." };

  const ratePaise = rateRaw ? Math.round(Number(rateRaw) * 100) : 0;
  if (!Number.isFinite(ratePaise)) return { error: "Rate must be a number." };

  const supabase = await createClient();

  const { data: inserted, error } = await supabase
    .from("rate_book_items")
    .insert({ rate_book_id: rateBookId, item_code: itemCode, description, unit, rate_paise: ratePaise })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "rate_book_item",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { rateBookId, itemCode, description, unit, ratePaise },
  });

  revalidatePath(`/rate-books/${rateBookId}`);
  return null;
}
