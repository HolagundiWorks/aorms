import { Close, Run, View } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import { useEffect, useState } from "react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import {
  openWellness,
  WELLNESS_REMINDER_EVENT,
  type WellnessReminderPayload,
} from "./wellnessExercises.js";

/**
 * Animated nudge above the taskbar — stretch or eye break. Wave 3 (Carbon):
 * stock `Button` + `@carbon/icons-react`; keeps the editorial banner classes.
 * Was MUI `Box`/`Button`/`IconButton`/`Typography`.
 */
export function WellnessReminderBanner() {
  const [active, setActive] = useState<WellnessReminderPayload | null>(null);

  useEffect(() => {
    const onReminder = (e: Event) => {
      const detail = (e as CustomEvent<WellnessReminderPayload>).detail;
      if (detail?.kind) setActive(detail);
    };
    window.addEventListener(WELLNESS_REMINDER_EVENT, onReminder);
    return () => window.removeEventListener(WELLNESS_REMINDER_EVENT, onReminder);
  }, []);

  if (!active) return null;

  const Icon = active.kind === "stretch" ? Run : View;
  const section = active.kind === "stretch" ? "stretch" : "eyes";

  return (
    <CarbonScope
      className={`esti-wellness-reminder esti-wellness-reminder--${active.kind}`}
      role="status"
      aria-live="polite"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span className="esti-wellness-reminder__icon-wrap" aria-hidden>
          <Icon size={16} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="cds--type-heading-compact-01" style={{ margin: 0 }}>
            {active.title}
          </p>
          <p className="cds--type-caption-01" style={{ margin: 0, color: "var(--cds-text-secondary)" }}>
            {active.subtitle}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            openWellness(section);
            setActive(null);
          }}
        >
          Start
        </Button>
        <Button
          hasIconOnly
          renderIcon={Close}
          iconDescription="Dismiss reminder"
          kind="ghost"
          size="sm"
          onClick={() => setActive(null)}
        />
      </div>
    </CarbonScope>
  );
}
