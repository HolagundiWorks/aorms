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

import { findDuplicateCodes, hashRateItems, PublishRateBookBody } from "../lib/aqc/rate-books";
describe("aqc rate books", () => {
  const a = { code: "PCC-148", category: "Concrete", description: "PCC 1:4:8", unit: "cum", rate: 5200 };
  const b = { code: "RCC-M25", category: "Concrete", description: "RCC M25", unit: "cum", rate: 9800.5 };
  it("hashes independent of item order and sensitive to any change", () => {
    expect(hashRateItems("v1", "", [a, b])).toBe(hashRateItems("v1", "", [b, a]));
    expect(hashRateItems("v1", "", [a, b])).not.toBe(hashRateItems("v1", "", [a, { ...b, rate: 9801 }]));
    expect(hashRateItems("v1", "", [a, b])).not.toBe(hashRateItems("v2", "", [a, b]));
  });
  it("finds duplicate codes and validates the payload", () => {
    expect(findDuplicateCodes([a, a, b])).toEqual(["PCC-148"]);
    expect(PublishRateBookBody.safeParse({ clientId: "v1-default", name: "v1 Default", items: [a, { ...b, rate: -1 }] }).success).toBe(false);
    expect(PublishRateBookBody.parse({ clientId: "v1", name: "n", items: [a] }).activate).toBe(false);
  });
});
