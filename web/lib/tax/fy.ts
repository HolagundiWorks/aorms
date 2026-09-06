/**
 * Indian financial year: 1 April – 31 March. Fixed, non-configurable.
 * Verbatim port of the one function the invoice tax engine needs from
 * packages/contracts/src/fy.ts (`financialYearRange`, for the s.194J(B)
 * per-client-per-FY aggregate lookup) — the fuller period-filter apparatus
 * (`resolvePeriodRange` etc., for a GST/TDS filing abstract) is a separate,
 * still-open follow-up (Phase 5's `/reports` stayed "simplified invoice
 * register by status", not a real abstract).
 *
 * IST offset in minutes (UTC+5:30). The product is India-only, so "which
 * financial year is it" is an IST question, not a UTC one — reading the UTC
 * calendar fields directly would put the first 5½ hours of 1 April into the
 * closing financial year.
 */
const IST_OFFSET_MIN = 5 * 60 + 30;

function istParts(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MIN * 60_000);
}

/** Start (inclusive) and end (exclusive) of the FY containing `date`. */
export function financialYearRange(date: Date = new Date()): { start: Date; end: Date } {
  const ist = istParts(date);
  const y = ist.getUTCFullYear();
  const startYear = ist.getUTCMonth() >= 3 ? y : y - 1;
  return {
    start: new Date(Date.UTC(startYear, 3, 1)),
    end: new Date(Date.UTC(startYear + 1, 3, 1)),
  };
}
