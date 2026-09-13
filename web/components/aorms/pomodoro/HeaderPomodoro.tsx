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
        aria-label={pom.running ? `Pomodoro timer — ${fmtPomTime(pom.timeLeft)} remaining` : "Pomodoro timer"}
        isActive={open}
        onClick={() => setOpen((o) => !o)}
      >
        {/* 2026-09-14 shell audit: `.cds--header__action` is a FIXED
            48px (mini-units(6)) box in Carbon's own CSS, not auto-sizing
            to content — an icon-plus-text side-by-side layout would
            overflow that box, exactly the class of bug this audit is
            hunting for elsewhere. Swapping the icon for a compact,
            centered digit readout while running (bounded to "MM:SS",
            never wider than the box) is the actual Carbon-compatible way
            to show this live state, so the swap itself is kept — what
            was missing was an aria-label that still names the control
            when the icon is gone (fixed above) and confirmation the text
            never exceeds the fixed box (verified live: "24:59" at
            cds--type-label-01 sits well inside 48px with room to spare). */}
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
