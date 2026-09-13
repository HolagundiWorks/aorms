/**
 * Clients CSV export (2026-09-14, demo-audit brief's bulk import/export
 * requirement) — RLS-scoped client, same access an authenticated user
 * gets on /clients itself; this route grants no extra privilege. Column
 * order/names match import-template's and importClientsCsv's own
 * expectations (lib/actions/clients.ts), so an exported file re-imports
 * cleanly without edits.
 */
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { toCsv, csvResponseInit } from "../../../../lib/import-export/csv";

const COLUMNS = ["Name", "Type", "City", "Email", "Phone", "Contact person"];

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("name, kind, city, email, phone, contact_person")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = toCsv(
    (clients ?? []).map((c) => ({
      Name: c.name,
      Type: c.kind,
      City: c.city,
      Email: c.email,
      Phone: c.phone,
      "Contact person": c.contact_person,
    })),
    COLUMNS,
  );

  return new NextResponse(csv, csvResponseInit("AORMS_Clients.csv"));
}
