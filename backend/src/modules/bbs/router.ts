import {
  BbsCreate,
  BbsItemCreate,
  BbsMemberCreate,
  BbsUpdate,
  bbsDiameterSummary,
  bbsItemTotals,
  computeMember,
  type BbsBeamInput,
  type BbsColumnInput,
  type BbsFootingInput,
  type BbsMemberStored,
  type BbsSlabInput,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "../../db/index.js";
import { bbsItems, bbsMembers, bbsSchedules, projectOffices } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");

async function requireBbs(db: DB, id: string) {
  const [row] = await db.select().from(bbsSchedules).where(eq(bbsSchedules.id, id));
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "BBS not found" });
  return row;
}

function storedFromRow(element: string, input: Record<string, unknown>): BbsMemberStored {
  switch (element) {
    case "COLUMN":
      return { element: "COLUMN", input: input as unknown as BbsColumnInput };
    case "BEAM":
      return { element: "BEAM", input: input as unknown as BbsBeamInput };
    case "SLAB":
      return { element: "SLAB", input: input as unknown as BbsSlabInput };
    case "FOOTING":
      return { element: "FOOTING", input: input as unknown as BbsFootingInput };
    default:
      throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown element ${element}` });
  }
}

async function insertBarsForMember(
  db: DB,
  bbsId: string,
  memberId: string,
  computed: ReturnType<typeof computeMember>,
) {
  if (computed.bars.length === 0) return;
  await db.insert(bbsItems).values(
    computed.bars.map((b) => ({
      bbsId,
      memberId,
      barMark: b.barMark,
      member: b.member,
      element: b.element,
      role: b.role,
      diaMm: b.diaMm,
      noOfMembers: b.noOfMembers,
      barsPerMember: b.barsPerMember,
      cuttingLengthMm: b.cuttingLengthMm,
      weightKg: b.weightKg,
      shape: b.shape,
    })),
  );
}

/**
 * Project BBS — schedule CRUD, geometry members → cutting lengths, diameter summary.
 */
export const bbsRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(bbsSchedules)
        .where(eq(bbsSchedules.projectId, input.projectId))
        .orderBy(desc(bbsSchedules.createdAt));
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [schedule] = await ctx.db
        .select()
        .from(bbsSchedules)
        .where(eq(bbsSchedules.id, input.id));
      if (!schedule) return null;

      const members = await ctx.db
        .select()
        .from(bbsMembers)
        .where(eq(bbsMembers.bbsId, input.id))
        .orderBy(asc(bbsMembers.sortOrder), asc(bbsMembers.createdAt));

      const items = await ctx.db
        .select()
        .from(bbsItems)
        .where(eq(bbsItems.bbsId, input.id))
        .orderBy(asc(bbsItems.createdAt));

      const checks = members.flatMap((m, i) => {
        try {
          return computeMember(
            storedFromRow(m.element, m.input as Record<string, unknown>),
            i,
          ).checks;
        } catch {
          return [];
        }
      });

      const summary = bbsDiameterSummary(items);
      const totalWeightKg = summary.reduce((s, r) => s + r.weightKg, 0);

      return { schedule, members, items, summary, checks, totalWeightKg };
    }),

  create: manage.input(BbsCreate).mutation(async ({ ctx, input }) => {
    const [project] = await ctx.db
      .select({ id: projectOffices.id })
      .from(projectOffices)
      .where(eq(projectOffices.id, input.projectId));
    if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

    const { ref } = await nextRef(ctx.db, "bbs", "BBS");
    const [row] = await ctx.db
      .insert(bbsSchedules)
      .values({
        ref,
        projectId: input.projectId,
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "bbs",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  update: manage.input(BbsUpdate).mutation(async ({ ctx, input }) => {
    const before = await requireBbs(ctx.db, input.id);
    const [row] = await ctx.db
      .update(bbsSchedules)
      .set({
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(bbsSchedules.id, input.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "bbs",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      before,
      after: row,
    });
    return row!;
  }),

  remove: manage
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const before = await requireBbs(ctx.db, input.id);
      await ctx.db.delete(bbsSchedules).where(eq(bbsSchedules.id, input.id));
      await writeAudit(ctx.db, {
        entity: "bbs",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before,
      });
      return { ok: true as const };
    }),

  addItem: manage.input(BbsItemCreate).mutation(async ({ ctx, input }) => {
    await requireBbs(ctx.db, input.bbsId);
    const { weightKg } = bbsItemTotals({
      diaMm: input.diaMm,
      noOfMembers: input.noOfMembers,
      barsPerMember: input.barsPerMember,
      cuttingLengthMm: input.cuttingLengthMm,
    });
    const [row] = await ctx.db
      .insert(bbsItems)
      .values({
        bbsId: input.bbsId,
        barMark: input.barMark.trim(),
        member: input.member?.trim() || null,
        element: input.element ?? null,
        role: input.role ?? null,
        diaMm: input.diaMm,
        noOfMembers: input.noOfMembers,
        barsPerMember: input.barsPerMember,
        cuttingLengthMm: input.cuttingLengthMm,
        weightKg,
        floor: input.floor?.trim() || null,
        shape: input.shape ?? null,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "bbs_item",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: row,
    });
    return row!;
  }),

  removeItem: manage
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(bbsItems).where(eq(bbsItems.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(bbsItems).where(eq(bbsItems.id, input.id));
      await writeAudit(ctx.db, {
        entity: "bbs_item",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before,
      });
      return { ok: true as const };
    }),

  addMember: manage.input(BbsMemberCreate).mutation(async ({ ctx, input }) => {
    await requireBbs(ctx.db, input.bbsId);
    const computed = computeMember({
      element: input.element,
      input: input.input,
    } as BbsMemberStored);
    const prior = await ctx.db
      .select({ id: bbsMembers.id })
      .from(bbsMembers)
      .where(eq(bbsMembers.bbsId, input.bbsId));

    const [member] = await ctx.db
      .insert(bbsMembers)
      .values({
        bbsId: input.bbsId,
        element: input.element,
        mark: computed.mark,
        input: input.input,
        sortOrder: prior.length,
      })
      .returning();

    await insertBarsForMember(ctx.db, input.bbsId, member!.id, computed);

    await writeAudit(ctx.db, {
      entity: "bbs_member",
      entityId: member!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: { element: input.element, mark: computed.mark, barCount: computed.bars.length },
    });
    return { member: member!, checks: computed.checks, barCount: computed.bars.length };
  }),

  removeMember: manage
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db.select().from(bbsMembers).where(eq(bbsMembers.id, input.id));
      if (!before) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(bbsMembers).where(eq(bbsMembers.id, input.id));
      await writeAudit(ctx.db, {
        entity: "bbs_member",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before,
      });
      return { ok: true as const };
    }),

  regenerateMember: manage
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [member] = await ctx.db.select().from(bbsMembers).where(eq(bbsMembers.id, input.id));
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db
        .delete(bbsItems)
        .where(and(eq(bbsItems.bbsId, member.bbsId), eq(bbsItems.memberId, member.id)));
      const computed = computeMember(
        storedFromRow(member.element, member.input as Record<string, unknown>),
      );
      await insertBarsForMember(ctx.db, member.bbsId, member.id, computed);
      await ctx.db
        .update(bbsMembers)
        .set({ mark: computed.mark, updatedAt: new Date() })
        .where(eq(bbsMembers.id, member.id));
      return { ok: true as const, barCount: computed.bars.length, checks: computed.checks };
    }),
});
