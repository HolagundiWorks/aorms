import Papa from "papaparse";

/**
 * Shared CSV parse/generate helpers (2026-09-14) — the bulk import/export
 * framework the demo-audit brief asked for didn't exist at all before
 * this; `papaparse` is the one new dependency it needed (quoting/escaping
 * commas, quotes, and newlines inside fields correctly is not worth
 * hand-rolling). Deliberately CSV, not a binary .xlsx format: Excel opens,
 * edits, and re-saves CSV natively, so "Excel/CSV import/export" is fully
 * served by one plain-text format without pulling in a much heavier
 * spreadsheet-binary library (xlsx/exceljs) for no real gain — every
 * downloadable template and export file this framework produces opens
 * directly in Excel.
 *
 * Per-module import/export (lib/actions/clients.ts, contractors.ts,
 * consultants.ts + their app/api/<module>/{export,import-template}
 * routes) builds on just these two functions — column mapping and field
 * validation stay per-module, matching each one's own create action's
 * existing validation rather than a generic schema-driven layer.
 */

/**
 * Parses a CSV file's text into header-mapped rows. `errors` carries only
 * parser-level problems (malformed quoting, ragged rows) — field-level
 * validation (required fields, enum membership) is each caller's own job,
 * since it differs per module the same way each create action's own
 * validation already does.
 */
export function parseCsvFile(text: string): { rows: Record<string, string>[]; errors: string[] } {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  return {
    rows: result.data,
    // Papa's `row` is 0-indexed against the data rows (header already
    // consumed) — +2 converts to a 1-indexed spreadsheet row number
    // that also accounts for the header row, matching what a user
    // editing the file in Excel actually sees.
    errors: result.errors.map((e) => `Row ${e.row != null ? e.row + 2 : "?"}: ${e.message}`),
  };
}

/** Renders rows into a CSV string with an explicit, stable column order. */
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  return Papa.unparse({
    fields: columns,
    data: rows.map((row) => columns.map((c) => row[c] ?? "")),
  });
}

/** Shared CSV response headers for a download — attachment + no caching (the data is a live query result, not a static asset). */
export function csvResponseInit(filename: string): ResponseInit {
  return {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  };
}
