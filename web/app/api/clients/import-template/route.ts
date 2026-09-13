/**
 * Clients CSV import template (2026-09-14) — a header row plus one
 * worked example, matching importClientsCsv's expected columns
 * (lib/actions/clients.ts) exactly. No auth/data dependency, so this is
 * a static response — the columns are code, not user data.
 *
 * Deliberately no in-file comment/notes line: Papa.parse has no comment
 * syntax by default, and free text containing commas would just parse as
 * a malformed extra data row rather than being ignored. The allowed
 * `Type` values instead live as helper text in the UI next to the
 * download link — see ImportExportBar.tsx's `notes` prop.
 */
import { NextResponse } from "next/server";
import { toCsv, csvResponseInit } from "../../../../lib/import-export/csv";

const COLUMNS = ["Name", "Type", "City", "Email", "Phone", "Contact person"];

export async function GET(): Promise<NextResponse> {
  const csv = toCsv(
    [
      {
        Name: "Aurelia Residences Pvt Ltd",
        Type: "COMPANY",
        City: "Bengaluru",
        Email: "contact@aurelia.example",
        Phone: "9876543210",
        "Contact person": "Aditi Rao",
      },
    ],
    COLUMNS,
  );

  return new NextResponse(csv, csvResponseInit("AORMS_Clients_Template.csv"));
}
