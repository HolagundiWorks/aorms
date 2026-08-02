import {
  PMC_STEEL_TRANSITIONS,
  PmcSteelCertCreate,
  PmcSteelCertStatus,
  PmcSteelCertTransition,
  PmcSteelCertUpdate,
  can,
  pmcSteelWastagePct,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { pmcPackages, pmcSteelCerts } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
import { capabilityProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("write");

export const pmcSteelCertsRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(pmcSteelCerts)
        .where(eq(pmcSteelCerts.projectId, input.projectId))
        .orderBy(desc(pmcSteelCerts.periodEnd), desc(pmcSteelCerts.createdAt));
    }),

  create: manage.input(PmcSteelCertCreate).mutation(async ({ ctx, input }) => {
    if (input.packageId) {
      const [pkg] = await ctx.db
        .select({ id: pmcPackages.id, projectId: pmcPackages.projectId })
        .from(pmcPackages)
        .where(eq(pmcPackages.id, input.packageId));
      if (!pkg || pkg.projectId !== input.projectId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Package not on this project" });
      }
    }
    const { ref } = await nextRef(ctx.db, "pmc_steel_cert", "STL");
    const wastagePct = pmcSteelWastagePct(input.issuedKg, input.consumedKg);
    const [row] = await ctx.db
      .insert(pmcSteelCerts)
      .values({
        projectId: input.projectId,
        packageId: input.packageId ?? null,
        ref,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        issuedKg: input.issuedKg,
        consumedKg: input.consumedKg,
        wastagePct,
        narrative: input.narrative ?? null,
        status: "DRAFT",
        createdById: ctx.user.id,
      })
      .returning();
    await writeAudit(ctx.db, {
      entity: "pmc_steel_cert",
      entityId: row!.id,
      action: "CREATE",
      actorId: ctx.user.id,
      after: { ref, projectId: input.projectId },
    });
    return row!;
  }),

  update: manage.input(PmcSteelCertUpdate).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db
      .select()
      .from(pmcSteelCerts)
      .where(eq(pmcSteelCerts.id, input.id));
    if (!before || before.projectId !== input.projectId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    if (before.status !== "DRAFT" && before.status !== "SITE_CHECKED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only draft / site-checked certs can be edited",
      });
    }
    if (input.packageId) {
      const [pkg] = await ctx.db
        .select({ id: pmcPackages.id, projectId: pmcPackages.projectId })
        .from(pmcPackages)
        .where(eq(pmcPackages.id, input.packageId));
      if (!pkg || pkg.projectId !== input.projectId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Package not on this project" });
      }
    }
    const issuedKg = input.issuedKg ?? before.issuedKg;
    const consumedKg = input.consumedKg ?? before.consumedKg;
    const [row] = await ctx.db
      .update(pmcSteelCerts)
      .set({
        ...(input.packageId !== undefined ? { packageId: input.packageId } : {}),
        ...(input.periodStart !== undefined ? { periodStart: input.periodStart } : {}),
        ...(input.periodEnd !== undefined ? { periodEnd: input.periodEnd } : {}),
        ...(input.issuedKg !== undefined ? { issuedKg: input.issuedKg } : {}),
        ...(input.consumedKg !== undefined ? { consumedKg: input.consumedKg } : {}),
        ...(input.narrative !== undefined ? { narrative: input.narrative } : {}),
        wastagePct: pmcSteelWastagePct(issuedKg, consumedKg),
        updatedAt: new Date(),
      })
      .where(and(eq(pmcSteelCerts.id, input.id), eq(pmcSteelCerts.projectId, input.projectId)))
      .returning();
    return row!;
  }),

  transition: manage.input(PmcSteelCertTransition).mutation(async ({ ctx, input }) => {
    const [before] = await ctx.db
      .select()
      .from(pmcSteelCerts)
      .where(eq(pmcSteelCerts.id, input.id));
    if (!before || before.projectId !== input.projectId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    const from = before.status as PmcSteelCertStatus;
    const allowed = PMC_STEEL_TRANSITIONS[from] ?? [];
    if (!allowed.includes(input.to)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot move from ${from} to ${input.to}`,
      });
    }
    if (input.to === "CERTIFIED" && !can(ctx.user.role, "cost:approve")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Certification requires cost:approve",
      });
    }

    const [row] = await ctx.db
      .update(pmcSteelCerts)
      .set({
        status: input.to,
        ...(input.to === "CERTIFIED"
          ? { certifiedAt: new Date(), certifiedById: ctx.user.id }
          : {}),
        ...(input.to === "SENT_TO_CLIENT" ? { sentAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(pmcSteelCerts.id, input.id))
      .returning();

    await writeAudit(ctx.db, {
      entity: "pmc_steel_cert",
      entityId: input.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      before: { status: from },
      after: { status: input.to },
    });
    return row!;
  }),

  remove: manage
    .input(z.object({ id: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [before] = await ctx.db
        .select()
        .from(pmcSteelCerts)
        .where(eq(pmcSteelCerts.id, input.id));
      if (!before || before.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (before.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only drafts can be removed" });
      }
      await ctx.db.delete(pmcSteelCerts).where(eq(pmcSteelCerts.id, input.id));
      await writeAudit(ctx.db, {
        entity: "pmc_steel_cert",
        entityId: input.id,
        action: "DELETE",
        actorId: ctx.user.id,
        before: { ref: before.ref },
      });
      return { ok: true as const };
    }),
});
