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
  it("opens the properties inspector", () => {
    openRightSlot("properties");
    const s = getRightSlotState();
    expect(s.open).toBe(true);
    expect(s.tab).toBe("properties");
  });

  it("ignores Ask ESTI open requests", () => {
    openRightSlot("ask");
    expect(getRightSlotState().tab).toBe("properties");
    toggleAskEstiSlot();
    expect(getRightSlotState().open).toBe(true);
    expect(getRightSlotState().tab).toBe("properties");
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

  it("keeps properties when ask tab is requested", () => {
    openRightSlot("properties");
    setRightSlotTab("ask");
    expect(getRightSlotState().open).toBe(true);
    expect(getRightSlotState().tab).toBe("properties");
  });
});
