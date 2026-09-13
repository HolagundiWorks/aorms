"use client";

/**
 * Office-wide floating calculator — header trigger + panel, pure stock
 * Carbon components (Popover/TextInput/Toggle/Tag) per this project's Pure
 * Carbon governance, which the user did NOT waive for the calculator (only
 * for Pomodoro). The arithmetic itself (safeEval/tokenizer/unit
 * conversions) is ported verbatim from the old frontend's
 * FloatingCalculator.tsx into lib/calc/dimensional-calc.ts — see that
 * file's docstring.
 */

import { useState } from "react";
import { HeaderGlobalAction, Popover, PopoverContent, TextInput, Toggle } from "@carbon/react";
import { Calculator as CalculatorIcon } from "@carbon/icons-react";
import {
  formatResult,
  formatResultForInput,
  isIncompleteCalcExpr,
  safeEval,
  type CalcOutputUnit,
} from "../../../lib/calc/dimensional-calc";

export function HeaderCalculator() {
  const [open, setOpen] = useState(false);
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

  return (
    <Popover open={open} onRequestClose={() => setOpen(false)} align="bottom-end" caret>
      <HeaderGlobalAction
        aria-label="Calculator"
        isActive={open}
        onClick={() => setOpen((o) => !o)}
      >
        <CalculatorIcon size={20} />
      </HeaderGlobalAction>
      <PopoverContent>
        <div style={{ padding: "1rem", width: "18.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Stacked, not a `justify-content: space-between` row with the
              Toggle beside it (2026-09-13 fix) — Carbon's Toggle always
              renders `labelText` as its own line above the switch (part of
              the same `<label>` block as the switch itself, not a separate
              sibling `hideLabel` can detach — `hideLabel` instead swaps the
              *side* label, next to the switch, from labelA/B to labelText,
              which made the long label text collide with it instead of the
              heading). Stacking the heading above the Toggle's own native
              label avoids fighting that layout entirely. Found live: "Output
              unit — metric or imperial" rendered on top of "Calculator". */}
          <span className="cds--type-heading-compact-01">Calculator</span>
          <Toggle
            id="calc-output-unit"
            size="sm"
            labelText="Output unit — metric or imperial"
            labelA="m"
            labelB="ft·in"
            toggled={outputUnit === "imperial"}
            onToggle={(checked: boolean) => setOutputUnit(checked ? "imperial" : "metric")}
          />

          <div
            style={{
              minHeight: "3rem",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-end",
              textAlign: "right",
              wordBreak: "break-all",
              fontSize: "1.75rem",
              lineHeight: 1.1,
              fontWeight: 600,
              color: "var(--cds-support-info)",
            }}
          >
            {displayResult}
          </div>

          {showInvalid ? (
            <p className="cds--type-helper-text-01" style={{ color: "var(--cds-support-error)" }}>
              Invalid expression
            </p>
          ) : null}

          <TextInput
            id="calc-expr"
            labelText="Expression"
            hideLabel
            // Length + length, not the old length + area example
            // (2026-09-13 fix) — `12'6" + 3.2m2 * 2` mixes a length with an
            // area (3.2m² × 2 stays an area), which this dimension-aware
            // evaluator correctly rejects as "Invalid expression"; typing
            // the placeholder's own example verbatim looked exactly like
            // the calculator itself was broken. A bare `m` suffix isn't a
            // supported token either (only `'`/`"`/`ft`/`in`/`m2`/`m3`/
            // `ft2`/`ft3` are — a plain number is already metres, per the
            // helper text below), so the fix keeps both operands as
            // ft/in-notation lengths rather than introducing that too.
            placeholder="e.g. 12'6&quot; + 4'2&quot;"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter" && result !== null) setExpr(formatResultForInput(result, outputUnit));
            }}
          />
          <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
            Bare numbers = metres. Suffix with &apos; &quot; ft in m2 m3 ft2 ft3 to mix units.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
