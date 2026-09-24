/**
 * Direct TypeScript port of worker/esti_worker/jobs/reconcile.py's
 * matching algorithm (see that file for the original) — this codebase's
 * reconciliation runs synchronously inside a Server Action instead
 * (already-made architecture decision, not the Python worker), but the
 * column-resolution / paise-parsing / match-type logic is ported as
 * faithfully as TypeScript allows rather than redesigned.
 *
 * Deliberately NOT a "use server" file — see lib/drawings/upload.ts's own
 * header comment for why the pure-logic module stays plain: this is what
 * web/lib/actions/reconcile.ts calls directly.
 */
import { read, utils } from "xlsx";
import { parseCsvFile } from "../import-export/csv";

const DATE_ALIASES = ["date", "txn date", "value date", "transaction date"];
const DESC_ALIASES = ["description", "narration", "particulars", "details", "remarks"];
const AMOUNT_ALIASES = ["amount", "credit", "deposit", "cr", "credit amount"];

export type ColumnMapping = { date?: string; description?: string; amount?: string };

export type OpenInvoice = {
  id: string;
  ref: string;
  grand_total_paise: number;
  net_receivable_paise: number;
};

export type MatchType = "ref_amount" | "ref" | "amount" | "amount_ambiguous" | "none";

export type ReconcileLine = {
  row: number;
  date: string | null;
  description: string;
  amountPaise: number;
  matchType: MatchType;
  matchedInvoiceId: string | null;
  matchedInvoiceRef: string | null;
  candidateInvoiceRefs: string[] | null;
  settledAt: string | null;
};

export type ParseAndMatchResult = {
  rows: number;
  matched: number;
  unmatched: number;
  totalCreditPaise: number;
  matchedCreditPaise: number;
  lines: ReconcileLine[];
  error?: string;
};

/** Case-insensitive exact match against the alias list, then a substring
 * fallback — port of reconcile.py's `_pick()`. */
function pickColumn(columns: string[], aliases: string[]): string | null {
  const norm = columns.map((c) => [c, c.trim().toLowerCase()] as const);
  for (const [col, low] of norm) {
    if (aliases.includes(low)) return col;
  }
  for (const [col, low] of norm) {
    if (aliases.some((a) => low.includes(a))) return col;
  }
  return null;
}

/** Port of reconcile.py's `_resolve_column()`: an explicit column-mapping
 * override wins outright (case-insensitive, then verbatim), else falls
 * back to alias resolution. */
function resolveColumn(columns: string[], aliases: string[], override: string | undefined | null): string | null {
  if (override) {
    for (const col of columns) {
      if (col.trim().toLowerCase() === override.trim().toLowerCase()) return col;
    }
    if (columns.includes(override)) return override;
  }
  return pickColumn(columns, aliases);
}

/**
 * Parse a statement amount to paise, preserving sign. Port of
 * reconcile.py's `_to_paise()` — see its own docstring for why debits
 * must come out negative (accounting parens, trailing minus, `Dr` suffix
 * all mean the same thing Indian bank exports use interchangeably, and
 * stripping straight to digits turns every one of them into a positive
 * number that then gets reconciled as an incoming payment).
 */
export function toPaise(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isNaN(value)) return null;

  const raw = String(value).trim();
  if (!raw) return null;
  const low = raw.toLowerCase();
  const negative =
    raw.startsWith("-") ||
    (raw.startsWith("(") && raw.endsWith(")")) ||
    raw.endsWith("-") ||
    low.endsWith(" dr") ||
    low.endsWith("dr");

  const s = raw.replace(/[^0-9.]/g, ""); // magnitude only; sign handled above
  if (s === "" || s === ".") return null;

  const magnitude = Number(s);
  if (!Number.isFinite(magnitude)) return null;

  const paise = Math.round(magnitude * 100);
  return negative ? -paise : paise;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Match one credit line to an invoice. Port of reconcile.py's
 * `match_line()` — see its own docstring for the reasoning: a reference
 * match wins outright (identifies a specific invoice); an amount match
 * only identifies an invoice when exactly one open invoice has that
 * total, since two projects billed an identical standard fee would
 * otherwise bind the receipt to whichever the database returned first.
 */
