import { PmcDigestSend } from "@esti/contracts";
import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import {
  firm,
  pmcMilestones,
  pmcPackages,
  pmcRaBills,
  projectOffices,
  snags,
} from "../../db/schema.js";
import { sendMail } from "../../lib/mail/transport.js";
import { capabilityProcedure, router } from "../../trpc/trpc.js";

const manage = capabilityProcedure("reports:view");

async function buildPortfolioDigestText(db: DB): Promise<{
  text: string;
  html: string;
  subject: string;
}> {
  const [firmRow] = await db.select({ companyName: firm.companyName }).from(firm).limit(1);
  const firmName = firmRow?.companyName ?? "AProc firm";

  const openSnags = await db
    .select({
      projectRef: projectOffices.ref,
      projectTitle: projectOffices.title,
      openCount: sql<number>`count(*)::int`,
    })
    .from(snags)
    .innerJoin(projectOffices, eq(snags.projectId, projectOffices.id))
    .where(
      and(
        isNull(projectOffices.archivedAt),
        inArray(snags.status, ["OPEN", "IN_PROGRESS"]),
      ),
    )
    .groupBy(projectOffices.ref, projectOffices.title)
    .orderBy(sql`count(*) desc`)
    .limit(20);

  const attentionMs = await db
    .select({
      projectRef: projectOffices.ref,
      ref: pmcMilestones.ref,
      title: pmcMilestones.title,
      status: pmcMilestones.status,
      plannedDate: pmcMilestones.plannedDate,
    })
    .from(pmcMilestones)
    .innerJoin(projectOffices, eq(pmcMilestones.projectId, projectOffices.id))
    .where(
      and(
        isNull(projectOffices.archivedAt),
        inArray(pmcMilestones.status, ["AT_RISK", "DELAYED"]),
      ),
    )
    .orderBy(desc(pmcMilestones.plannedDate))
    .limit(20);

  const openPkgs = await db
    .select({
      projectRef: projectOffices.ref,
      ref: pmcPackages.ref,
      title: pmcPackages.title,
      status: pmcPackages.status,
      tenderCloseDate: pmcPackages.tenderCloseDate,
    })
    .from(pmcPackages)
    .innerJoin(projectOffices, eq(pmcPackages.projectId, projectOffices.id))
    .where(
      and(
        isNull(projectOffices.archivedAt),
        ne(pmcPackages.status, "COMPLETE"),
        ne(pmcPackages.status, "CANCELLED"),
      ),
    )
    .orderBy(desc(pmcPackages.updatedAt))
    .limit(20);

  const openRa = await db
    .select({
      projectRef: projectOffices.ref,
      ref: pmcRaBills.ref,
      billNo: pmcRaBills.billNo,
      status: pmcRaBills.status,
    })
    .from(pmcRaBills)
    .innerJoin(projectOffices, eq(pmcRaBills.projectId, projectOffices.id))
    .where(
      and(
        isNull(projectOffices.archivedAt),
        inArray(pmcRaBills.status, ["DRAFT", "SITE_CHECKED", "CERTIFIED"]),
      ),
    )
    .orderBy(desc(pmcRaBills.updatedAt))
    .limit(20);

  const totalSnags = openSnags.reduce((n, r) => n + Number(r.openCount), 0);
  const lines = [
    `${firmName} — AProc portfolio digest`,
    `Generated ${new Date().toISOString()}`,
    "",
    `Open snags: ${totalSnags}`,
    ...openSnags.map((r) => `  · ${r.projectRef} ${r.projectTitle}: ${r.openCount}`),
    "",
    `Milestone alerts (at risk / delayed): ${attentionMs.length}`,
    ...attentionMs.map(
      (m) =>
        `  · ${m.projectRef} ${m.ref} — ${m.title} [${m.status}]${m.plannedDate ? ` planned ${m.plannedDate}` : ""}`,
    ),
    "",
    `Open packages: ${openPkgs.length}`,
    ...openPkgs.map(
      (p) =>
        `  · ${p.projectRef} ${p.ref} — ${p.title} [${p.status}]${p.tenderCloseDate ? ` close ${p.tenderCloseDate}` : ""}`,
    ),
    "",
    `RA bills in flight: ${openRa.length}`,
    ...openRa.map((r) => `  · ${r.projectRef} ${r.ref} (${r.billNo}) [${r.status}]`),
    "",
    "Open AProc → project Delivery for detail.",
  ];

  const text = lines.join("\n");
  const html = `<pre style="font-family:ui-monospace,monospace;font-size:13px;line-height:1.45">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</pre>`;
  const subject = `[AProc] Portfolio digest — ${totalSnags} snags · ${attentionMs.length} milestone alerts · ${openRa.length} RA in flight`;
  return { text, html, subject };
}

export const pmcDigestRouter = router({
  preview: manage.query(async ({ ctx }) => {
    return buildPortfolioDigestText(ctx.db);
  }),

  send: manage.input(PmcDigestSend).mutation(async ({ ctx, input }) => {
    const [firmRow] = await ctx.db.select({ email: firm.email }).from(firm).limit(1);
    const to = input.to?.trim() || firmRow?.email?.trim() || ctx.user.email;
    if (!to) {
      return {
        sent: false as const,
        reason: "No recipient — set firm email or pass to=",
      };
    }
    const { text, html, subject } = await buildPortfolioDigestText(ctx.db);
    const result = await sendMail({ to, subject, text, html });
    return { ...result, to, subject };
  }),
});
