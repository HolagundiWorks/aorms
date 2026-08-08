import { Alert, FormControlLabel, Popover, Stack, Switch, TextField, Typography } from "@mui/material";
import { colors, RADIUS } from "@hcw/ui-kit";
import { useState, type RefObject } from "react";

type FloatingCalculatorProps = {
  open: boolean;
  onClose: () => void;
  /** Dock trigger — the popover anchors to it. */
  triggerRef: RefObject<HTMLElement | null>;
  /** Footer calc opens above; marketing top-bar opens below. */
  placement?: "above" | "below";
};

export type CalcOutputUnit = "metric" | "imperial";
export type CalcDimension = "length" | "area" | "volume";
export type CalcResult = { value: number; dimension: CalcDimension };

const M_PER_FT = 0.3048;
const M_PER_IN = 0.0254;
const M2_PER_FT2 = 0.09290304;
const FT2_PER_M2 = 10.7639104167;
const M3_PER_FT3 = 0.0283168466;
const FT3_PER_M3 = 35.314666721;

const INPUT_MIN_H = 40;
const RESULT_MIN_H = INPUT_MIN_H * 2;

/**
 * Office-wide floating calculator — square soft-neu panel (8px). Result is flat
 * (no inset well), Radiant Orange pixel type at 2× input height. Bare numbers are
 * **meters**; imperial lengths convert before + − × ÷. m ↔ ft·in via Switch.
 */
export function FloatingCalculator({
  open,
  onClose,
  triggerRef,
  placement = "above",
}: FloatingCalculatorProps) {
  const [expr, setExpr] = useState("");
  const [outputUnit, setOutputUnit] = useState<CalcOutputUnit>("metric");
  const result = safeEval(expr);
  const incomplete = isIncompleteCalcExpr(expr);
  const showInvalid = Boolean(expr.trim()) && result === null && !incomplete;

  const displayResult =
    expr.trim() === ""
      ? outputUnit === "metric"
        ? "0 m"
        : `0'0"`
      : result === null
      ? "—"
      : `= ${formatResult(result, outputUnit)}`;

  const below = placement === "below";

  return (
    <Popover
      open={open}
      anchorEl={triggerRef.current}
      onClose={onClose}
      anchorOrigin={{
        vertical: below ? "bottom" : "top",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: below ? "top" : "bottom",
        horizontal: "center",
      }}
      slotProps={{
        paper: {
          className: "esti-neu esti-calc-panel",
          sx: { width: 300, p: 2, borderRadius: `${RADIUS}px`, overflow: "hidden" },
        },
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Calculator
          </Typography>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={outputUnit === "imperial"}
                onChange={(_, checked) => setOutputUnit(checked ? "imperial" : "metric")}
                slotProps={{ input: { "aria-label": "Feet and inches output" } }}
              />
            }
            label={
              <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 36 }}>
                {outputUnit === "metric" ? "m" : "ft·in"}
              </Typography>
            }
            labelPlacement="start"
            sx={{ m: 0, gap: 0.75 }}
          />
        </Stack>
        <Typography
          component="div"
          className="esti-calc-result"
          sx={{
            minHeight: RESULT_MIN_H,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            textAlign: "right",
            width: "100%",
            wordBreak: "break-all",
            fontFamily: "'VT323', 'Courier New', monospace",
            fontSize: "2rem",
            lineHeight: 1.1,
            color: colors.accent,
            border: "none",
            boxShadow: "none",
            background: "transparent",
            p: 0,
          }}
        >
          {displayResult}
        </Typography>
        {showInvalid ? (
          <Alert severity="error">Invalid</Alert>
        ) : null}
        <TextField
          id="calc-screen"
          size="small"
          autoFocus
          hiddenLabel
          aria-label="Calculator input"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && result !== null) setExpr(formatResultForInput(result, outputUnit));
          }}
          fullWidth
          sx={{
            "& .MuiInputBase-root": {
              minHeight: INPUT_MIN_H,
              borderRadius: `${RADIUS}px`,
            },
          }}
        />
      </Stack>
    </Popover>
  );
}

