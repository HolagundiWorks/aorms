import { describe, expect, it } from "vitest";
import { ActivateResult } from "./licensing-platform.js";
import {
  FREE_DESKTOP_CAPABILITIES,
  LICENSED_DESKTOP_CAPABILITIES,
  MetaEventBody,
  MetaCatchUpQuery,
  SyncIngestBody,
  SyncEntity,
  syncPlaneFor,
  WEB_PARITY_CAPABILITIES,
} from "./sync.js";

describe("syncPlaneFor", () => {
  it("classifies field-map keys", () => {
    expect(syncPlaneFor("task")).toBe("metadata");
    expect(syncPlaneFor("estimateLines")).toBe("localOnly");
    expect(syncPlaneFor("invoicePdf")).toBe("artifact");
    expect(syncPlaneFor("aiChat")).toBe("localOnly");
  });

  it("classifies SyncEntity / MetaEntity enums", () => {
    expect(syncPlaneFor("invoice")).toBe("artifact");
    expect(syncPlaneFor("drawing")).toBe("artifact");
    expect(syncPlaneFor("estimateTotals")).toBe("metadata");
  });
});

describe("SyncIngestBody", () => {
  it("accepts extended SyncEntity set + optional contentHash", () => {
    for (const entity of SyncEntity.options) {
      const parsed = SyncIngestBody.parse({
        entity,
        entityId: "x",
        contentHash: "abc",
      });
      expect(parsed.entity).toBe(entity);
      expect(parsed.contentHash).toBe("abc");
    }
  });
});

describe("MetaEventBody", () => {
  it("defaults stream and conflict policy", () => {
    const e = MetaEventBody.parse({
      entity: "task",
      entityId: "t1",
      patch: { status: "DONE" },
    });
    expect(e.stream).toBe("firm");
    expect(e.conflict).toBe("lwwField");
    expect(e.op).toBe("UPSERT");
  });
});

describe("MetaCatchUpQuery", () => {
  it("coerces afterSeq", () => {
    const q = MetaCatchUpQuery.parse({ afterSeq: "12", limit: "50" });
    expect(q.afterSeq).toBe(12);
    expect(q.limit).toBe(50);
  });
});

describe("RuntimeCapabilities presets", () => {
  it("keeps free desktop offline-only for sync planes", () => {
    expect(FREE_DESKTOP_CAPABILITIES.metaSync).toBe(false);
    expect(FREE_DESKTOP_CAPABILITIES.artifactSync).toBe(false);
    expect(LICENSED_DESKTOP_CAPABILITIES.metaSync).toBe(true);
    expect(WEB_PARITY_CAPABILITIES.offlineAuthoring).toBe(false);
  });
});

describe("ActivateResult hub API 2026-08 syncToken", () => {
  const entitlement = {
    licenseId: "lic_x",
    orgId: "org_x",
    orgName: "Acme",
    productCode: "AORMS",
    planCode: "PRO",
    status: "ACTIVE" as const,
    seats: 5,
    deviceLimit: 2,
    meterLimit: null,
    features: [],
    expiresAt: null,
  };

  it("accepts activate payload with syncToken", () => {
    const r = ActivateResult.parse({
      licenseToken: "tok",
      entitlement,
      syncToken: "sync-bearer",
    });
    expect(r.syncToken).toBe("sync-bearer");
  });

  it("allows refresh without syncToken (no rotation)", () => {
    const r = ActivateResult.parse({ licenseToken: "tok", entitlement });
    expect(r.syncToken).toBeUndefined();
  });
});
