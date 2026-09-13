/**
 * Contractors CSV import template (2026-09-14) — see clients' own
 * import-template route for why there's no in-file notes line; the
 * allowed `Category` codes live as UI helper text instead
 * (ImportExportBar.tsx's `notes` prop).
 */
import { NextResponse } from "next/server";
import { toCsv, csvResponseInit } from "../../../../lib/import-export/csv";

const COLUMNS = ["Name", "Category", "Company name", "Contact person", "Email", "Phone", "City", "State"];

export async function GET(): Promise<NextResponse> {
  const csv = toCsv(
    [
      {
        Name: "Sundar Raman",
        Category: "CIVIL",
        "Company name": "Raman Construction Co.",
        "Contact person": "Sundar Raman",
        Email: "sundar@ramanconstruction.example",
        Phone: "9845012345",
        City: "Bengaluru",
        State: "Karnataka",
      },
    ],
    COLUMNS,
  );

  return new NextResponse(csv, csvResponseInit("AORMS_Contractors_Template.csv"));
}
