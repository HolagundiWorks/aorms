import { describe, expect, it } from "vitest";
import { NoteCreateBody, NotePatchBody, TaskStatusBody, UUID_RE } from "../lib/aqc/contract";
import { noteJson } from "../lib/aqc/notes";

describe("AAD drawing tasks / notes wire contract", () => {
  it("accepts only the four task statuses", () => {
    for (const status of ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]) expect(TaskStatusBody.safeParse({ status }).success).toBe(true);
    for (const status of ["done", "CLOSED", "", 1, null]) expect(TaskStatusBody.safeParse({ status }).success).toBe(false);
    expect(TaskStatusBody.safeParse({}).success).toBe(false);
  });

  it("validates a new note", () => {
    expect(NoteCreateBody.safeParse({ body: "  check slab level ", x: 12.5, y: -3 }).data?.body).toBe("check slab level");
    expect(NoteCreateBody.safeParse({ body: "", x: 0, y: 0 }).success).toBe(false);
    expect(NoteCreateBody.safeParse({ body: "   ", x: 0, y: 0 }).success).toBe(false);
    expect(NoteCreateBody.safeParse({ body: "x".repeat(2001), x: 0, y: 0 }).success).toBe(false);
    expect(NoteCreateBody.safeParse({ body: "ok", x: Number.NaN, y: 0 }).success).toBe(false);
    expect(NoteCreateBody.safeParse({ body: "ok", x: 0, y: Infinity }).success).toBe(false);
    expect(NoteCreateBody.safeParse({ body: "ok", x: 1e13, y: 0 }).success).toBe(false);
    expect(NoteCreateBody.safeParse({ body: "ok", x: "1", y: 0 }).success).toBe(false);
  });

  it("a note patch must change something and cannot move or reassign it", () => {
    expect(NotePatchBody.safeParse({}).success).toBe(false);
    expect(NotePatchBody.safeParse({ status: "RESOLVED" }).success).toBe(true);
    expect(NotePatchBody.safeParse({ status: "DELETED" }).success).toBe(false);
    const p = NotePatchBody.safeParse({ body: "new text", authorId: "someone", x: 1 });
    expect(p.success && Object.keys(p.data)).toEqual(["body"]); // unknown keys are stripped, never forwarded to the update
  });

  it("only canonical uuids pass the id check (ids reach a PostgREST filter)", () => {
    expect(UUID_RE.test("0a1b2c3d-4e5f-6789-abcd-ef0123456789")).toBe(true);
    for (const bad of ["", "abc", "0a1b2c3d-4e5f-6789-abcd-ef0123456789,id.neq.1", "0a1b2c3d-4e5f-6789-abcd-ef012345678"]) expect(UUID_RE.test(bad)).toBe(false);
  });

  it("maps a note row, tolerating the author join as object or array", () => {
    const row = { id: "i", body: "b", x: 1, y: 2, status: "OPEN", author_id: "a", resolved_by_id: null, resolved_at: null, created_at: "c", updated_at: "u" };
    expect(noteJson({ ...row, profiles: { full_name: "Asha" } }).author).toBe("Asha");
    expect(noteJson({ ...row, profiles: [{ full_name: "Ravi" }] }).author).toBe("Ravi");
    expect(noteJson({ ...row, profiles: null }).author).toBeNull();
  });
});
