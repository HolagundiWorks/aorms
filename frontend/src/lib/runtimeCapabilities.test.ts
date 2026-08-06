import { describe, expect, it } from "vitest";
import { resolveAiCompute } from "./runtimeCapabilities.js";

describe("resolveAiCompute", () => {
  it("marks desktop + localAi as Local", () => {
    expect(resolveAiCompute("desktop", true)).toBe("local");
  });

  it("marks web as Hosted even when hub reports localAi", () => {
    expect(resolveAiCompute("web", true)).toBe("hosted");
    expect(resolveAiCompute("web", false)).toBe("hosted");
  });

  it("marks unbound desktop without localAi as Hosted", () => {
    expect(resolveAiCompute("desktop", false)).toBe("hosted");
  });
});
