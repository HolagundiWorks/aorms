import { describe, expect, it } from "vitest";
import { AddVersionBody, AQC_APPS, SessionBody, UploadInitBody } from "../lib/aqc/contract";
import { checkAqcUpload } from "../lib/aqc/files";

describe("suite sign-in contract (AAD + AQC)", () => {
  it("defaults a session to the aqc app and accepts aad", () => {
    expect(SessionBody.parse({}).app).toBe("aqc");
    expect(SessionBody.parse({ app: "aad", clientLabel: "AAD 0.5 · PC" }).app).toBe("aad");
    expect(AQC_APPS).toEqual(["aqc", "aad"]);
  });
  it("refuses an unknown app", () => {
    expect(SessionBody.safeParse({ app: "other" }).success).toBe(false);
  });
  it("accepts the cad_bridge version kind for versions and uploads", () => {
    expect(AddVersionBody.safeParse({ kind: "cad_bridge", contentHash: "a".repeat(64), summary: { drawing_id: "d1" }, storageKey: "f/p/cad_bridge/x.json" }).success).toBe(true);
    expect(UploadInitBody.safeParse({ kind: "cad_bridge", contentType: "application/json", sizeBytes: 100, sha256: "a".repeat(64) }).success).toBe(true);
    expect(AddVersionBody.safeParse({ kind: "nope", contentHash: "a".repeat(64) }).success).toBe(false);
  });
  it("allows the bridge JSON as an upload, still not arbitrary types", () => {
    expect(checkAqcUpload({ contentType: "application/json", sizeBytes: 1000, sha256: "a".repeat(64) })).toEqual({ ok: true, ext: "json" });
    expect(checkAqcUpload({ contentType: "text/html", sizeBytes: 1000, sha256: "a".repeat(64) }).ok).toBe(false);
  });
});
