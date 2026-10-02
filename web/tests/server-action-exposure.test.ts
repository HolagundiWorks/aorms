import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every export of a "use server" file is a network-callable Server Action. Session-minting
 * and other internal helpers must live in plain modules (2026-10-02 security audit: the
 * Office Hub <-> Platform bridge functions were exported from "use server" files).
 */
const FORBIDDEN_IN_USE_SERVER = ["bridgeIdentityToOfficeHub", "bridgeOfficeHubToIdentity", "resolveSignInDestination", "signOutSafely"];
const dir = join(__dirname, "..", "lib", "actions");

describe("internal helpers are not exposed as Server Actions", () => {
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts"))) {
    const src = readFileSync(join(dir, f), "utf8");
    if (!src.trimStart().startsWith('"use server"')) continue;
    it(`${f} exports none of the session-minting helpers`, () => {
      for (const name of FORBIDDEN_IN_USE_SERVER) {
        expect(new RegExp(`export\\s+(async\\s+)?function\\s+${name}\\b`).test(src)).toBe(false);
      }
    });
  }
  it("lib/auth/bridge.ts is not itself a 'use server' module", () => {
    const src = readFileSync(join(__dirname, "..", "lib", "auth", "bridge.ts"), "utf8");
    expect(src.includes('"use server"') && src.trimStart().startsWith('"use server"')).toBe(false);
  });
});
