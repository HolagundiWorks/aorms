import { and, eq, max } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { registerImageUploadRoute } from "../../lib/imageUploadRoute.js";
import { db } from "../../db/index.js";
import { moodboardItems, moodboards } from "../../db/schema.js";

/** Moodboard canvas image upload — creates an IMAGE item on the board. */
export function registerMoodImageUpload(app: FastifyInstance): void {
  registerImageUploadRoute(app, {
    path: "/upload/mood-image",
    requiredField: "moodboardId",
    notFoundError: "moodboard not found",
    resolveParent: async (moodboardId) => {
      const [board] = await db.select().from(moodboards).where(eq(moodboards.id, moodboardId));
      return board ? { id: board.id, projectId: board.projectId } : null;
    },
    storageKey: (moodboardId, hash, ext) => `moodboard/${moodboardId}/${hash}${ext}`,
    insertRow: async ({ parentId, storageKey, caption }) => {
      const [{ value: maxZ } = { value: 0 }] = await db
        .select({ value: max(moodboardItems.zIndex) })
        .from(moodboardItems)
        .where(eq(moodboardItems.moodboardId, parentId));
      const countRows = await db
        .select({ id: moodboardItems.id })
        .from(moodboardItems)
        .where(and(eq(moodboardItems.moodboardId, parentId), eq(moodboardItems.kind, "IMAGE")));
      const n = countRows.length;
      const [row] = await db
        .insert(moodboardItems)
        .values({
          moodboardId: parentId,
          kind: "IMAGE",
          x: 80 + n * 28,
          y: 80 + n * 28,
          width: 360,
          height: 270,
          zIndex: (maxZ ?? 0) + 1,
          payload: { storageKey, caption },
        })
        .returning();
      await db
        .update(moodboards)
        .set({ updatedAt: new Date() })
        .where(eq(moodboards.id, parentId));
      return row!;
    },
    audit: ({ rowId, actor, parentId, projectId, storageKey }) => ({
      entity: "moodboard_item",
      entityId: rowId,
      action: "UPLOAD",
      actorId: actor.id,
      after: { moodboardId: parentId, projectId, storageKey, kind: "IMAGE" },
    }),
  });
}
