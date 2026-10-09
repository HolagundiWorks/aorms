import { describe, expect, it } from "vitest";
import { evaluateEntitlement } from "../lib/aqc/entitlement";
import { AqcRow, PushProjectBody } from "../lib/aqc/contract";

const now = new Date("2026-10-09T00:00:00Z");
describe("evaluateEntitlement (D4/D7)", () => {
  it("connects paid, unexpired studios", () => {
    for (const plan of ["STUDIO", "PROFESSIONAL", "ENTERPRISE"]) expect(evaluateEntitlement({ studioPublicId: "AORMS-S-X", plan, expiresAt: null, now }).connected).toBe(true);
    expect(evaluateEntitlement({ studioPublicId: "AORMS-S-X", plan: "STUDIO", expiresAt: "2027-01-01T00:00:00Z", now }).reason).toBe("OK");
  });
  it("refuses free/trial, expired and unlinked studios with a reason", () => {
    expect(evaluateEntitlement({ studioPublicId: "AORMS-S-X", plan: "FREE", expiresAt: null, now })).toMatchObject({ connected: false, reason: "PLAN_NOT_CONNECTED" });
    expect(evaluateEntitlement({ studioPublicId: "AORMS-S-X", plan: "TRIAL", expiresAt: null, now }).connected).toBe(false);
    expect(evaluateEntitlement({ studioPublicId: "AORMS-S-X", plan: "PROFESSIONAL", expiresAt: "2026-10-01T00:00:00Z", now })).toMatchObject({ connected: false, reason: "EXPIRED" });
    expect(evaluateEntitlement({ studioPublicId: null, plan: null, expiresAt: null, now })).toMatchObject({ connected: false, reason: "NO_STUDIO" });
  });
});

describe("contract", () => {
  it("accepts a take-off row with a minted row id and rejects unknown sections or oversize ids", () => {
    expect(AqcRow.safeParse({ section: "masonry", row_id: "a1", fields: { mark: "MW1", length: "18000" } }).success).toBe(true);
    expect(AqcRow.safeParse({ section: "nope", row_id: "a1", fields: {} }).success).toBe(false);
    expect(AqcRow.safeParse({ section: "masonry", row_id: "x".repeat(65), fields: {} }).success).toBe(false);
  });
  it("defaults the project payload", () => {
    const p = PushProjectBody.parse({ projectOfficeId: "8072d05b-bff6-4090-ac93-8907ab434ed2" });
    expect(p.formatVersion).toBe(17);
    expect(p.rows).toEqual([]);
  });
});

import { buildAqcSeed } from "../lib/aqc/seed";
describe("buildAqcSeed (portal -> AQC)", () => {
  it("fills AQC's project and party blocks from AORMS records", () => {
    const s = buildAqcSeed(
      { id: "p1", ref: "PRJ-1", title: "Lakeview Residence", city: "Hosapete", site_address: "Plot 4", contact_email: null, contact_phone: null },
      { company_name: "Aurelia", architect_name: "A. Rao", gstin: "29X", pan: "P", email: "a@x", phone: "9", address_line1: "12 MG Road", address_line2: null, city: "Hosapete", pincode: "583201", state: "KA" },
      { name: "Mr. Kumar", contact_person: null, email: null, phone: null },
      { name: "SLC", company_name: "Sri Lakshmi Constructions", contact_person: "S. Lakshmi", gstin: "29Y", pan: null, email: null, phone: null, city: "Hosapete" },
    );
    expect(s.project).toMatchObject({ name: "Lakeview Residence", location: "Plot 4, Hosapete", client_name: "Mr. Kumar", company_name: "Aurelia", hub_project_id: "p1", prepared_by_name: "A. Rao" });
    expect(s.project.address).toBe("12 MG Road, Hosapete, KA, 583201");
    expect(s.parties.pm.signatory_role).toBe("Project Manager");
    expect(s.parties.contractor.company).toBe("Sri Lakshmi Constructions");
    expect(buildAqcSeed({ id: "p", ref: "r", title: "t", city: null, site_address: null, contact_email: null, contact_phone: null }, { company_name: null, architect_name: null, gstin: null, pan: null, email: null, phone: null, address_line1: null, address_line2: null, city: null, pincode: null, state: null }, null, null).parties.contractor.company).toBe("");
  });
});

import { buildAqcStorageKey, checkAqcUpload } from "../lib/aqc/files";
describe("aqc file uploads", () => {
  const sha = "a".repeat(64);
  it("validates type, size and hash and mints a prefixed key", () => {
    expect(checkAqcUpload({ contentType: "application/pdf", sizeBytes: 1000, sha256: sha })).toEqual({ ok: true, ext: "pdf" });
    expect(checkAqcUpload({ contentType: "application/zip", sizeBytes: 1000, sha256: sha }).ok).toBe(false);
    expect(checkAqcUpload({ contentType: "application/pdf", sizeBytes: 26 * 1024 * 1024, sha256: sha }).ok).toBe(false);
    expect(checkAqcUpload({ contentType: "application/pdf", sizeBytes: 10, sha256: "xyz" }).ok).toBe(false);
    expect(buildAqcStorageKey("f1", "p1", "estimate", sha, "pdf")).toBe(`f1/p1/estimate/${sha}.pdf`);
  });
});
