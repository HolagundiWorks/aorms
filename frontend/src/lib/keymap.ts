/**
 * Shared shell keymap — one module for desktop + web parity (LF5).
 *
 * Canvas-local shortcuts (moodboard zoom, plan reader) stay in their screens.
 * Help (`/help`) and tooltips read labels/chords from here so they cannot drift.
 */

export type KeyCommandId =
  | "search"
  | "askEsti"
  | "calculator"
  | "pomodoro"
  | "help";

export type KeyBinding = {
  id: KeyCommandId;
  label: string;
  /** Primary chord for tooltips (Windows/Linux wording; ⌘ noted in Help). */
  chord: string;
  /** Also list Mac / alternate in Help. */
  altChords?: string[];
  description: string;
  /** When true, ignore the binding if focus is in an editable field. */
  ignoreInEditable?: boolean;
  match: (e: KeyboardEvent) => boolean;
};

export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

export const SHELL_KEYMAP: readonly KeyBinding[] = [
  {
    id: "search",
    label: "Search",
    chord: "Ctrl+K",
    altChords: ["⌘K"],
    description: "Open global search",
    ignoreInEditable: true,
    match: (e) => (e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K"),
  },
  {
    id: "askEsti",
    label: "Ask ESTI",
    chord: "Alt+A",
    description: "Open or close Ask ESTI in the right slot",
    match: (e) => e.altKey && (e.key === "a" || e.key === "A"),
  },
  {
    id: "calculator",
    label: "Calculator",
    chord: "Alt+C",
    description: "Toggle the floating calculator",
    match: (e) => e.altKey && (e.key === "c" || e.key === "C"),
  },
  {
    id: "pomodoro",
    label: "Focus timer",
    chord: "Alt+T",
    description: "Toggle the Pomodoro focus timer",
    match: (e) => e.altKey && (e.key === "t" || e.key === "T"),
  },
  {
    id: "help",
    label: "Keyboard shortcuts",
    chord: "Ctrl+/",
    altChords: ["⌘/"],
    description: "Open this Help page",
    ignoreInEditable: true,
    match: (e) => (e.metaKey || e.ctrlKey) && e.key === "/",
  },
] as const;

export function bindingFor(id: KeyCommandId): KeyBinding {
  const b = SHELL_KEYMAP.find((k) => k.id === id);
  if (!b) throw new Error(`Unknown keymap id: ${id}`);
  return b;
}

export function tooltipWithChord(label: string, id: KeyCommandId): string {
  return `${label} (${bindingFor(id).chord})`;
}

/**
 * Register shell key handlers once. Pass only the commands this mount owns;
 * other IDs are ignored so multiple mounts can share the table without clashes
 * (e.g. footer owns search/calc/help; Ask ESTI owns askEsti; Pomodoro owns pomodoro).
 */
export function matchShellKey(
  e: KeyboardEvent,
  handlers: Partial<Record<KeyCommandId, () => void>>,
): boolean {
  for (const binding of SHELL_KEYMAP) {
    const handler = handlers[binding.id];
    if (!handler) continue;
    if (binding.ignoreInEditable && isEditableTarget(e.target)) continue;
    if (!binding.match(e)) continue;
    e.preventDefault();
    handler();
    return true;
  }
  return false;
}
