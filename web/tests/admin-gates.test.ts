import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural guard (2026-10-01 audit R7): every exported `admin*` Server Action must
 * run an admin gate before doing anything. A "use server" export is a public POST
 * endpoint, so a missing gate is a privilege hole, not a style issue. This reads the
 * source rather than executing it, so it needs no Supabase.
 */
const dir = join(__dirname, "..", "lib", "actions");
const GATE = /(requirePlatformAdmin|requireSuperAdmin|requireSuperAdminOrError)\s*\(/;

describe("admin Server Actions are gated", () => {
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  const found: { file: string; name: string; gated: boolean }[] = [];
  for (const f of files) {
    const src = readFileSync(join(dir, f), "utf8");
    const re = /export async function (admin[A-Za-z0-9_]*)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const start = m.index;
      const next = src.indexOf("\nexport ", start + 10);
      const body = src.slice(start, next === -1 ? undefined : next);
      found.push({ file: f, name: m[1]!, gated: GATE.test(body) });
    }
  }
  it("finds the admin actions (guards against the regex silently matching nothing)", () => {
    expect(found.length).toBeGreaterThanOrEqual(10);
  });
  for (const a of found) {
    it(`${a.file}: ${a.name} calls an admin gate`, () => {
      expect(a.gated).toBe(true);
    });
  }
});
