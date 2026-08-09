/**
 * Demo joint measurement — Sharma Villa site abstract (SUBMITTED + one APPROVED)
 * with lines and a PDF annotation so site / AProc / rate-book CTAs can be exercised.
 *
 * Consumed by seedDemo.ts (full seed + backfill). Idempotent by subject marker.
 */
import { and, count, eq } from "drizzle-orm";
import type { DB } from "../db/index.js";
import {
  contractors,
  drawings,
  jointMeasurementAnnotations,
  jointMeasurementLines,
  jointMeasurements,
  projectOffices,
  users,
} from "../db/schema.js";
import { emailMatches } from "../lib/email.js";
import { dayOffset } from "./demoStudioSeed.js";

const MARKER = "Demo — excavation to formation (JM)";
const SITE_EMAIL = "site@demo.aorms.in";

export async function seedDemoJointMeasurement(
  db: DB,
  principalId: string,
): Promise<void> {
  const [project] = await db
    .select({ id: projectOffices.id })
    .from(projectOffices)
    .where(eq(projectOffices.title, "Sharma Villa — Whitefield"))
    .limit(1);
  if (!project) {
    console.log("  joint measurement demo: skipped (no Sharma Villa)");
    return;
  }

  const existing =
    (
      await db
        .select({ n: count() })
        .from(jointMeasurements)
        .where(
          and(
            eq(jointMeasurements.projectId, project.id),
            eq(jointMeasurements.subject, MARKER),
          ),
        )
    )[0]?.n ?? 0;
  if (existing > 0) {
    console.log("  joint measurement demo: already present");
    return;
  }

  const [siteUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(emailMatches(users.email, SITE_EMAIL))
    .limit(1);
  const [contractor] = await db.select({ id: contractors.id }).from(contractors).limit(1);
  const [drawing] = await db
    .select({ id: drawings.id })
    .from(drawings)
    .where(eq(drawings.projectId, project.id))
    .limit(1);

  const submittedById = siteUser?.id ?? principalId;

  const [submitted] = await db
    .insert(jointMeasurements)
    .values({
      projectId: project.id,
      contractorId: contractor?.id ?? null,
      subject: MARKER,
      measuredOn: dayOffset(1),
      details: "Joint check with Vinayaka Civil — formation levels east wing.",
      status: "SUBMITTED",
      attentionToId: principalId,
      submittedById,
      submittedAt: new Date(),
    })
    .returning();

  await db.insert(jointMeasurementLines).values([
    {
      jointMeasurementId: submitted!.id,
      code: "EXC-01",
      description: "Excavation in ordinary soil",
      uom: "CUM",
      measureKind: "LBH",
      lengthMm: 12000,
      breadthMm: 8000,
      heightMm: 1500,
      countNos: 1,
      quantity: 144,
      sortOrder: 10,
      drawingId: drawing?.id ?? null,
    },
    {
      jointMeasurementId: submitted!.id,
      code: "PCC-01",
      description: "PCC 1:4:8 under footing",
      uom: "CUM",
      measureKind: "LBH",
      lengthMm: 12000,
      breadthMm: 8000,
      heightMm: 100,
      countNos: 1,
      quantity: 9.6,
      sortOrder: 20,
      drawingId: drawing?.id ?? null,
    },
  ]);

  if (drawing) {
    await db.insert(jointMeasurementAnnotations).values({
      jointMeasurementId: submitted!.id,
      drawingId: drawing.id,
      tool: "PIN",
      pageNo: 0,
      color: "#FF4F18",
      label: "Formation check",
      geometry: { kind: "PIN", points: [{ x: 420, y: 380 }] },
      createdById: submittedById,
    });
  }

  const [approved] = await db
    .insert(jointMeasurements)
    .values({
      projectId: project.id,
      contractorId: contractor?.id ?? null,
      subject: "Demo — plinth beam abstract (approved)",
      measuredOn: dayOffset(-3),
      details: "Approved sample for rate-book import.",
      status: "APPROVED",
      attentionToId: principalId,
      submittedById,
      submittedAt: new Date(),
      reviewedById: principalId,
      reviewedAt: new Date(),
      reviewNote: "OK for MB import",
    })
    .returning();

  await db.insert(jointMeasurementLines).values([
    {
      jointMeasurementId: approved!.id,
      code: "PB-01",
      description: "Plinth beam M25",
      uom: "CUM",
      measureKind: "LBH",
      lengthMm: 24000,
      breadthMm: 230,
      heightMm: 450,
      countNos: 1,
      quantity: 2.484,
      sortOrder: 10,
    },
  ]);

  console.log("  joint measurement demo: SUBMITTED + APPROVED seeded on Sharma Villa");
}

/** Standalone: `pnpm exec tsx src/scripts/demoJointMeasurementSeed.ts` */
async function main() {
  const { db } = await import("../db/index.js");
  const { emailMatches } = await import("../lib/email.js");
  const [principal] = await db
    .select({ id: users.id })
    .from(users)
    .where(emailMatches(users.email, "principal@demo.aorms.in"))
    .limit(1);
  if (!principal) {
    console.error("No principal@demo.aorms.in — run full seedDemo first");
    process.exit(1);
  }
  await seedDemoJointMeasurement(db, principal.id);
}

const isDirect = process.argv[1]?.includes("demoJointMeasurementSeed");
if (isDirect) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
