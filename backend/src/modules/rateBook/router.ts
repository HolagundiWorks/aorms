import {
  ProjectListParams,
  RateBookCreate,
  RateBookCreateFromJointMeasurement,
  RateBookItemUpsert,
  clampListLimit,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { estimateItems, estimates, rateBookItems, rateBooks } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { capabilityProcedure, router } from "../../trpc/trpc.js";
import { loadJmBundle } from "../jointMeasurement/service.js";

// Rate books drive estimate pricing firm-wide — same gate as fee proposals.
const manage = capabilityProcedure("fees:manage");

export const rateBookRouter = router({
  // Bounded like every other list in the codebase — a CPWD schedule import runs
  // to thousands of items, and an unbounded select would ship the lot.
  list: manage
    .input(ProjectListParams.optional())
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(rateBooks)
        .orderBy(desc(rateBooks.createdAt))
        .limit(clampListLimit(input?.limit)),
    ),

  create: manage.input(RateBookCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(rateBooks)
      .values({
        name: input.name,
        versionLabel: input.versionLabel ?? null,
        effectiveDate: input.effectiveDate ?? null,
        description: input.description ?? null,
      })
      .returning();
    await writeAudit(ctx.db, { entity: "ratebook", entityId: row!.id, action: "CREATE", actorId: ctx.user.id, after: row });
    return row!;
  }),

  setLocked: manage
    .input(z.object({ id: z.string().uuid(), locked: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(rateBooks)
        .set({ locked: input.locked, updatedAt: new Date() })
        .where(eq(rateBooks.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await writeAudit(ctx.db, {
        entity: "ratebook",
        entityId: input.id,
        action: "SET_LOCKED",
        actorId: ctx.user.id,
        after: { locked: input.locked },
      });
      return row;
    }),

  remove: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [inUse] = await ctx.db
      .select({ id: estimates.id })
      .from(estimates)
      .where(eq(estimates.rateBookId, input.id))
      .limit(1);
    if (inUse) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This rate book is used by at least one estimate — remove or repoint those first.",
      });
    }
    await ctx.db.delete(rateBookItems).where(eq(rateBookItems.rateBookId, input.id));
    await ctx.db.delete(rateBooks).where(eq(rateBooks.id, input.id));
    await writeAudit(ctx.db, { entity: "ratebook", entityId: input.id, action: "DELETE", actorId: ctx.user.id });
    return { ok: true };
  }),

  listItems: manage
    .input(z.object({ rateBookId: z.string().uuid(), limit: z.number().int().optional() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(rateBookItems)
        .where(eq(rateBookItems.rateBookId, input.rateBookId))
        .orderBy(asc(rateBookItems.sortOrder), asc(rateBookItems.createdAt))
        .limit(clampListLimit(input.limit)),
    ),

  upsertItem: manage.input(RateBookItemUpsert).mutation(async ({ ctx, input }) => {
    const [book] = await ctx.db.select().from(rateBooks).where(eq(rateBooks.id, input.rateBookId));
    if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "Rate book not found" });
    if (book.locked) throw new TRPCError({ code: "BAD_REQUEST", message: "This rate book is locked." });

    if (input.id) {
      const [row] = await ctx.db
        .update(rateBookItems)
        .set({
          itemCode: input.itemCode ?? null,
          description: input.description,
          specification: input.specification ?? null,
          unit: input.unit,
          ratePaise: input.ratePaise,
          updatedAt: new Date(),
        })
        .where(and(eq(rateBookItems.id, input.id), eq(rateBookItems.rateBookId, input.rateBookId)))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }

    const maxSort = await ctx.db
      .select({ n: rateBookItems.sortOrder })
      .from(rateBookItems)
      .where(eq(rateBookItems.rateBookId, input.rateBookId))
      .orderBy(desc(rateBookItems.sortOrder))
      .limit(1);
    const [row] = await ctx.db
      .insert(rateBookItems)
      .values({
        rateBookId: input.rateBookId,
        sortOrder: (maxSort[0]?.n ?? 0) + 10,
        itemCode: input.itemCode ?? null,
        description: input.description,
        specification: input.specification ?? null,
        unit: input.unit,
        ratePaise: input.ratePaise,
      })
      .returning();
    return row!;
  }),

  removeItem: manage.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const [item] = await ctx.db
      .select({ id: rateBookItems.id, rateBookId: rateBookItems.rateBookId })
      .from(rateBookItems)
      .where(eq(rateBookItems.id, input.id));
    if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Rate book item not found" });

    // `upsertItem` refuses to write into a locked book; deleting out of one has
    // to be refused for the same reason, or "locked" means very little.
    const [book] = await ctx.db
      .select({ locked: rateBooks.locked, name: rateBooks.name })
      .from(rateBooks)
      .where(eq(rateBooks.id, item.rateBookId));
    if (book?.locked) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `"${book.name}" is locked — unlock it before removing items.`,
      });
    }

    // esti_estimate_item.rate_book_item_id has no ON DELETE action, so deleting
    // a referenced item raised a raw 23503 and surfaced as a 500. Say what is
    // actually wrong instead.
    const [used] = await ctx.db
      .select({ n: sql<number>`count(*)::int` })
      .from(estimateItems)
      .where(eq(estimateItems.rateBookItemId, input.id));
    if (used?.n) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `This item is priced into ${used.n} estimate line${used.n === 1 ? "" : "s"} and cannot be deleted. Edit its rate instead, or remove those lines first.`,
      });
    }

    await ctx.db.delete(rateBookItems).where(eq(rateBookItems.id, input.id));
    return { ok: true };
  }),

  /** Seed unpriced items from an approved joint measurement (skip duplicate codes). */
  createFromJointMeasurement: manage
    .input(RateBookCreateFromJointMeasurement)
    .mutation(async ({ ctx, input }) => {
      const { header, lines } = await loadJmBundle(ctx.db, input.jointMeasurementId);
      if (header.status !== "APPROVED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Approve the joint measurement before creating a rate book",
        });
      }
      if (lines.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Joint measurement has no lines" });
      }

      let bookId = input.rateBookId;
      if (bookId) {
        const [book] = await ctx.db.select().from(rateBooks).where(eq(rateBooks.id, bookId));
        if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "Rate book not found" });
        if (book.locked) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This rate book is locked." });
        }
      } else {
        const name = input.name?.trim() || `JM — ${header.subject}`.slice(0, 120);
        const [created] = await ctx.db
          .insert(rateBooks)
          .values({
            name,
            versionLabel: input.versionLabel ?? "JM",
            description: `Seeded from approved joint measurement ${header.id}`,
          })
          .returning();
        bookId = created!.id;
        await writeAudit(ctx.db, {
          entity: "ratebook",
          entityId: bookId,
          action: "CREATE",
          actorId: ctx.user.id,
          after: created,
        });
      }

      const existing = await ctx.db
        .select({ itemCode: rateBookItems.itemCode })
        .from(rateBookItems)
        .where(eq(rateBookItems.rateBookId, bookId));
      const codeSet = new Set(
        existing.map((e) => (e.itemCode ?? "").trim().toUpperCase()).filter(Boolean),
      );

      const maxSort = await ctx.db
        .select({ n: rateBookItems.sortOrder })
        .from(rateBookItems)
        .where(eq(rateBookItems.rateBookId, bookId))
        .orderBy(desc(rateBookItems.sortOrder))
        .limit(1);
      let sort = (maxSort[0]?.n ?? 0) + 10;
      let added = 0;

      for (const line of lines) {
        const code = line.code?.trim() || null;
        const codeKey = (code ?? "").toUpperCase();
        if (codeKey && codeSet.has(codeKey)) continue;
        await ctx.db.insert(rateBookItems).values({
          rateBookId: bookId,
          itemCode: code,
          description: line.description,
          unit: line.uom,
          ratePaise: 0,
          sortOrder: sort,
        });
        if (codeKey) codeSet.add(codeKey);
        sort += 10;
        added += 1;
      }

      return { rateBookId: bookId, added };
    }),
});
