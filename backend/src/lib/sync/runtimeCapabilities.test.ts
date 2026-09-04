import { beforeEach, describe, expect, it, vi } from "vitest";

const { envState } = vi.hoisted(() => ({
  envState: {
    ESTI_ROLE: "node" as "node" | "hub",
    ESTI_HUB_URL: "",
    INSTALL_ID: "",
    STORAGE_DRIVER: "s3",
    ESTI_DESKTOP: false,
  },
}));

vi.mock("../../env.js", () => ({
  env: envState,
}));

vi.mock("../plan.js", () => ({
  licenseState: vi.fn(async () => null),
}));

import { resolveRuntimeCapabilities } from "./runtimeCapabilities.js";

describe("resolveRuntimeCapabilities (LF5)", () => {
  beforeEach(() => {
    envState.ESTI_ROLE = "node";
    envState.ESTI_HUB_URL = "";
    envState.INSTALL_ID = "";
    envState.STORAGE_DRIVER = "s3";
    envState.ESTI_DESKTOP = false;
  });

  it("keeps web-parity localAi/localWorker false when not desktop", async () => {
    const caps = await resolveRuntimeCapabilities({} as never);
    expect(caps.host).toBe("web");
    expect(caps.localAi).toBe(false);
    expect(caps.localWorker).toBe(false);
    expect(caps.offlineAuthoring).toBe(false);
  });

  it("reports hub local AI/worker for ESTI_ROLE=hub", async () => {
    envState.ESTI_ROLE = "hub";
    const caps = await resolveRuntimeCapabilities({} as never);
    expect(caps.host).toBe("hub");
    expect(caps.localAi).toBe(true);
    expect(caps.localWorker).toBe(true);
  });

  it("enables free-desktop local AI without hub sync", async () => {
    envState.ESTI_DESKTOP = true;
    const caps = await resolveRuntimeCapabilities({} as never);
    expect(caps.host).toBe("desktop");
    expect(caps.localAi).toBe(true);
    expect(caps.metaSync).toBe(false);
    expect(caps.artifactSync).toBe(false);
  });
});
