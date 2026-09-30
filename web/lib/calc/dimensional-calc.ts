/**
 * Dimensional calculator — pure logic. Originally ported from the old
 * frontend's `components/FloatingCalculator.tsx`; rewritten 2026-09-30 to fix
 * dimension-rule bugs the port carried over. The Carbon UI lives in
 * components/aorms/calculator/HeaderCalculator.tsx.
 *
 * Rules (this is the behaviour the UI helper text promises):
 *  - A bare number is metres — *and* also works as a plain scalar, so
 *    `2 * 3'6"` doubles a length and `12'6" / 2` halves it.
 *  - Unit suffixes: `m cm mm ' " ft in m2 m3 ft2 ft3` (`12'6"`, `12ft6in`).
 *  - length × length (both with units) = area; area × length = volume;
 *    area / length = length; volume / length = area; volume / area = length;
 *    length / length = a plain number. area × area etc. are invalid.
 *  - + and − need the same dimension (a bare number counts as metres).
 *  - Unary minus (`-5 + 3`, `3 * -2`) and thousands commas (`1,200`) work.
 *  - `%` is a percentage *of the other operand* after + / −
 *    (`200 + 10%` = 220, `200 − 10%` = 180), and a plain fraction after
 *    × or ÷ (`200 * 15%` = 30).
 * No `eval()` — tokenise → shunting-yard → RPN with dimension-aware operators.
 */

export type CalcOutputUnit = "metric" | "imperial";
export type CalcDimension = "length" | "area" | "volume" | "number";
export type CalcResult = { value: number; dimension: CalcDimension };

const M_PER_FT = 0.3048;
const M_PER_IN = 0.0254;
const M2_PER_FT2 = 0.09290304;
const FT2_PER_M2 = 10.7639104167;
const M3_PER_FT3 = 0.0283168466;
const FT3_PER_M3 = 35.314666721;

const NUM = String.raw`(?:\d+\.?\d*|\.\d+)`;

/** Tokenise an expression; returns null if any character is unrecognised. */
export function tokenizeCalc(input: string): string[] | null {
  const s = normalizeExpr(input);
  if (!s) return [];
  const tokens: string[] = [];
  // Longest / most specific unit forms first.
  const re = new RegExp(
    [
      `${NUM}m(?:3|³)`,
      `${NUM}m(?:2|²)`,
      `${NUM}ft(?:3|³)`,
      `${NUM}ft(?:2|²)`,
      `${NUM}'${NUM}"`,
      `${NUM}ft${NUM}in`,
      `${NUM}'`,
      `${NUM}"`,
      `${NUM}ft`,
      `${NUM}in`,
      `${NUM}mm`,
      `${NUM}cm`,
      `${NUM}m`,
      NUM,
      `[+\\-*/()%]`,
    ]
      .map((p) => `(${p})`)
      .join("|"),
    "gi",
  );
  let consumed = 0;
  for (const m of s.matchAll(re)) {
    if (m.index !== consumed) return null;
    tokens.push(m[0]);
    consumed += m[0].length;
  }
  return consumed === s.length ? tokens : null;
}

const one = (t: string, unit: string): number | null => {
  const m = t.match(new RegExp(`^(${NUM})${unit}$`, "i"));
  return m ? Number(m[1]) : null;
};

/** Convert an m² / ft² token to square metres. */
export function areaTokenToM2(tok: string): number | null {
  const a = one(tok, "m(?:2|²)");
  if (a !== null) return a;
  const f = one(tok, "ft(?:2|²)");
  return f !== null ? f * M2_PER_FT2 : null;
}

/** Convert an m³ / ft³ token to cubic metres. */
export function volumeTokenToM3(tok: string): number | null {
  const a = one(tok, "m(?:3|³)");
  if (a !== null) return a;
  const f = one(tok, "ft(?:3|³)");
  return f !== null ? f * M3_PER_FT3 : null;
}

