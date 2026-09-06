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
    <Popover open={open} onRequestClose={() => setOpen(false)} align="bottom-end" caret highContrast>
      <HeaderGlobalAction
        aria-label="Calculator"
        isActive={open}
        onClick={() => setOpen((o) => !o)}
      >
        <CalculatorIcon size={20} />
      </HeaderGlobalAction>
      <PopoverContent>
        <div style={{ padding: "1rem", width: "18.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="cds--type-heading-compact-01">Calculator</span>
            <Toggle
              id="calc-output-unit"
              size="sm"
              labelText=""
              labelA="m"
              labelB="ft·in"
              toggled={outputUnit === "imperial"}
              onToggle={(checked: boolean) => setOutputUnit(checked ? "imperial" : "metric")}
            />
          </div>

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
            placeholder="e.g. 12'6&quot; + 3.2m2 * 2"
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
