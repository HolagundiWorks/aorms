import { afterEach, describe, expect, it, vi } from "vitest";
import { isMarketingAuthPath, isMarketingOnly, MARKETING_AUTH_PATHS } from "./marketing-gate.js";

describe("isMarketingOnly", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to marketing-only when no env vars are set (soft launch default)", () => {
    vi.stubEnv("VITE_MARKETING_ONLY", "");
    vi.stubEnv("VITE_PUBLIC_SITE", "");
    expect(isMarketingOnly()).toBe(true);
  });

  it("stays marketing-only when VITE_PUBLIC_SITE is anything but explicit 'false'", () => {
    vi.stubEnv("VITE_MARKETING_ONLY", "");
    vi.stubEnv("VITE_PUBLIC_SITE", "true");
    expect(isMarketingOnly()).toBe(true);
  });

  it("turns off only when VITE_PUBLIC_SITE is explicitly 'false'", () => {
    vi.stubEnv("VITE_MARKETING_ONLY", "");
    vi.stubEnv("VITE_PUBLIC_SITE", "false");
    expect(isMarketingOnly()).toBe(false);
  });

  it.each(["false", "0", "off", "no", "FALSE", " False "])(
    "VITE_MARKETING_ONLY=%j overrides the default off (this is the S8 switch)",
    (value) => {
      vi.stubEnv("VITE_MARKETING_ONLY", value);
      expect(isMarketingOnly()).toBe(false);
    },
  );

  it.each(["true", "1", "on", "yes", "TRUE"])(
    "VITE_MARKETING_ONLY=%j forces marketing-only on even if VITE_PUBLIC_SITE=false",
    (value) => {
      vi.stubEnv("VITE_MARKETING_ONLY", value);
      vi.stubEnv("VITE_PUBLIC_SITE", "false");
      expect(isMarketingOnly()).toBe(true);
    },
  );

  it("an unrecognized VITE_MARKETING_ONLY value falls back to the soft-launch default", () => {
    vi.stubEnv("VITE_MARKETING_ONLY", "maybe");
    vi.stubEnv("VITE_PUBLIC_SITE", "false");
    expect(isMarketingOnly()).toBe(false);
  });
});

describe("isMarketingAuthPath", () => {
  it("matches every gated path exactly", () => {
    for (const path of MARKETING_AUTH_PATHS) {
      expect(isMarketingAuthPath(path)).toBe(true);
    }
  });

  it("matches nested paths under a gated prefix", () => {
    expect(isMarketingAuthPath("/login/foo")).toBe(true);
    expect(isMarketingAuthPath("/account/settings")).toBe(true);
  });

  it("tolerates a trailing slash", () => {
    expect(isMarketingAuthPath("/login/")).toBe(true);
  });

  it("does not match public marketing paths", () => {
    expect(isMarketingAuthPath("/")).toBe(false);
    expect(isMarketingAuthPath("/blog")).toBe(false);
    expect(isMarketingAuthPath("/blog/some-post")).toBe(false);
    expect(isMarketingAuthPath("/downloads")).toBe(false);
  });

  it("does not false-positive on a path that merely starts with a gated segment's letters", () => {
    // "/loginx" is a different route than "/login" and must not be gated.
    expect(isMarketingAuthPath("/loginx")).toBe(false);
  });
});
