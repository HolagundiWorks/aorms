import { useMemo, useState } from "react";
import { ProjectDocuments, ProjectSpecSheets } from "../ProjectDocuments.js";
import { ProjectFacetTabs } from "./ProjectFacetTabs.js";

/** Design › Documents — Documents · Specifications. */
export function DocumentsSpecsPanel({ projectId }: { projectId: string }) {
  const facets = useMemo(
    () => [
      {
        id: "documents",
        label: "Documents",
        panel: <ProjectDocuments projectId={projectId} includeSpecs={false} />,
      },
      {
        id: "specifications",
        label: "Specifications",
        panel: <ProjectSpecSheets projectId={projectId} />,
      },
    ],
    [projectId],
  );

  const [value, setValue] = useState("documents");

  return (
    <ProjectFacetTabs
      facets={facets}
      value={value}
      onChange={setValue}
      ariaLabel="Documents and specifications"
    />
  );
}
