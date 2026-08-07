import { describe, expect, it } from "vitest";
import { visibleFirmPortalSections } from "./FirmPortalShell.js";

describe("visibleFirmPortalSections", () => {
  it("shows Updates only when panels are omitted", () => {
    expect(visibleFirmPortalSections()).toEqual(["updates"]);
    expect(visibleFirmPortalSections(null)).toEqual(["updates"]);
    expect(visibleFirmPortalSections({})).toEqual(["updates"]);
  });

  it("includes only wired panel tabs", () => {
    expect(
      visibleFirmPortalSections({
        project: "p",
        drawings: "d",
      }),
    ).toEqual(["updates", "project", "drawings"]);
  });
});
