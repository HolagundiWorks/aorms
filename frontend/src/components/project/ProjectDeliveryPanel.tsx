import { Tab, TabList, Tabs } from "@carbon/react";
import { useState } from "react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { ProjectCommunicationsLog } from "../ProjectCommunicationsLog.js";
import { ProjectMinutes } from "../ProjectMinutes.js";
import { ProjectSiteVisits } from "../ProjectSiteVisits.js";
import { ProjectBbs } from "./ProjectBbs.js";
import { ProjectPackages } from "./ProjectPackages.js";
import { ProjectPhaseProgress } from "./ProjectPhaseProgress.js";
import { ProjectProgramme } from "./ProjectProgramme.js";
import { ProjectProgressReports } from "./ProjectProgressReports.js";
import { ProjectRaCertification } from "./ProjectRaCertification.js";
import { ProjectSnags } from "./ProjectSnags.js";
import { ProjectSteelCertification } from "./ProjectSteelCertification.js";
import { ProjectSteelReconciliation } from "./ProjectSteelReconciliation.js";

/** Full AProc / Studio Delivery spine. Wave 3 (Carbon). */
export function ProjectDeliveryPanel({ projectId }: { projectId: string }) {
  const [sub, setSub] = useState(0);
  return (
    <div>
      <CarbonScope>
        <Tabs selectedIndex={sub} onChange={({ selectedIndex }) => setSub(selectedIndex)}>
          <TabList aria-label="Delivery and site coordination" contained scrollIntoView>
            <Tab>Site Progress</Tab>
            <Tab>Communications</Tab>
            <Tab>Minutes</Tab>
            <Tab>Snags</Tab>
            <Tab>Progress reports</Tab>
            <Tab>Programme</Tab>
            <Tab>Packages</Tab>
            <Tab>RA certification</Tab>
            <Tab>Steel certification</Tab>
            <Tab>BBS</Tab>
            <Tab>Steel recon</Tab>
            <Tab>Phase stages</Tab>
          </TabList>
        </Tabs>
      </CarbonScope>
      {sub === 0 && <ProjectSiteVisits projectId={projectId} />}
      {sub === 1 && <ProjectCommunicationsLog projectId={projectId} />}
      {sub === 2 && <ProjectMinutes projectId={projectId} />}
      {sub === 3 && <ProjectSnags projectId={projectId} />}
      {sub === 4 && <ProjectProgressReports projectId={projectId} />}
      {sub === 5 && <ProjectProgramme projectId={projectId} />}
      {sub === 6 && <ProjectPackages projectId={projectId} />}
      {sub === 7 && <ProjectRaCertification projectId={projectId} />}
      {sub === 8 && <ProjectSteelCertification projectId={projectId} />}
      {sub === 9 && <ProjectBbs projectId={projectId} />}
      {sub === 10 && <ProjectSteelReconciliation projectId={projectId} />}
      {sub === 11 && <ProjectPhaseProgress projectId={projectId} />}
    </div>
  );
}
