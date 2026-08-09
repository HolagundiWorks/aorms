import { useMemo, useState } from "react";
import { ProjectCommunicationsLog } from "../ProjectCommunicationsLog.js";
import { ProjectMinutes } from "../ProjectMinutes.js";
import { ProjectSiteVisits } from "../ProjectSiteVisits.js";
import { ProjectBbs } from "./ProjectBbs.js";
import { ProjectFacetTabs } from "./ProjectFacetTabs.js";
import { ProjectPackages } from "./ProjectPackages.js";
import { ProjectPhaseProgress } from "./ProjectPhaseProgress.js";
import { ProjectProgramme } from "./ProjectProgramme.js";
import { ProjectProgressReports } from "./ProjectProgressReports.js";
import { ProjectRaCertification } from "./ProjectRaCertification.js";
import { ProjectSnags } from "./ProjectSnags.js";
import { ProjectSteelCertification } from "./ProjectSteelCertification.js";
import { ProjectSteelReconciliation } from "./ProjectSteelReconciliation.js";

function useFacet(initial: string, allowed: string[]) {
  const [facet, setFacet] = useState(
    allowed.includes(initial) ? initial : allowed[0]!,
  );
  return [facet, setFacet] as const;
}

/** Site band — visits · snags · progress reports · phase stages. */
export function ProjectSiteBandPanel({
  projectId,
  initialFacet,
}: {
  projectId: string;
  initialFacet?: string;
}) {
  const facets = useMemo(
    () => [
      {
        id: "site-progress",
        label: "Site Progress",
        panel: <ProjectSiteVisits projectId={projectId} />,
      },
      { id: "snags", label: "Snags", panel: <ProjectSnags projectId={projectId} /> },
      {
        id: "progress-reports",
        label: "Progress reports",
        panel: <ProjectProgressReports projectId={projectId} />,
      },
      {
        id: "phase-stages",
        label: "Phase stages",
        panel: <ProjectPhaseProgress projectId={projectId} />,
      },
    ],
    [projectId],
  );
  const ids = facets.map((f) => f.id);
  const [value, setValue] = useFacet(initialFacet ?? "site-progress", ids);
  return (
    <ProjectFacetTabs
      facets={facets}
      value={value}
      onChange={setValue}
      ariaLabel="Site delivery facets"
    />
  );
}

/** Coordination — communications · minutes · programme · packages. */
export function ProjectCoordinationPanel({
  projectId,
  initialFacet,
}: {
  projectId: string;
  initialFacet?: string;
}) {
  const facets = useMemo(
    () => [
      {
        id: "communications",
        label: "Communications",
        panel: <ProjectCommunicationsLog projectId={projectId} />,
      },
      {
        id: "minutes",
        label: "Minutes",
        panel: <ProjectMinutes projectId={projectId} />,
      },
      {
        id: "programme",
        label: "Programme",
        panel: <ProjectProgramme projectId={projectId} />,
      },
      {
        id: "packages",
        label: "Packages",
        panel: <ProjectPackages projectId={projectId} />,
      },
    ],
    [projectId],
  );
  const ids = facets.map((f) => f.id);
  const [value, setValue] = useFacet(initialFacet ?? "communications", ids);
  return (
    <ProjectFacetTabs
      facets={facets}
      value={value}
      onChange={setValue}
      ariaLabel="Site coordination facets"
    />
  );
}

/** Technical certify — BBS · steel recon · RA · steel cert. */
export function ProjectTechnicalPanel({
  projectId,
  initialFacet,
}: {
  projectId: string;
  initialFacet?: string;
}) {
  const facets = useMemo(
    () => [
      { id: "bbs", label: "BBS", panel: <ProjectBbs projectId={projectId} /> },
      {
        id: "steel-recon",
        label: "Steel recon",
        panel: <ProjectSteelReconciliation projectId={projectId} />,
      },
      {
        id: "ra-certification",
        label: "RA certification",
        panel: <ProjectRaCertification projectId={projectId} />,
      },
      {
        id: "steel-certification",
        label: "Steel certification",
        panel: <ProjectSteelCertification projectId={projectId} />,
      },
    ],
    [projectId],
  );
  const ids = facets.map((f) => f.id);
  const [value, setValue] = useFacet(initialFacet ?? "bbs", ids);
  return (
    <ProjectFacetTabs
      facets={facets}
      value={value}
      onChange={setValue}
      ariaLabel="Technical certification facets"
    />
  );
}
