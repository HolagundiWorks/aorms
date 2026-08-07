import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveInstallerOffer } from "./desktop-installers.js";

describe("resolveInstallerOffer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("forces coming_soon when marketing-only soft launch is on", () => {
    vi.stubEnv("VITE_MARKETING_ONLY", "true");
    const offer = resolveInstallerOffer("astudio", {
      app: "astudio",
      product: "AStudio",
      status: "available",
      url: "https://cdn.example.com/AStudio-Setup.exe",
      sha256: "a".repeat(64),
    });
    expect(offer.status).toBe("coming_soon");
    expect(offer.downloadUrl).toBeNull();
  });

  it("stays web_fallback when manifest is a placeholder", () => {
    vi.stubEnv("VITE_MARKETING_ONLY", "false");
    const offer = resolveInstallerOffer("astudio", {
      app: "astudio",
      product: "AStudio",
      status: "web_fallback",
      url: "",
      sha256: "",
    });
    expect(offer.status).toBe("web_fallback");
    expect(offer.downloadUrl).toBeNull();
  });

  it("does not use manifest URL without VITE_PORTAL_USE_RELEASE_INSTALLERS", () => {
    vi.stubEnv("VITE_MARKETING_ONLY", "false");
    const offer = resolveInstallerOffer("astudio", {
      app: "astudio",
      product: "AStudio",
      status: "available",
      url: "https://cdn.example.com/AStudio-Setup.exe",
      sha256: "a".repeat(64),
      version: "0.1.0",
    });
    expect(offer.status).toBe("web_fallback");
    expect(offer.downloadUrl).toBeNull();
  });

  it("uses manifest when release flag is on and sha256 is valid", () => {
    vi.stubEnv("VITE_MARKETING_ONLY", "false");
    vi.stubEnv("VITE_PORTAL_USE_RELEASE_INSTALLERS", "true");
    const offer = resolveInstallerOffer("aconsulting", {
      app: "aconsulting",
      product: "AConsulting",
      status: "available",
      url: "https://cdn.example.com/AConsulting-Setup.exe",
      sha256: "b".repeat(64),
      version: "0.2.0",
    });
    expect(offer.status).toBe("available");
    expect(offer.downloadUrl).toBe("https://cdn.example.com/AConsulting-Setup.exe");
    expect(offer.version).toBe("0.2.0");
  });

  it("prefers explicit env installer URL over manifest", () => {
    vi.stubEnv("VITE_MARKETING_ONLY", "false");
    vi.stubEnv("VITE_ASTUDIO_INSTALLER_URL", "https://releases.aorms.in/astudio-signed.exe");
    const offer = resolveInstallerOffer("astudio", {
      app: "astudio",
      product: "AStudio",
      status: "web_fallback",
      url: "",
      sha256: "",
    });
    expect(offer.status).toBe("available");
    expect(offer.downloadUrl).toBe("https://releases.aorms.in/astudio-signed.exe");
  });
});
