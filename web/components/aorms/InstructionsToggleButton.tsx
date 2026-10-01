"use client";

import { useState } from "react";
import { Information } from "@carbon/icons-react";
import { INSTRUCTIONS_COOKIE } from "../../lib/shell/preferences";

/**
 * Portal-header counterpart of the Office Hub's side-panel "Instructions"
 * entry. Updates the nearest `[data-instructions]` scope (InstructionsScope)
 * and the shared cookie. A plain icon button styled as a Carbon header action
 * (`cds--header__action`) so it sits correctly in any Carbon `Header`.
 */
export function InstructionsToggleButton({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const toggle = () => {
    const next = !on;
    setOn(next);
    document.querySelectorAll("[data-instructions]").forEach((el) => el.setAttribute("data-instructions", next ? "on" : "off"));
    try {
      document.cookie = `${INSTRUCTIONS_COOKIE}=${next ? "on" : "off"}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* cookies blocked — toggles for this visit only */
    }
  };
  return (
    <button
      type="button"
      className={`cds--header__action${on ? " cds--header__action--active" : ""}`}
      aria-label={`Instructions ${on ? "on" : "off"} — click to ${on ? "hide" : "show"} how-to notes`}
      aria-pressed={on}
      title={`Instructions: ${on ? "on" : "off"}`}
      onClick={toggle}
    >
      <Information size={20} />
    </button>
  );
}
