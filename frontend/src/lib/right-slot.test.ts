import { afterEach, describe, expect, it } from "vitest";
import {
  clearInspector,
  closeRightSlot,
  getRightSlotState,
  openRightSlot,
  publishInspector,
  setRightSlotTab,
  toggleAskEstiSlot,
} from "./right-slot.js";

afterEach(() => {
  closeRightSlot();
  clearInspector();
});

describe("right-slot (LF6)", () => {
  it("opens Ask ESTI on the ask tab", () => {
    openRightSlot("ask");
    const s = getRightSlotState();
    expect(s.open).toBe(true);
    expect(s.tab).toBe("ask");
  });

  it("toggles Ask ESTI closed when already on ask", () => {
    openRightSlot("ask");
    toggleAskEstiSlot();
    expect(getRightSlotState().open).toBe(false);
  });

  it("switches to ask when open on properties", () => {
    openRightSlot("properties");
    toggleAskEstiSlot();
    const s = getRightSlotState();
    expect(s.open).toBe(true);
    expect(s.tab).toBe("ask");
  });

  it("publishes inspector onto the properties tab", () => {
    publishInspector({
      title: "Task T-1",
      subtitle: "In progress",
      fields: [{ label: "Owner", value: "Asha" }],
    });
    const s = getRightSlotState();
    expect(s.open).toBe(true);
    expect(s.tab).toBe("properties");
    expect(s.inspector?.title).toBe("Task T-1");
    expect(s.inspector?.fields?.[0]?.value).toBe("Asha");
  });

  it("keeps one slot when switching tabs", () => {
    openRightSlot("ask");
    setRightSlotTab("properties");
    expect(getRightSlotState().open).toBe(true);
    expect(getRightSlotState().tab).toBe("properties");
    setRightSlotTab("ask");
    expect(getRightSlotState().tab).toBe("ask");
  });
});
