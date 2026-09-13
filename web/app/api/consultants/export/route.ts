/**
 * Consultants CSV export (2026-09-14, demo-audit brief's bulk
 * import/export requirement) — RLS-scoped client, same access an
 * authenticated user gets on /consultants itself. Column order/names
 * match import-template's and importConsultantsCsv's own expectations
 * (lib/actions/consultants.ts), so an exported file re-imports cleanly.
 */
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { toCsv, csvResponseInit } from "../../../../lib/import-export/csv";

const COLUMNS = ["Name", "Discipline", "Firm", "Email", "Phone"];

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: consultants, error } = await supabase
    .from("consultants")
    .select("name, discipline, firm, email, phone")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = toCsv(
    (consultants ?? []).map((c) => ({ Name: c.name, Discipline: c.discipline, Firm: c.firm, Email: c.email, Phone: c.phone })),
    COLUMNS,
  );

  return new NextResponse(csv, csvResponseInit("AORMS_Consultants.csv"));
}
