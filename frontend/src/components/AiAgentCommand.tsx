import { useEffect } from "react";
import { matchShellKey } from "../lib/keymap.js";
import {
  ASK_ESTI_EVENT,
  toggleAskEstiSlot,
} from "../lib/right-slot.js";

/**
 * Ask ESTI shell glue — opens the LF6 right slot Ask tab.
 * Panel UI lives in {@link AskEstiPanel} inside {@link RightSlot}.
 * Alt+A (shared keymap) / `esti:ask` toggle the same slot (no floating second chrome).
 * Re-exported for the taskbar footer + any legacy imports.
 */
export { ASK_ESTI_EVENT };

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
