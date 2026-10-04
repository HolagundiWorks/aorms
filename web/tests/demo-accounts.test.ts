import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import accounts from "../lib/demo-accounts.json";

const migration = readFileSync(new URL("../supabase/migrations/0094_demo_role_accounts.sql", import.meta.url), "utf8");

describe("demo roster", () => {
  it("matches the demo_roster seed in migration 0094 (email, name, role)", () => {
    for (const a of accounts) {
      expect(migration).toContain(`('${a.email}', '${a.name}', '${a.role}')`);
    }
    const seeded = [...migration.matchAll(/^\s+\('([^']+@[^']+)', '[^']+', '[A-Z_]+'\)/gm)].map((m) => m[1]);
    expect(seeded.sort()).toEqual(accounts.map((a) => a.email).sort());
  });

  it("has unique emails and covers every office level plus the three portals", () => {
    expect(new Set(accounts.map((a) => a.email)).size).toBe(accounts.length);
    const roles = accounts.map((a) => a.role);
    for (const r of ["OWNER", "PARTNER", "SENIOR", "ACCOUNTANT", "HR_MANAGER", "ASSOCIATE", "VIEWER", "CLIENT", "CONSULTANT", "CONTRACTOR"]) {
      expect(roles).toContain(r);
    }
  });
});
