import { describe, expect, it } from "vitest";
import { validateOutboundUrl } from "../lib/security/safe-url";

describe("validateOutboundUrl", () => {
  it("allows normal and local-model endpoints", () => {
    expect(validateOutboundUrl("https://api.openai.com/v1").ok).toBe(true);
    expect(validateOutboundUrl("http://127.0.0.1:11434").ok).toBe(true);
    expect(validateOutboundUrl("http://10.0.0.5:8080").ok).toBe(true);
  });
  it("blocks cloud metadata / link-local, odd schemes and credentials", () => {
    expect(validateOutboundUrl("http://169.254.169.254/latest/meta-data").ok).toBe(false);
    expect(validateOutboundUrl("http://metadata.google.internal/").ok).toBe(false);
    expect(validateOutboundUrl("http://[fe80::1]/").ok).toBe(false);
    expect(validateOutboundUrl("http://2852039166/").ok).toBe(false); // decimal form of 169.254.169.254
    expect(validateOutboundUrl("file:///etc/passwd").ok).toBe(false);
    expect(validateOutboundUrl("https://user:pw@example.com").ok).toBe(false);
    expect(validateOutboundUrl("not a url").ok).toBe(false);
  });
});
