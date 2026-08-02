import {
  MoodboardCreate,
  MoodboardItemTransform,
  MoodboardItemUpsert,
  MoodboardUpdate,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, max } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import { moodboardItems, moodboards, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { presignedGet } from "../../lib/storage.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");

async function requireBoard(db: DB, id: string) {
  const [row] = await db.select().from(moodboards).where(eq(moodboards.id, id));
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Moodboard not found" });
  return row;
}

async function requireProject(db: DB, projectId: string) {
  const [project] = await db
    .select({ id: projectOffices.id })
    .from(projectOffices)
    .where(eq(projectOffices.id, projectId));
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  return project;
}

async function withImageUrls<T extends { kind: string; payload: Record<string, unknown> }>(
  items: T[],
) {
  return Promise.all(
    items.map(async (item) => {
      if (item.kind !== "IMAGE") return { ...item, url: null as string | null };
      const key = typeof item.payload.storageKey === "string" ? item.payload.storageKey : null;
      const url = key ? await presignedGet(key).catch(() => null) : null;
      return { ...item, url };
    }),
  );
}

/**
 * AStudio project moodboards — board CRUD + freeform canvas items
 * (IMAGE / STICKY / PATH) for project collaboration.
 */
export const moodboardRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(moodboards)
        .where(eq(moodboards.projectId, input.projectId))
        .orderBy(desc(moodboards.updatedAt));
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const board = await requireBoard(ctx.db, input.id);
      const items = await ctx.db
        .select()
        .from(moodboardItems)
        .where(eq(moodboardItems.moodboardId, input.id))
        .orderBy(asc(moodboardItems.zIndex), asc(moodboardItems.createdAt));
      return { board, items: await withImageUrls(items) };
    }),

  create: manage.input(MoodboardCreate).mutation(async ({ ctx, input }) => {
    await requireProject(ctx.db, input.projectId);
    const { ref } = await nextRef(ctx.db, "moodboard", "MOOD");
    const [row] = await ctx.db
      .insert(moodboards)
      .values({
        ref,
        projectId: input.projectId,
        title: input.title.trim(),
        canvasWidth: input.canvasWidth ?? 1920,
        canvasHeight: input.canvasHeight ?? 1080,
        background: input.background ?? "#F2F4F7",
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "moodboard",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  update: manage.input(MoodboardUpdate).mutation(async ({ ctx, input }) => {
    const before = await requireBoard(ctx.db, input.id);
    const [row] = await ctx.db
      .update(moodboards)
      .set({
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.canvasWidth !== undefined ? { canvasWidth: input.canvasWidth } : {}),
        ...(input.canvasHeight !== undefined ? { canvasHeight: input.canvasHeight } : {}),
        ...(input.background !== undefined ? { background: input.background } : {}),
        updatedAt: new Date(),
      })
      .where(eq(moodboards.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "moodboard",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      before,
      after: row,
    });
    return row!;
  }),

  delete: manage
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const before = await requireBoard(ctx.db, input.id);
      await ctx.db.delete(moodboards).where(eq(moodboards.id, input.id));
      await writeAudit(ctx.db, {
        entity: "moodboard",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before,
      });
      return { ok: true as const };
    }),

  upsertItem: manage.input(MoodboardItemUpsert).mutation(async ({ ctx, input }) => {
    const board = await requireBoard(ctx.db, input.moodboardId);

    if (input.id) {
      const [existing] = await ctx.db
        .select()
        .from(moodboardItems)
        .where(
          and(eq(moodboardItems.id, input.id), eq(moodboardItems.moodboardId, input.moodboardId)),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Moodboard item not found" });

      const [row] = await ctx.db
        .update(moodboardItems)
        .set({
          kind: input.kind,
          x: input.x,
          y: input.y,
          width: input.width ?? null,
          height: input.height ?? null,
          rotation: input.rotation ?? existing.rotation,
          zIndex: input.zIndex ?? existing.zIndex,
          payload: input.payload,
          updatedAt: new Date(),
        })
        .where(eq(moodboardItems.id, input.id))
        .returning();
      await ctx.db
        .update(moodboards)
        .set({ updatedAt: new Date() })
        .where(eq(moodboards.id, board.id));
      await writeAudit(ctx.db, {
        entity: "moodboard_item",
        entityId: input.id,
        action: "UPDATE",
        actorId: ctx.user.id,
        before: existing,
        after: row,
      });
      const [enriched] = await withImageUrls([row!]);
      return enriched!;
    }

    const [{ value: maxZ } = { value: 0 }] = await ctx.db
      .select({ value: max(moodboardItems.zIndex) })
      .from(moodboardItems)
      .where(eq(moodboardItems.moodboardId, input.moodboardId));

    const [row] = await ctx.db
      .insert(moodboardItems)
      .values({
        moodboardId: input.moodboardId,
        kind: input.kind,
        x: input.x,
        y: input.y,
        width: input.width ?? null,
        height: input.height ?? null,
        rotation: input.rotation ?? 0,
        zIndex: input.zIndex ?? (maxZ ?? 0) + 1,
        payload: input.payload,
        createdById: ctx.user.id,
      })
      .returning();
    await ctx.db
      .update(moodboards)
      .set({ updatedAt: new Date() })
      .where(eq(moodboards.id, board.id));
    await writeAudit(ctx.db, {
      entity: "moodboard_item",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    const [enriched] = await withImageUrls([row!]);
    return enriched!;
  }),

  updateTransform: manage.input(MoodboardItemTransform).mutation(async ({ ctx, input }) => {
    const [existing] = await ctx.db
      .select()
      .from(moodboardItems)
      .where(eq(moodboardItems.id, input.id))
      .limit(1);
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Moodboard item not found" });

    const [row] = await ctx.db
      .update(moodboardItems)
      .set({
        x: input.x,
        y: input.y,
        ...(input.width !== undefined ? { width: input.width } : {}),
        ...(input.height !== undefined ? { height: input.height } : {}),
        ...(input.rotation !== undefined ? { rotation: input.rotation } : {}),
        ...(input.zIndex !== undefined ? { zIndex: input.zIndex } : {}),
        updatedAt: new Date(),
      })
      .where(eq(moodboardItems.id, input.id))
      .returning();
    await ctx.db
      .update(moodboards)
      .set({ updatedAt: new Date() })
      .where(eq(moodboards.id, existing.moodboardId));
    return row!;
  }),

  deleteItem: manage
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db
        .select()
        .from(moodboardItems)
        .where(eq(moodboardItems.id, input.id))
        .limit(1);
      if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Moodboard item not found" });
      await ctx.db.delete(moodboardItems).where(eq(moodboardItems.id, input.id));
      await ctx.db
        .update(moodboards)
        .set({ updatedAt: new Date() })
        .where(eq(moodboards.id, before.moodboardId));
      await writeAudit(ctx.db, {
        entity: "moodboard_item",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before,
      });
      return { ok: true as const };
    }),
});
