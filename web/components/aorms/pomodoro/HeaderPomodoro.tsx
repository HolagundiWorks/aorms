"use client";

/**
 * Header trigger for the Pomodoro timer — a HeaderGlobalAction (stock
 * Carbon chrome) opening a Carbon Popover whose content is the custom
 * PomodoroRing dial (see that file's docstring for why custom UI is
 * licensed here specifically).
 */

import { useState } from "react";
import { HeaderGlobalAction, Popover, PopoverContent } from "@carbon/react";
import { Timer } from "@carbon/icons-react";
import { fmtPomTime, usePomodoro } from "./PomodoroContext";
import { PomodoroRing } from "./PomodoroRing";

export function HeaderPomodoro() {
  const [open, setOpen] = useState(false);
  const pom = usePomodoro();

  return (
    <Popover open={open} onRequestClose={() => setOpen(false)} align="bottom-end" caret highContrast>
      <HeaderGlobalAction
        aria-label="Pomodoro timer"
        isActive={open}
        onClick={() => setOpen((o) => !o)}
      >
        {pom.running ? (
          <span className="cds--type-label-01" style={{ fontVariantNumeric: "tabular-nums" }}>
            {fmtPomTime(pom.timeLeft)}
          </span>
        ) : (
          <Timer size={20} />
        )}
      </HeaderGlobalAction>
      <PopoverContent>
        <div style={{ padding: "1rem" }}>
          <PomodoroRing />
        </div>
      </PopoverContent>
    </Popover>
  );
}
