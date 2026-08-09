/**
 * Contractor portal demo extras — Vinayaka Civil on Sharma Villa.
 * Seeds coordination tickets (ticket · RFI · drawing · meeting · site visit ·
 * joint measurement), a PLANNED site visit, and READY drawings so every
 * ActionDock CTA / Documents tab can be exercised.
 *
 * Consumed by seedDemo.ts (full seed + backfill).
 */
import { and, count, eq } from "drizzle-orm";
import type { DB } from "../db/index.js";
import {
  contractorSubmissions,
  contractors,
  drawings,
  projectOffices,
  siteVisits,
  tenderInvitations,
  tenders,
  users,
} from "../db/schema.js";
import { emailMatches } from "../lib/email.js";
import { nextRef } from "../lib/numbering.js";
import { dayOffset } from "./demoStudioSeed.js";

const CONTRACTOR_PORTAL_EMAIL = "contractor@demo.aorms.in";
const MARKER_SUBJECT = "Demo — plinth reinforcement clarification (RFI)";

/**
 * Enrich Sharma Villa for `contractor@demo.aorms.in` (first contractor row).
 * Idempotent — safe on backfill.
 */
export async function seedDemoContractorPortalExtras(
  db: DB,
  principalId: string,
): Promise<void> {
  const [contractor] = await db
    .select({ id: contractors.id, name: contractors.name })
    .from(contractors)
    .limit(1);
  if (!contractor) {
    console.log("  contractor portal extras: skipped (no contractor row)");
    return;
  }

  // Bind portal login to this contractor (prefer first row used by tenders).
  const [portalUser] = await db
    .select({ id: users.id, contractorId: users.contractorId })
    .from(users)
    .where(emailMatches(users.email, CONTRACTOR_PORTAL_EMAIL))
    .limit(1);
  if (portalUser && portalUser.contractorId !== contractor.id) {
    await db
      .update(users)
      .set({
        contractorId: contractor.id,
        role: "CONTRACTOR",
        fullName: contractor.name,
      })
      .where(eq(users.id, portalUser.id));
  }

  const [sharma] = await db
    .select({ id: projectOffices.id, title: projectOffices.title })
    .from(projectOffices)
    .where(eq(projectOffices.title, "Sharma Villa — Whitefield"))
    .limit(1);
  if (!sharma) {
    console.log("  contractor portal extras: skipped (Sharma Villa missing)");
    return;
  }

  const projectId = sharma.id;

  // Ensure OPEN tender invitation exists for Vinayaka.
  const [invite] = await db
    .select({ id: tenderInvitations.id, status: tenderInvitations.status })
    .from(tenderInvitations)
    .innerJoin(tenders, eq(tenderInvitations.tenderId, tenders.id))
    .where(
      and(eq(tenders.projectId, projectId), eq(tenderInvitations.contractorId, contractor.id)),
    )
    .limit(1);
  if (!invite) {
    console.log("  contractor portal extras: skipped (no tender invitation)");
    return;
  }

  // READY drawings for Drawings tab.
  const drawingCount =
    (await db.select({ n: count() }).from(drawings).where(eq(drawings.projectId, projectId)))[0]
      ?.n ?? 0;
  if (drawingCount === 0) {
    const { ref } = await nextRef(db, "drawing", "DRW");
    await db.insert(drawings).values({
      ref,
      projectId,
      title: "Foundation plan — Sharma Villa",
      fileName: "SV-S-101-R1.dxf",
      fileHash: "demo-sharma-s101-r1",
      storageKey: "demo/sharma/SV-S-101-R1.dxf",
      sizeBytes: 42_000,
      status: "READY",
      revNo: 1,
      isCurrent: true,
      reviewStatus: "APPROVED",
      reviewedById: principalId,
      reviewedAt: new Date(),
    });
    const { ref: elevRef } = await nextRef(db, "drawing", "DRW");
    await db.insert(drawings).values({
      ref: elevRef,
      projectId,
      title: "Column schedule — Sharma Villa",
      fileName: "SV-S-201-R0.dxf",
      fileHash: "demo-sharma-s201-r0",
      storageKey: "demo/sharma/SV-S-201-R0.dxf",
      sizeBytes: 28_500,
      status: "READY",
      revNo: 1,
      isCurrent: true,
      reviewStatus: "APPROVED",
      reviewedById: principalId,
      reviewedAt: new Date(),
    });
  }

  // PLANNED site visit for confirm / dock demo.
  const visitCount =
    (
      await db
        .select({ n: count() })
        .from(siteVisits)
        .where(
          and(eq(siteVisits.projectId, projectId), eq(siteVisits.contractorId, contractor.id)),
        )
    )[0]?.n ?? 0;
  if (visitCount === 0) {
    await db.insert(siteVisits).values({
      projectId,
      plannedDate: dayOffset(2),
      contractorId: contractor.id,
      status: "PLANNED",
      notes: "Joint check — plinth beam casting (demo)",
      createdById: principalId,
    });
  }

  // Coordination tickets covering every ActionDock kind.
  const marker =
    (
      await db
        .select({ n: count() })
        .from(contractorSubmissions)
        .where(
          and(
            eq(contractorSubmissions.projectId, projectId),
            eq(contractorSubmissions.contractorId, contractor.id),
            eq(contractorSubmissions.subject, MARKER_SUBJECT),
          ),
        )
    )[0]?.n ?? 0;

  if (marker === 0) {
    const submittedById = portalUser?.id ?? principalId;
    await db.insert(contractorSubmissions).values([
      {
        projectId,
        contractorId: contractor.id,
        kind: "RFI",
        subject: MARKER_SUBJECT,
        body: "Please confirm lap length at grid C/3 before Thursday pour.",
        status: "OPEN",
        submittedById,
      },
      {
        projectId,
        contractorId: contractor.id,
        kind: "TICKET",
        subject: "Access road blocked — material lag",
        body: "Neighbour construction is blocking the east gate from 9–12 daily.",
        status: "ACKNOWLEDGED",
        responseNote: "Architect liaising with neighbour — use west gate meantime.",
        submittedById,
        attentionToId: principalId,
      },
      {
        projectId,
        contractorId: contractor.id,
        kind: "DRAWING_REQUEST",
        subject: "Request latest foundation detail R2",
        body: "Site copy of SV-S-101 shows R1; need issued R2 for bar mark changes.",
        status: "OPEN",
        submittedById,
      },
      {
        projectId,
        contractorId: contractor.id,
        kind: "MEETING_REQUEST",
        subject: "Coordination meeting — MEP clash at shaft",
        body: "Preferred date: next Monday morning on site or Teams.",
        status: "OPEN",
        submittedById,
      },
      {
        projectId,
        contractorId: contractor.id,
        kind: "SITE_VISIT_REQUEST",
        subject: "Request architect site visit — waterproofing mock-up",
        body: "Preferred date: " + dayOffset(5),
        status: "OPEN",
        submittedById,
      },
      {
        projectId,
        contractorId: contractor.id,
        kind: "JOINT_MEASUREMENT",
        subject: "Joint measurement — excavation to formation",
        body: "Request joint measure before RA-02 claim. Preferred date: " + dayOffset(3),
        status: "OPEN",
        submittedById,
      },
    ]);
  }

  console.log(
    `  contractor portal extras: ${sharma.title} · ${contractor.name} ready for ${CONTRACTOR_PORTAL_EMAIL}`,
  );
}
