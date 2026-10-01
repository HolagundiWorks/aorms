import { describe, expect, it } from "vitest";
import { isSharedPath, ownerOf, portalFromHost, portalUrl, resolvePortalHomeFromHost } from "../lib/platform/subdomains";

describe("portal routing table", () => {
  it("assigns portal-owned paths", () => {
    expect(ownerOf("/identity")).toBe("identity");
    expect(ownerOf("/admin/accounts")).toBe("sysdex");
    expect(ownerOf("/connectdex")).toBe("connectdex");
  });
  it("leaves Office Hub / marketing paths unowned", () => {
    expect(ownerOf("/pulse")).toBeNull();
    expect(ownerOf("/")).toBeNull();
  });
  it("does not treat a longer sibling name as owned (prefix boundary)", () => {
    expect(ownerOf("/identityfoo")).toBeNull();
    expect(ownerOf("/administrator")).toBeNull();
  });
  it("shares login/signup/support", () => {
    expect(isSharedPath("/platform-login")).toBe(true);
    expect(isSharedPath("/support")).toBe(true);
    expect(isSharedPath("/pulse")).toBe(false);
  });
  it("resolves portals from the Host header, ignoring port", () => {
    expect(portalFromHost("sysdex.aorms.in")).toBe("sysdex");
    expect(portalFromHost("identity.aorms.in:3000")).toBe("identity");
    expect(portalFromHost("aorms.in")).toBeNull();
    expect(portalFromHost(null)).toBeNull();
    expect(portalFromHost("evil.example.com")).toBeNull();
  });
  it("defaults post-auth home to Identity and builds https URLs without a port", () => {
    expect(resolvePortalHomeFromHost("aorms.in")).toBe("/identity");
    expect(portalUrl("sysdex", "/admin")).toBe("https://sysdex.aorms.in/admin");
  });
});
