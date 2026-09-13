/**
 * Shared percentage formatting (2026-09-14, shell/identity/KPI spec §20) —
 * `ratio` is a 0-1 fraction (standard `Intl.NumberFormat` "percent" style
 * convention: 0.124 → "12.4%"), matching how a computed rate like
 * `outstanding / totalBilled` already comes out of the math naturally. A
 * value already stored 0-100 in the database (e.g. a `*_pct` column) needs
 * `/100` at the call site before passing in here — kept as one explicit
 * division at the call site rather than a second "already-100" mode on
 * this function, so every caller of `formatPercentage` means the same
 * thing by its argument.
 */
export function formatPercentage(ratio: number, opts?: { maximumFractionDigits?: number }): string {
  return new Intl.NumberFormat("en-IN", {
    style: "percent",
    maximumFractionDigits: opts?.maximumFractionDigits ?? 1,
  }).format(ratio);
}