/** Convert a numeric / length token to metres (bare number = metres). */
export function lengthTokenToMeters(tok: string): number | null {
  const t = tok.toLowerCase();
  const compound = t.match(new RegExp(`^(${NUM})'(${NUM})"$`)) ?? t.match(new RegExp(`^(${NUM})ft(${NUM})in$`));
  if (compound) return Number(compound[1]) * M_PER_FT + Number(compound[2]) * M_PER_IN;
  const table: [string, number][] = [
    ["'", M_PER_FT],
    ['"', M_PER_IN],
    ["ft", M_PER_FT],
    ["in", M_PER_IN],
    ["mm", 0.001],
    ["cm", 0.01],
    ["m", 1],
    ["", 1],
  ];
  for (const [unit, factor] of table) {
    const v = one(t, unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (v !== null) return v * factor;
  }
  return null;
}

type Dim = CalcDimension;
/** `bare`: a unit-less number (metres when alone, a scalar when multiplying/dividing). `pct`: came from `x%`. */
type DimValue = { v: number; dim: Dim; bare?: boolean; pct?: boolean };

function parseQuantityToken(tok: string): DimValue | null {
  const m3 = volumeTokenToM3(tok);
  if (m3 !== null) return { v: m3, dim: "volume" };
  const m2 = areaTokenToM2(tok);
  if (m2 !== null) return { v: m2, dim: "area" };
  const metres = lengthTokenToMeters(tok);
  if (metres === null) return null;
  return { v: metres, dim: "length", bare: new RegExp(`^${NUM}$`).test(tok) };
}

const isUnit = (x: DimValue) => !x.bare && x.dim !== "number";
const scalarOf = (x: DimValue) => x.bare || x.dim === "number";

function applyDimOp(op: string, a: DimValue, b: DimValue): DimValue | null {
  if (op === "+" || op === "-") {
    // "200 + 10%" means 10% *of 200*.
    const bv = b.pct && !a.pct ? a.v * b.v : b.v;
    const sameDim = a.dim === b.dim || (a.dim === "number" && b.dim === "length" && b.bare) || (b.dim === "number" && a.dim === "length" && a.bare);
    if (!sameDim) return null;
    const dim = a.dim === "number" ? b.dim : a.dim;
    return { v: op === "+" ? a.v + bv : a.v - bv, dim, bare: !!a.bare && !!b.bare };
  }
  if (op === "*") {
    if (scalarOf(b)) return { ...a, v: a.v * b.v, pct: false, bare: a.bare && b.bare };
    if (scalarOf(a)) return { ...b, v: a.v * b.v, pct: false };
    if (a.dim === "length" && b.dim === "length") return { v: a.v * b.v, dim: "area" };
    if ((a.dim === "area" && b.dim === "length") || (a.dim === "length" && b.dim === "area")) return { v: a.v * b.v, dim: "volume" };
    return null;
  }
  if (op === "/") {
    if (b.v === 0) return null;
    if (scalarOf(b)) return { ...a, v: a.v / b.v, pct: false };
    if (scalarOf(a)) return null; // number ÷ length is not a supported dimension
    if (a.dim === b.dim) return { v: a.v / b.v, dim: "number" };
    if (a.dim === "area" && b.dim === "length") return { v: a.v / b.v, dim: "length" };
    if (a.dim === "volume" && b.dim === "length") return { v: a.v / b.v, dim: "area" };
    if (a.dim === "volume" && b.dim === "area") return { v: a.v / b.v, dim: "length" };
    return null;
  }
  return null;
}

/**
 * Safe arithmetic evaluator (no eval): tokenise → metres / m² / m³ →
 * shunting-yard → RPN. Supports + − × ÷ ( ), unary minus and postfix %.
 */
export function safeEval(input: string): CalcResult | null {
  const expr = input.trim();
  if (!expr) return null;
  const raw = tokenizeCalc(expr);
  if (raw === null || raw.length === 0) return null;

  type Tok = DimValue | string;
  const tokens: Tok[] = [];
  let prevIsValue = false; // previous token ends a value (operand, ")" or "%")
  for (const t of raw) {
    if (/^[\d.]/.test(t)) {
      const qty = parseQuantityToken(t);
      if (qty === null) return null;
      tokens.push(qty);
      prevIsValue = true;
    } else if (t === "%") {
      if (!prevIsValue) return null;
      tokens.push("%");
    } else if (t === ")") {
      tokens.push(t);
      prevIsValue = true;
    } else if (t === "(") {
      tokens.push(t);
      prevIsValue = false;
    } else if ((t === "-" || t === "+") && !prevIsValue) {
      tokens.push(t === "-" ? "neg" : "pos"); // unary sign
    } else {
      tokens.push(t);
      prevIsValue = false;
    }
    if (t === "%") prevIsValue = true;
  }

  const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, neg: 3, pos: 3 };
  const out: Tok[] = [];
  const ops: string[] = [];
  for (const t of tokens) {
    if (typeof t !== "string") out.push(t);
    else if (t === "%") out.push("%");
    else if (t === "(") ops.push(t);
    else if (t === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") out.push(ops.pop()!);
      if (!ops.length) return null;
      ops.pop();
    } else if (t in prec) {
      const rightAssoc = t === "neg" || t === "pos";
      while (
        ops.length &&
        ops[ops.length - 1] !== "(" &&
        ((prec[ops[ops.length - 1]!] ?? 0) > prec[t]! || (!rightAssoc && (prec[ops[ops.length - 1]!] ?? 0) === prec[t]!))
      )
        out.push(ops.pop()!);
      ops.push(t);
    } else return null;
  }
  while (ops.length) {
    const op = ops.pop()!;
    if (op === "(") return null;
    out.push(op);
  }

  const st: DimValue[] = [];
  for (const t of out) {
    if (typeof t !== "string") st.push(t);
    else if (t === "%") {
      const a = st.pop();
      if (a === undefined) return null;
      st.push({ ...a, v: a.v / 100, pct: true });
    } else if (t === "neg" || t === "pos") {
      const a = st.pop();
      if (a === undefined) return null;
      st.push(t === "neg" ? { ...a, v: -a.v } : a);
    } else {
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) return null;
      const r = applyDimOp(t, a, b);
      if (r === null) return null;
      st.push(r);
    }
  }
  const r = st.pop();
  if (st.length !== 0 || r === undefined || !Number.isFinite(r.v)) return null;
  return { value: r.v, dimension: r.pct ? "number" : r.dim };
}

