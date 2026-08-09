import { useMemo, useState } from "react";
import { ProjectCpi } from "../ProjectCpi.js";
import { ProjectInfo } from "../ProjectInfo.js";
import { ProjectPipeline } from "../ProjectPipeline.js";
import { ProjectProgram } from "../ProjectProgram.js";
import { ProjectFacetTabs } from "./ProjectFacetTabs.js";
import { ProjectPreconPanel } from "./ProjectPreconPanel.js";

/** Setup › Brief — Info · Pipeline · Program · R&O · CPI (residential). */
export function ProjectBriefPanel({
  projectId,
  showCpi,
  initialFacet,
}: {
  projectId: string;
  showCpi: boolean;
  initialFacet?: string;
}) {
  const facets = useMemo(
    () => [
      {
        id: "info",
        label: "Project Info",
        panel: <ProjectInfo projectId={projectId} />,
      },
      {
        id: "pipeline",
        label: "Pipeline",
        panel: <ProjectPipeline projectId={projectId} />,
      },
      {
        id: "program",
        label: "Program",
        panel: <ProjectProgram projectId={projectId} />,
      },
      {
        id: "ro",
        label: "R&O",
        panel: <ProjectPreconPanel projectId={projectId} />,
      },
      ...(showCpi
        ? [
            {
              id: "cpi",
              label: "CPI",
              panel: <ProjectCpi projectId={projectId} />,
            },
          ]
        : []),
    ],
    [projectId, showCpi],
  );

  const fallback = facets[0]?.id ?? "info";
  const [value, setValue] = useState(
    initialFacet && facets.some((f) => f.id === initialFacet) ? initialFacet : fallback,
  );
  const safe = facets.some((f) => f.id === value) ? value : fallback;

  return (
    <ProjectFacetTabs
      facets={facets}
      value={safe}
      onChange={setValue}
      ariaLabel="Project brief sections"
    />
  );
}
