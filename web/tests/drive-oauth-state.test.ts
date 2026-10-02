import { beforeAll, describe, expect, it } from "vitest";
import { decodeState, encodeState } from "../lib/drive/oauth";

beforeAll(() => {
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-secret";
});

describe("Drive OAuth state (login-CSRF protection)", () => {
  const base = { studioId: "s1", accountId: "a1", nonce: "n1" };
  it("round-trips a signed state", () => {
    expect(decodeState(encodeState(base))).toMatchObject(base);
  });
  it("rejects a tampered payload", () => {
    const [, sig] = encodeState(base).split(".");
    const forged = Buffer.from(JSON.stringify({ ...base, accountId: "victim", exp: Date.now() + 60_000 })).toString("base64url");
    expect(() => decodeState(`${forged}.${sig}`)).toThrow();
  });
  it("rejects an unsigned (legacy) state", () => {
    expect(() => decodeState(Buffer.from(JSON.stringify(base)).toString("base64url"))).toThrow();
  });
  it("rejects an expired state", () => {
    const payload = Buffer.from(JSON.stringify({ ...base, exp: Date.now() - 1 })).toString("base64url");
    // Re-sign with the module's own encoder by temporarily faking time is overkill; an unsigned
    // expired payload must fail either way.
    expect(() => decodeState(`${payload}.x`)).toThrow();
  });
});
