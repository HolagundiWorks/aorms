/**
 * Money is stored and computed as an integer number of **paise** (1 rupee =
 * 100 paise). Never use floating point for money. Verbatim port of
 * packages/contracts/src/money.ts's rate-math helpers (`web/` doesn't depend
 * on packages/contracts) — only the pieces the tax engine needs;
 * `formatINR`/`formatINRShort` etc. are already duplicated locally as
 * `formatInr()` on the pages that need them, not touched here.
 */
export type Paise = number;

/** Round a rupee amount (in paise) to the nearest whole rupee, half-up. */
export function roundToRupee(paise: Paise): Paise {
  const rupees = Math.floor(paise / 100);
  const rem = paise - rupees * 100;
  return (rem >= 50 ? rupees + 1 : rupees) * 100;
}

/** Apply a percentage (e.g. 18 for 18%) to a paise amount, rounded to paise. */
export function pct(paise: Paise, percent: number): Paise {
  return Math.round((paise * percent) / 100);
}
