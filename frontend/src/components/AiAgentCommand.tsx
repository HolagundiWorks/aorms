import { useEffect } from "react";
import { matchShellKey } from "../lib/keymap.js";
import {
  ASK_ESTI_EVENT,
  toggleAskEstiSlot,
} from "../lib/right-slot.js";

/** Re-export for taskbar footer + any legacy imports. */
export { ASK_ESTI_EVENT };

/**
 * Ask ESTI shell glue — opens the LF6 right slot Ask tab.
 * Panel UI lives in {@link AskEstiPanel} inside {@link RightSlot}.
 * Alt+A (shared keymap) / `esti:ask` toggle the same slot (no floating second chrome).
 */
export { ASK_ESTI_EVENT } from "../lib/right-slot.js";

export function AiAgentCommand() {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      matchShellKey(e, { askEsti: () => toggleAskEstiSlot() });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Window `esti:ask` is wired once in RightSlot via wireRightSlotWindowEvents.
  return null;
}
