/**
 * Contractors CSV export (2026-09-14, demo-audit brief's bulk
 * import/export requirement) — RLS-scoped client, same access an
 * authenticated user gets on /contractors itself. Column order/names
 * match import-template's and importContractorsCsv's own expectations
 * (lib/actions/contractors.ts), so an exported file re-imports cleanly.
 */
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { toCsv, csvResponseInit } from "../../../../lib/import-export/csv";

const COLUMNS = ["Name", "Category", "Company name", "Contact person", "Email", "Phone", "City", "State"];

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: contractors, error } = await supabase
    .from("contractors")
    .select("name, category, company_name, contact_person, email, phone, city, state")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = toCsv(
    (contractors ?? []).map((c) => ({
      Name: c.name,
      Category: c.category,
      "Company name": c.company_name,
      "Contact person": c.contact_person,
      Email: c.email,
      Phone: c.phone,
      City: c.city,
      State: c.state,
    })),
    COLUMNS,
  );

  return new NextResponse(csv, csvResponseInit("AORMS_Contractors.csv"));
}
