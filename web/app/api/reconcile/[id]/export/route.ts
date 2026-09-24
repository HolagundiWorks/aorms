/**
 * Reconciliation batch line export — CSV, not XLSX, even though upload
 * accepts XLSX (matches every other export in this app, e.g.
 * app/api/clients/export/route.ts). RLS-scoped normal client: the
 * "reconcile: finance ops" policy (migration 0087_reconcile.sql) already
 * denies read access to anyone without finance:ops, so this route grants
 * no extra privilege beyond what an authenticated finance-ops user
 * already has on /reconcile itself.
 */
import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { toCsv, csvResponseInit } from "../../../../../lib/import-export/csv";

type ReconcileLine = {
  row: number;
  date: string | null;
  description: string;
  amountPaise: number;
  matchType: string;
  matchedInvoiceRef: string | null;
  candidateInvoiceRefs: string[] | null;
  settledAt: string | null;
};

const COLUMNS = ["Row", "Date", "Description", "Amount (INR)", "Match type", "Matched invoice", "Candidates", "Settled at"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: batch, error } = await supabase.from("reconcile").select("ref, label, lines").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!batch) return NextResponse.json({ error: "Reconciliation batch not found." }, { status: 404 });

  const lines = (batch.lines ?? []) as ReconcileLine[];

  const csv = toCsv(
    lines.map((l) => ({
      Row: l.row,
      Date: l.date ?? "",
      Description: l.description,
      "Amount (INR)": (l.amountPaise / 100).toFixed(2),
      "Match type": l.matchType,
      "Matched invoice": l.matchedInvoiceRef ?? "",
      Candidates: l.candidateInvoiceRefs?.join("; ") ?? "",
      "Settled at": l.settledAt ?? "",
    })),
    COLUMNS,
  );

  const safeRef = batch.ref.replace(/\//g, "-");
  return new NextResponse(csv, csvResponseInit(`AORMS_Reconcile_${safeRef}.csv`));
}
