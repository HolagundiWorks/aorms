import { Box, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { ProjectCommunicationsLog } from "../ProjectCommunicationsLog.js";
import { ProjectMinutes } from "../ProjectMinutes.js";
import { ProjectSiteVisits } from "../ProjectSiteVisits.js";
import { ProjectPackages } from "./ProjectPackages.js";
import { ProjectProgramme } from "./ProjectProgramme.js";
import { ProjectProgressReports } from "./ProjectProgressReports.js";
import { ProjectRaCertification } from "./ProjectRaCertification.js";
import { ProjectSnags } from "./ProjectSnags.js";
import { ProjectSteelCertification } from "./ProjectSteelCertification.js";

/** Full AProc / Studio Delivery spine. */
export function ProjectDeliveryPanel({ projectId }: { projectId: string }) {
  const [sub, setSub] = useState(0);
  return (
    <Box>
      <Tabs
        value={sub}
        onChange={(_e, v: number) => setSub(v)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Delivery and site coordination"
        sx={{ mb: 1, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="Site Progress" />
        <Tab label="Communications" />
        <Tab label="Minutes" />
        <Tab label="Snags" />
        <Tab label="Progress reports" />
        <Tab label="Programme" />
        <Tab label="Packages" />
        <Tab label="RA certification" />
        <Tab label="Steel certification" />
      </Tabs>
      {sub === 0 && <ProjectSiteVisits projectId={projectId} />}
      {sub === 1 && <ProjectCommunicationsLog projectId={projectId} />}
      {sub === 2 && <ProjectMinutes projectId={projectId} />}
      {sub === 3 && <ProjectSnags projectId={projectId} />}
      {sub === 4 && <ProjectProgressReports projectId={projectId} />}
      {sub === 5 && <ProjectProgramme projectId={projectId} />}
      {sub === 6 && <ProjectPackages projectId={projectId} />}
      {sub === 7 && <ProjectRaCertification projectId={projectId} />}
      {sub === 8 && <ProjectSteelCertification projectId={projectId} />}
    </Box>
  );
}