/** Tokenise an expression; returns null if any character is unrecognised. */
export function tokenizeCalc(input: string): string[] | null {
  const s = normalizeExpr(input);
  if (!s) return [];
  const tokens: string[] = [];
  const re =
    /(\d+\.?\d*m(?:3|³)|\d+\.?\d*m(?:2|²)|\d+\.?\d*'\d+\.?\d*"|\d+\.?\d*'|\d+\.?\d*"|\d+\.?\d*ft\d+\.?\d*in|\d+\.?\d*ft(?:3|³)|\d+\.?\d*ft(?:2|²)|\d+\.?\d*ft|\d+\.?\d*in|\d+\.?\d*|\.\d+|[+\-*/()%])/gi;
  let consumed = "";
  for (const m of s.matchAll(re)) {
    if (m.index !== consumed.length) return null;
    tokens.push(m[1]!);
    consumed += m[1]!;
  }
  return consumed === s ? tokens : null;
}

/** Convert an m² / ft² token to square metres. */
export function areaTokenToM2(tok: string): number | null {
  const t = tok.toLowerCase();
  let m = t.match(/^(\d+(?:\.\d+)?)m(?:2|²)$/);
  if (m) return Number(m[1]);

  m = t.match(/^(\d+(?:\.\d+)?)ft(?:2|²)$/);
  if (m) return Number(m[1]) * M2_PER_FT2;

  return null;
}

/** Convert an m³ / ft³ token to cubic metres. */
export function volumeTokenToM3(tok: string): number | null {
  const t = tok.toLowerCase();
  let m = t.match(/^(\d+(?:\.\d+)?)m(?:3|³)$/);
  if (m) return Number(m[1]);

  m = t.match(/^(\d+(?:\.\d+)?)ft(?:3|³)$/);
  if (m) return Number(m[1]) * M3_PER_FT3;

  return null;
}

/** Convert a numeric / length token to metres (bare number = metres). */
export function lengthTokenToMeters(tok: string): number | null {
  const t = tok.toLowerCase();
  if (/m(?:2|²|3|³)$/.test(t) || /ft(?:2|²|3|³)$/.test(t)) return null;

  let m = t.match(/^(\d+(?:\.\d+)?)'(\d+(?:\.\d+)?)"$/);
  if (m) return Number(m[1]) * M_PER_FT + Number(m[2]) * M_PER_IN;

  m = t.match(/^(\d+(?:\.\d+)?)'$/);
  if (m) return Number(m[1]) * M_PER_FT;

  m = t.match(/^(\d+(?:\.\d+)?)"$/);
  if (m) return Number(m[1]) * M_PER_IN;

  m = t.match(/^(\d+(?:\.\d+)?)ft(\d+(?:\.\d+)?)in$/);
  if (m) return Number(m[1]) * M_PER_FT + Number(m[2]) * M_PER_IN;

  m = t.match(/^(\d+(?:\.\d+)?)ft$/);
  if (m) return Number(m[1]) * M_PER_FT;

  m = t.match(/^(\d+(?:\.\d+)?)in$/);
  if (m) return Number(m[1]) * M_PER_IN;

  m = t.match(/^(\d+(?:\.\d+)?)$/);
  if (m) return Number(m[1]);

  m = t.match(/^\.(\d+)$/);
  if (m) return Number(`0.${m[1]}`);

  return null;
}

type DimValue = { v: number; dim: CalcDimension };

function parseQuantityToken(tok: string): DimValue | null {
  const m3 = volumeTokenToM3(tok);
  if (m3 !== null && Number.isFinite(m3)) return { v: m3, dim: "volume" };

  const m2 = areaTokenToM2(tok);
  if (m2 !== null && Number.isFinite(m2)) return { v: m2, dim: "area" };

  const metres = lengthTokenToMeters(tok);
  if (metres !== null && Number.isFinite(metres)) return { v: metres, dim: "length" };

  return null;
}

function applyDimOp(op: string, a: DimValue, b: DimValue): DimValue | null {
  if (op === "+" || op === "-") {
    if (a.dim !== b.dim) return null;
    return { v: op === "+" ? a.v + b.v : a.v - b.v, dim: a.dim };
  }
  if (op === "*") {
    if ((a.dim === "volume" || a.dim === "area") && b.dim === "length") return { v: a.v * b.v, dim: a.dim };
    if (a.dim === "length" && (b.dim === "volume" || b.dim === "area")) return { v: a.v * b.v, dim: b.dim };
    if (a.dim === b.dim) return { v: a.v * b.v, dim: a.dim };
    return null;
  }
  if (op === "/") {
    if ((a.dim === "volume" || a.dim === "area") && b.dim === "length") return { v: a.v / b.v, dim: a.dim };
    if (a.dim === b.dim) return { v: a.v / b.v, dim: a.dim };
    return null;
  }
  return null;
}

/**
 * Safe arithmetic evaluator (no eval): tokenise → metres / m³ → shunting-yard → RPN.
 * Supports + - * / ( ) and postfix % (percent of the preceding value).
 */
export function safeEval(input: string): CalcResult | null {
  const expr = input.trim();
  if (!expr) return null;
  const raw = tokenizeCalc(expr);
  if (raw === null) return null;

  const tokens: (DimValue | string)[] = [];
  for (const t of raw) {
    if (/^[\d.]/.test(t) || t.includes("'") || t.includes('"') || /ft|in|m(?:2|²|3|³)$/i.test(t)) {
      const qty = parseQuantityToken(t);
      if (qty === null) return null;
      tokens.push(qty);
    } else if (t === "%") {
      tokens.push("%");
    } else {
      tokens.push(t);
    }
  }

  const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
  const out: (DimValue | string)[] = [];
  const ops: string[] = [];
  for (const t of tokens) {
    if (typeof t !== "string") {
      out.push(t);
    } else if (t === "%") {
      out.push("%");
    } else if (t === "(") {
      ops.push(t);
    } else if (t === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") out.push(ops.pop()!);
      if (!ops.length) return null;
      ops.pop();
    } else if (t in prec) {
      while (
        ops.length &&
        ops[ops.length - 1] !== "(" &&
        (prec[ops[ops.length - 1]!] ?? 0) >= prec[t]!
      )
        out.push(ops.pop()!);
      ops.push(t);
    } else {
      return null;
    }
  }
  while (ops.length) {
    const op = ops.pop()!;
    if (op === "(") return null;
    out.push(op);
  }

  const st: DimValue[] = [];
  for (const t of out) {
    if (typeof t !== "string") {
      st.push(t);
    } else if (t === "%") {
      const a = st.pop();
      if (a === undefined) return null;
      st.push({ v: a.v / 100, dim: a.dim });
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
  return st.length === 0 && r !== undefined && Number.isFinite(r.v) ? { value: r.v, dimension: r.dim } : null;
}

function normalizeExpr(expr: string): string {
  return expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/\s+/g, "");
}

/** True while the user is still typing — suppress "Invalid expression" for partial input. */
export function isIncompleteCalcExpr(input: string): boolean {
  const s = normalizeExpr(input);
  if (!s) return false;
  if (/[+*%/]$/.test(s)) return true;
  if (s.endsWith("-") && s.length > 1) return true;
  if (s === "-") return true;
  if (/\.$/.test(s)) return true;
  if (/\($/.test(s)) return true;
  if (/\d+'\d+$/.test(s) && !/\d+'\d+"$/.test(s)) return true;
  if (/\d+m$/i.test(s)) return true;
  if (/\d+ft$/i.test(s) && !/\d+ft[23²³]/i.test(s)) return true;
  if (/\d+f$/i.test(s)) return true;
  if (/\d+i$/i.test(s) && !/in$/i.test(s)) return true;

  let depth = 0;
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (depth < 0) return false;
  }
  if (depth > 0) return true;

  const tokens = tokenizeCalc(s);
  if (tokens === null) {
    // Tokenise failed — treat as incomplete if the tail could still become valid.
    const partial = /(?:\d+\.?$|\d+'\d*$|\d+m$|\d+ft$|\d+f$|\d+i$)$/i.test(s);
    if (partial) return true;
    if (/[+\-*/(%]$/.test(s)) return true;
    return false;
  }

  if (tokens.length > 0) {
    const last = tokens[tokens.length - 1]!;
    if (last in { "+": 1, "-": 1, "*": 1, "/": 1, "(": 1, "%": 1 }) return true;
  }

  return false;
}

function formatNum(n: number): string {
  return String(Math.round(n * 1e8) / 1e8);
}

export function formatImperial(m: number): string {
  const totalIn = m / M_PER_IN;
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round((totalIn - ft * 12) * 1000) / 1000;
  if (inch >= 12) {
    ft += 1;
    inch = 0;
  }
  return `${ft}'${formatNum(inch)}"`;
}

export function formatResult(result: CalcResult, unit: CalcOutputUnit): string {
  if (result.dimension === "area") {
    return unit === "metric"
      ? `${formatNum(result.value)} m²`
      : `${formatNum(result.value * FT2_PER_M2)} ft²`;
  }
  if (result.dimension === "volume") {
    return unit === "metric"
      ? `${formatNum(result.value)} m³`
      : `${formatNum(result.value * FT3_PER_M3)} ft³`;
  }
  return unit === "metric" ? `${formatNum(result.value)} m` : formatImperial(result.value);
}

/** Reuse result in the expression field (Enter). */
export function formatResultForInput(result: CalcResult, unit: CalcOutputUnit): string {
  if (result.dimension === "area") {
    return unit === "metric" ? `${formatNum(result.value)}m2` : `${formatNum(result.value * FT2_PER_M2)}ft2`;
  }
  if (result.dimension === "volume") {
    return unit === "metric" ? `${formatNum(result.value)}m3` : `${formatNum(result.value * FT3_PER_M3)}ft3`;
  }
  return unit === "metric" ? formatNum(result.value) : formatImperial(result.value);
}
