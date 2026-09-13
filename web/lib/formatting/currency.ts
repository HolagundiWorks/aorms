/**
 * Shared Indian Rupee formatting (2026-09-14, shell/identity/KPI spec §17-19)
 * — was previously duplicated ad hoc in 15+ files (every page with its own
 * local `function formatInr(paise) { return \`₹${...}\`; }`). Those existing
 * copies are untouched (real behavior, not broken — no need to churn every
 * call site just to point at this), but anything new should import from
 * here instead of growing a 16th copy.
 */

/** Full Indian-grouped rupee string from paise, e.g. 12500000 → "₹1,25,000". For tables, detail pages, and any value where the exact figure matters. */
export function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/**
 * Compact Indian Lakh/Crore notation from paise, e.g. "₹12.50 L", "₹1.25 Cr"
 * — for KPI headline values (spec §17-19: "never display raw financial
 * numbers when a human-readable format is appropriate", explicitly not
 * Western M/B abbreviations). Falls back to the full grouped form below ₹1
 * lakh, where compact notation adds no clarity over the real number.
 */
export function formatInrCompact(paise: number): string {
  const rupees = paise / 100;
  const abs = Math.abs(rupees);
  if (abs >= 1_00_00_000) return `₹${(rupees / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `₹${(rupees / 1_00_000).toFixed(2)} L`;
  return formatInr(paise);
}
