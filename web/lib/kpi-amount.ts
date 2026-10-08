/** True for a KPI value that shows money (e.g. "₹41,87,000"). Amount KPIs get a full line to themselves in two-up KPI rails. */
export function isAmountValue(value: string | number): boolean {
  return typeof value === "string" && value.includes("₹");
}