export function matchLine(
  amountPaise: number,
  description: string,
  invoices: OpenInvoice[],
  byRefDigits: Map<string, OpenInvoice>,
): { matchType: MatchType; hit: OpenInvoice | null; candidates: OpenInvoice[] } {
  let refHit: OpenInvoice | null = null;
  const descDigits = digitsOnly(description);
  for (const [refDigits, inv] of byRefDigits) {
    if (refDigits.length >= 6 && descDigits.includes(refDigits)) {
      refHit = inv;
      break;
    }
  }

  const amtMatches = invoices.filter(
    (inv) => amountPaise === inv.grand_total_paise || amountPaise === inv.net_receivable_paise,
  );

  if (refHit) {
    const exact = amtMatches.some((inv) => inv.id === refHit!.id);
    return { matchType: exact ? "ref_amount" : "ref", hit: refHit, candidates: amtMatches };
  }
  if (amtMatches.length === 1) return { matchType: "amount", hit: amtMatches[0], candidates: amtMatches };
  if (amtMatches.length > 1) return { matchType: "amount_ambiguous", hit: null, candidates: amtMatches };
  return { matchType: "none", hit: null, candidates: [] };
}

function rowsFromCsv(fileBuffer: Buffer): Record<string, unknown>[] {
  const { rows } = parseCsvFile(fileBuffer.toString("utf-8"));
  return rows;
}

function rowsFromSpreadsheet(fileBuffer: Buffer): Record<string, unknown>[] {
  const workbook = read(fileBuffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  return utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
}

const EMPTY_RESULT: Omit<ParseAndMatchResult, "error"> = {
  rows: 0,
  matched: 0,
  unmatched: 0,
  totalCreditPaise: 0,
  matchedCreditPaise: 0,
  lines: [],
};

/**
 * Parses a CSV or XLSX/XLS statement buffer and matches its credit lines
 * against `openInvoices`. Never throws — parse/column-resolution
 * failures come back as `{ ...EMPTY_RESULT, error }`, matching
 * reconcile.py's own try/except-around-everything shape (the caller sets
 * the `reconcile` row to FAILED with that error text).
 */
export function parseAndMatchFile(
  fileBuffer: Buffer,
  fileName: string,
  columnMapping: ColumnMapping | null,
  openInvoices: OpenInvoice[],
): ParseAndMatchResult {
  try {
    const isSpreadsheet = /\.(xlsx|xls)$/i.test(fileName);
    const rows = isSpreadsheet ? rowsFromSpreadsheet(fileBuffer) : rowsFromCsv(fileBuffer);

    const columns = rows.length ? Object.keys(rows[0]) : [];
    const dateCol = resolveColumn(columns, DATE_ALIASES, columnMapping?.date);
    const descCol = resolveColumn(columns, DESC_ALIASES, columnMapping?.description);
    const amountCol = resolveColumn(columns, AMOUNT_ALIASES, columnMapping?.amount);

    if (!amountCol) {
      return { ...EMPTY_RESULT, error: `No amount/credit column found in ${columns.join(", ") || "(no columns)"}` };
    }

    const byRefDigits = new Map<string, OpenInvoice>();
    for (const inv of openInvoices) byRefDigits.set(digitsOnly(inv.ref), inv);

    const lines: ReconcileLine[] = [];
    let totalCredit = 0;
    let matchedCredit = 0;
    let matched = 0;

    rows.forEach((rec, i) => {
      const amountPaise = toPaise(rec[amountCol]);
      if (amountPaise === null || amountPaise <= 0) return; // debits / blanks are not receipts

      const description = descCol ? String(rec[descCol] ?? "") : "";
      const dateVal = dateCol && rec[dateCol] != null ? String(rec[dateCol]) : null;
      totalCredit += amountPaise;

      const { matchType, hit, candidates } = matchLine(amountPaise, description, openInvoices, byRefDigits);
      if (hit) {
        matched += 1;
        matchedCredit += amountPaise;
      }

      lines.push({
        row: i,
        date: dateVal,
        description: description.slice(0, 200),
        amountPaise,
        matchType,
        matchedInvoiceId: hit?.id ?? null,
        matchedInvoiceRef: hit?.ref ?? null,
        candidateInvoiceRefs: matchType === "amount_ambiguous" ? candidates.map((inv) => inv.ref) : null,
        settledAt: null,
      });
    });

    return {
      rows: lines.length,
      matched,
      unmatched: lines.length - matched,
      totalCreditPaise: totalCredit,
      matchedCreditPaise: matchedCredit,
      lines,
    };
  } catch (err) {
    return { ...EMPTY_RESULT, error: err instanceof Error ? err.message : String(err) };
  }
}
