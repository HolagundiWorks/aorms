import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { enqueueJob, JobEnqueueError } from "./enqueue";
import { getFirmForPdf } from "./firm";

/**
 * The one enqueue pattern every "Generate PDF" Server Action follows —
 * extracted from lib/actions/invoices.ts's original generateInvoicePdf
 * (the Phase 6 proof-of-pattern screen) so the other render targets don't
 * each repeat the same fetch-check/firm-map/enqueue/revalidate sequence.
 * Each domain's own action function stays a thin, named wrapper (so
 * `generateProposalPdf`, not a generic call sprinkled through components)
 * — this only centralizes the body.
 */
export async function generatePdfForTarget(opts: {
  supabase: SupabaseClient;
  /** Table holding `pdf_status`/`pdf_key` for this record. */
  table: string;
  /** `render_pdf`'s `target` string — must be a key in pdf.py's `_RENDERERS`
   * (or `"drawing"`, the one special case) so the worker knows how to fetch
   * and render it. */
  target: string;
  id: string;
  revalidate: string | string[];
}): Promise<{ error: string } | null> {
  const { supabase, table, target, id, revalidate } = opts;

  const { data: record, error: recordError } = await supabase
    .from(table)
    .select("id, pdf_status")
    .eq("id", id)
    .maybeSingle();
  if (recordError) return { error: recordError.message };
  if (!record) return { error: "Record not found." };
  if (record.pdf_status === "PROCESSING") return { error: "PDF is already being generated." };

  const firmResult = await getFirmForPdf(supabase);
  if (firmResult.error) return { error: firmResult.error };

  try {
    await enqueueJob("render_pdf", { target, id, firm: firmResult.firm }, randomUUID());
  } catch (err) {
    if (err instanceof JobEnqueueError) return { error: err.message };
    throw err;
  }

  for (const path of Array.isArray(revalidate) ? revalidate : [revalidate]) {
    revalidatePath(path);
  }
  return null;
}
