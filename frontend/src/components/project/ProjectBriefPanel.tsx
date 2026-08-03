import { Tab, TabList, Tabs } from "@carbon/react";
import { useState } from "react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { ProjectCpi } from "../ProjectCpi.js";
import { ProjectInfo } from "../ProjectInfo.js";
import { ProjectPipeline } from "../ProjectPipeline.js";
import { ProjectProgram } from "../ProjectProgram.js";
import { ProjectPreconPanel } from "./ProjectPreconPanel.js";

/** Progressive disclosure for Setup: Info · Pipeline · Program · R&O · CPI. Wave 3 (Carbon). */
export function ProjectBriefPanel({
  projectId,
  showCpi,
}: {
  projectId: string;
  showCpi: boolean;
}) {
  const [sub, setSub] = useState(0);
  const tabs = [
    { label: "Project Info", panel: <ProjectInfo projectId={projectId} /> },
    { label: "Pipeline", panel: <ProjectPipeline projectId={projectId} /> },
    { label: "Program", panel: <ProjectProgram projectId={projectId} /> },
    { label: "R&O", panel: <ProjectPreconPanel projectId={projectId} /> },
    ...(showCpi
      ? [{ label: "CPI", panel: <ProjectCpi projectId={projectId} /> }]
      : []),
  ];
  const safe = Math.min(sub, tabs.length - 1);

  return (
    <div>
      <CarbonScope>
        <Tabs selectedIndex={safe} onChange={({ selectedIndex }) => setSub(selectedIndex)}>
          <TabList aria-label="Project brief sections" contained scrollIntoView>
            {tabs.map((t) => (
              <Tab key={t.label}>{t.label}</Tab>
            ))}
          </TabList>
        </Tabs>
      </CarbonScope>
      {tabs[safe]?.panel}
    </div>
  );
}
