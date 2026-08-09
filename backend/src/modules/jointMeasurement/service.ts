import {
  deriveMeasurementQuantity,
  measureKindFromUom,
  type JointMeasurementLineInput,
  type MeasureKind,
  type MeasurementUom,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import {
  contractorSubmissions,
  itemLibraryVersions,
  jointMeasurementAnnotations,
  jointMeasurementLines,
  jointMeasurements,
  measurementBooks,
  measurementRows,
} from "../../db/schema.js";
import { publishEntity } from "../../lib/sync/publish.js";

export async function requireJm(
  db: DB,
  id: string,
): Promise<typeof jointMeasurements.$inferSelect> {
  const [row] = await db.select().from(jointMeasurements).where(eq(jointMeasurements.id, id)).limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Joint measurement not found" });
  return row;
}

export function assertEditable(status: string) {
  if (status !== "DRAFT" && status !== "REJECTED") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Only draft or rejected joint measurements can be edited",
    });
  }
}

export function lineQuantity(line: JointMeasurementLineInput): number {
  const measureKind = (line.measureKind ?? measureKindFromUom(line.uom)) as MeasureKind;
  return deriveMeasurementQuantity({
    measureKind,
    uom: line.uom as MeasurementUom,
    lengthMm: line.lengthMm ?? null,
    breadthMm: line.breadthMm ?? null,
    heightMm: line.heightMm ?? null,
    count: line.countNos ?? 1,
  });
}

export async function replaceLines(
  db: DB,
  jointMeasurementId: string,
  lines: JointMeasurementLineInput[],
) {
  await db
    .delete(jointMeasurementLines)
    .where(eq(jointMeasurementLines.jointMeasurementId, jointMeasurementId));

  if (lines.length === 0) return [];

  const values = lines.map((line, i) => ({
    jointMeasurementId,
    code: line.code?.trim() || null,
    description: line.description.trim(),
    uom: line.uom,
    measureKind: line.measureKind ?? measureKindFromUom(line.uom),
    lengthMm: line.lengthMm ?? null,
    breadthMm: line.breadthMm ?? null,
    heightMm: line.heightMm ?? null,
    countNos: line.countNos ?? 1,
    quantity: lineQuantity(line),
    itemLibraryItemId: line.itemLibraryItemId ?? null,
    drawingId: line.drawingId ?? null,
    sortOrder: line.sortOrder ?? (i + 1) * 10,
  }));

  return db.insert(jointMeasurementLines).values(values).returning();
}

export async function loadJmBundle(db: DB, id: string) {
  const header = await requireJm(db, id);
  const lines = await db
    .select()
    .from(jointMeasurementLines)
    .where(eq(jointMeasurementLines.jointMeasurementId, id))
    .orderBy(asc(jointMeasurementLines.sortOrder), asc(jointMeasurementLines.createdAt));
  const annotations = await db
    .select()
    .from(jointMeasurementAnnotations)
    .where(eq(jointMeasurementAnnotations.jointMeasurementId, id))
    .orderBy(asc(jointMeasurementAnnotations.createdAt));
  return { header, lines, annotations };
}

async function getOrCreateBook(db: DB, projectId: string) {
  const [existing] = await db
    .select()
    .from(measurementBooks)
    .where(eq(measurementBooks.projectId, projectId))
    .orderBy(desc(measurementBooks.createdAt))
    .limit(1);
  if (existing) return existing;

  const [activeVersion] = await db
    .select()
    .from(itemLibraryVersions)
    .where(eq(itemLibraryVersions.active, true))
    .limit(1);

  const [book] = await db
    .insert(measurementBooks)
    .values({
      projectId,
      libraryVersionId: activeVersion?.id ?? null,
      title: "Measurement sheet",
    })
    .returning();
  return book!;
}

/** Import approved JM lines into the project measurement book. */
export async function importJmIntoMeasurementBook(db: DB, jmId: string) {
  const { header, lines } = await loadJmBundle(db, jmId);
  if (header.status !== "APPROVED") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Only approved joint measurements can import into the measurement book",
    });
  }
  const book = await getOrCreateBook(db, header.projectId);
  const maxSort = await db
    .select({ n: measurementRows.sortOrder })
    .from(measurementRows)
    .where(eq(measurementRows.bookId, book.id))
    .orderBy(desc(measurementRows.sortOrder))
    .limit(1);
  let sort = (maxSort[0]?.n ?? 0) + 10;

  const inserted = [];
  for (const line of lines) {
    const [row] = await db
      .insert(measurementRows)
      .values({
        bookId: book.id,
        libraryItemId: line.itemLibraryItemId,
        libraryItemCode: line.code,
        particulars: line.description,
        lengthMm: line.lengthMm,
        breadthMm: line.breadthMm,
        heightMm: line.heightMm,
        quantity: line.quantity,
        uom: line.uom,
        derivation: "MANUAL",
        sortOrder: sort,
      })
      .returning();
    sort += 10;
    inserted.push(row!);
  }
  return { book, rows: inserted };
}

export async function resolveSourceSubmission(db: DB, sourceSubmissionId: string | null, note: string) {
  if (!sourceSubmissionId) return;
  await db
    .update(contractorSubmissions)
    .set({
      status: "RESOLVED",
      responseNote: note,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contractorSubmissions.id, sourceSubmissionId),
        inArray(contractorSubmissions.status, ["OPEN", "ACKNOWLEDGED"]),
      ),
    );
}

export async function publishApprovedJm(db: DB, jmId: string) {
  await publishEntity(db, "jointMeasurement", jmId);
}