function normalizeExpr(expr: string): string {
  return expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–]/g, "-")
    .replace(/[′’]/g, "'")
    .replace(/[″”“]/g, '"')
    .replace(/(\d),(?=\d{3}(?!\d))/g, "$1")
    .replace(/=+$/, "")
    .replace(/\s+/g, "");
}

/** True while the user is still typing — suppress "Invalid expression" for partial input. */
export function isIncompleteCalcExpr(input: string): boolean {
  const s = normalizeExpr(input);
  if (!s) return false;
  if (/[+\-*/%(]$/.test(s) && s !== "%") return true;
  if (/\.$/.test(s)) return true;
  if (/\d+'\d+$/.test(s)) return true; // 12'6 — waiting for the closing "
  if (/\d+ft\d+$/i.test(s)) return true; // 12ft6 — waiting for "in"
  if (/\d(?:f|i|c)$/i.test(s)) return true; // partial ft / in / cm
  let depth = 0;
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (depth < 0) return false;
  }
  return depth > 0;
}

/** Display rounding — 4 decimals reads cleanly (0.3048 m, 107.6391 ft²). */
function formatNum(n: number, digits = 4): string {
  const f = 10 ** digits;
  const r = Math.round(n * f) / f;
  return String(Object.is(r, -0) ? 0 : r);
}

export function formatImperial(m: number): string {
  const sign = m < 0 ? "-" : "";
  const totalIn = Math.abs(m) / M_PER_IN;
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round((totalIn - ft * 12) * 1000) / 1000;
  if (inch >= 12) {
    ft += 1;
    inch = 0;
  }
  return `${sign}${ft}'${formatNum(inch, 3)}"`;
}

export function formatResult(result: CalcResult, unit: CalcOutputUnit): string {
  if (result.dimension === "number") return formatNum(result.value);
  if (result.dimension === "area") {
    return unit === "metric" ? `${formatNum(result.value)} m²` : `${formatNum(result.value * FT2_PER_M2)} ft²`;
  }
  if (result.dimension === "volume") {
    return unit === "metric" ? `${formatNum(result.value)} m³` : `${formatNum(result.value * FT3_PER_M3)} ft³`;
  }
  return unit === "metric" ? `${formatNum(result.value)} m` : formatImperial(result.value);
}

/** Reuse result in the expression field (Enter) — full precision so chained maths doesn't drift. */
export function formatResultForInput(result: CalcResult, unit: CalcOutputUnit): string {
  const n = (x: number) => formatNum(x, 8);
  if (result.dimension === "number") return n(result.value);
  if (result.dimension === "area") {
    return unit === "metric" ? `${n(result.value)}m2` : `${n(result.value * FT2_PER_M2)}ft2`;
  }
  if (result.dimension === "volume") {
    return unit === "metric" ? `${n(result.value)}m3` : `${n(result.value * FT3_PER_M3)}ft3`;
  }
  return unit === "metric" ? n(result.value) : formatImperial(result.value);
}
