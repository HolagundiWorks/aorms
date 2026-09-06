"use client";

/**
 * Header trigger for the Wellness module — breathing, desk stretches, and
 * eye exercises. Carbon-only rebuild of the old frontend's
 * components/wellness/WellnessPanel.tsx (MUI Tabs/Popover); no custom-UI
 * exception was granted for Wellness (only Pomodoro got one), so this uses
 * stock ContentSwitcher for section choice and Button/ProgressBar for the
 * guides themselves (see BreathGuide.tsx / RoutineGuide.tsx).
 */

import { useState } from "react";
import { Button, ContentSwitcher, HeaderGlobalAction, Popover, PopoverContent, Switch } from "@carbon/react";
import { Activity } from "@carbon/icons-react";
import { BREATHING_PATTERNS, breathingPattern } from "../../../lib/wellness/patterns";
import { STRETCH_ROUTINE, EYE_ROUTINE, type WellnessSection } from "../../../lib/wellness/exercises";
import { setWellnessPrefs, useWellnessPrefs } from "../../../lib/wellness/prefs";
import { BreathGuide } from "./BreathGuide";
import { RoutineGuide } from "./RoutineGuide";

const SECTIONS: WellnessSection[] = ["breathe", "stretch", "eyes"];
const SECTION_LABEL: Record<WellnessSection, string> = {
  breathe: "Breathe",
  stretch: "Stretch",
  eyes: "Eyes",
};

export function HeaderWellness() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<WellnessSection>("breathe");
  const [running, setRunning] = useState(false);
  const prefs = useWellnessPrefs();
  const pattern = breathingPattern(prefs.pattern);

  function switchSection(next: WellnessSection) {
    setSection(next);
    setRunning(false);
  }

  function choosePattern(key: string) {
    setWellnessPrefs({ pattern: key });
    setRunning(false);
  }

  return (
    <Popover
      open={open}
      onRequestClose={() => {
        setOpen(false);
        setRunning(false);
      }}
      align="bottom-end"
      caret
      highContrast
    >
      <HeaderGlobalAction aria-label="Wellbeing" isActive={open} onClick={() => setOpen((o) => !o)}>
        <Activity size={20} />
      </HeaderGlobalAction>
      <PopoverContent>
        <div style={{ padding: "1rem", width: "20rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <span className="cds--type-heading-compact-01">Wellbeing</span>

          <ContentSwitcher
            size="sm"
            selectedIndex={SECTIONS.indexOf(section)}
            onChange={({ index }) => switchSection(SECTIONS[index ?? 0]!)}
          >
            {SECTIONS.map((s) => (
              <Switch key={s} name={s} text={SECTION_LABEL[s]} />
            ))}
          </ContentSwitcher>

          {section === "breathe" ? (
            <>
              <BreathGuide pattern={pattern} running={running} onToggle={() => setRunning((r) => !r)} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", justifyContent: "center" }}>
                {BREATHING_PATTERNS.map((p) => (
                  <Button
                    key={p.key}
                    kind={p.key === prefs.pattern ? "primary" : "ghost"}
                    size="sm"
                    title={p.goal}
                    onClick={() => choosePattern(p.key)}
                  >
                    {p.name.split(" ")[0]}
                  </Button>
                ))}
              </div>
            </>
          ) : null}

          {section === "stretch" ? (
            <RoutineGuide routine={STRETCH_ROUTINE} running={running} onToggle={() => setRunning((r) => !r)} />
          ) : null}

          {section === "eyes" ? (
            <RoutineGuide routine={EYE_ROUTINE} running={running} onToggle={() => setRunning((r) => !r)} />
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
