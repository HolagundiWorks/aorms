/**
 * Consultants CSV import template (2026-09-14) — see clients' own
 * import-template route for why there's no in-file notes line.
 * `Discipline` is free text (createConsultant has no enum for it
 * either), so unlike clients/contractors there's no fixed-values note
 * needed here at all.
 */
import { NextResponse } from "next/server";
import { toCsv, csvResponseInit } from "../../../../lib/import-export/csv";

const COLUMNS = ["Name", "Discipline", "Firm", "Email", "Phone"];

export async function GET(): Promise<NextResponse> {
  const csv = toCsv(
    [
      {
        Name: "Priya Nair",
        Discipline: "Structural",
        Firm: "Nair Structural Consultants",
        Email: "priya@nairstructural.example",
        Phone: "9900112233",
      },
    ],
    COLUMNS,
  );

  return new NextResponse(csv, csvResponseInit("AORMS_Consultants_Template.csv"));
}
