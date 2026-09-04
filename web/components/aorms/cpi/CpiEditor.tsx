"use client";

import { Accordion, AccordionItem, Tag } from "@carbon/react";
import { SECTION_DEFS, SECTION_TITLE, type CpiReportShape } from "../../../lib/cpi-sections";
import { CpiSectionAccordion } from "./CpiSectionAccordion";
import { CpiReportPanel } from "./CpiReportPanel";

type Answers = Record<string, unknown>;

export function CpiEditor({
  projectId,
  sections,
  savedReport,
  status,
}: {
  projectId: string;
  sections: Record<string, Answers>;
  savedReport: CpiReportShape | null;
  status: string;
}) {
  const answeredCount = Object.keys(sections).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
          Residential onboarding & program formulation — uncovers how the client lives, thinks,
          decides and emotionally connects with spaces. The output is the Client Intelligence
          Report, the foundation of the design brief.
        </p>
        <Tag type={status === "COMPLETE" ? "green" : "gray"} size="sm">
          {status === "COMPLETE" ? "Report saved" : `${answeredCount}/${SECTION_DEFS.length} sections`}
        </Tag>
      </div>

      <Accordion>
        {SECTION_DEFS.map((def) => (
          <AccordionItem key={def.id} title={`${SECTION_TITLE.get(def.id) ?? def.id}${sections[def.id] ? " ✓" : ""}`}>
            <CpiSectionAccordion projectId={projectId} def={def} saved={sections[def.id] ?? {}} />
          </AccordionItem>
        ))}
        <AccordionItem title="21 — Designer's Intelligence Report" open={!!savedReport}>
          <CpiReportPanel projectId={projectId} savedReport={savedReport} />
        </AccordionItem>
      </Accordion>
    </div>
  );
}
