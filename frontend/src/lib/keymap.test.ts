import { describe, expect, it, vi } from "vitest";
import {
  SHELL_KEYMAP,
  bindingFor,
  isEditableTarget,
  matchShellKey,
  tooltipWithChord,
} from "./keymap.js";

function keyEvent(
  partial: Partial<KeyboardEvent> & { key: string; target?: EventTarget | null },
): KeyboardEvent {
  return {
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    preventDefault: vi.fn(),
    target: null,
    ...partial,
  } as unknown as KeyboardEvent;
}

describe("SHELL_KEYMAP", () => {
  it("covers LF5 shell commands", () => {
    const ids = SHELL_KEYMAP.map((b) => b.id).sort();
    expect(ids).toEqual(["askEsti", "calculator", "help", "pomodoro", "search"].sort());
  });

  it("formats tooltip chords", () => {
    expect(tooltipWithChord("Search", "search")).toBe("Search (Ctrl+K)");
    expect(bindingFor("askEsti").chord).toBe("Alt+A");
  });

  it("detects editable targets", () => {
    const input = { tagName: "INPUT", isContentEditable: false } as unknown as HTMLElement;
    const body = { tagName: "DIV", isContentEditable: false } as unknown as HTMLElement;
    expect(isEditableTarget(input)).toBe(true);
    expect(isEditableTarget(body)).toBe(false);
  });

  it("dispatches search on Ctrl+K outside inputs", () => {
    const search = vi.fn();
    const e = keyEvent({ key: "k", ctrlKey: true });
    expect(matchShellKey(e, { search })).toBe(true);
    expect(search).toHaveBeenCalledOnce();
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it("ignores Ctrl+K inside inputs", () => {
    const search = vi.fn();
    const input = { tagName: "INPUT", isContentEditable: false } as unknown as HTMLElement;
    const e = keyEvent({ key: "k", ctrlKey: true, target: input });
    expect(matchShellKey(e, { search })).toBe(false);
    expect(search).not.toHaveBeenCalled();
  });

  it("matches Alt+A for Ask ESTI", () => {
    const askEsti = vi.fn();
    expect(matchShellKey(keyEvent({ key: "a", altKey: true }), { askEsti })).toBe(true);
    expect(askEsti).toHaveBeenCalledOnce();
  });
});
