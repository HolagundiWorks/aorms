import { useEffect, useMemo, useState } from "react";
import { ProjectApprovals } from "../ProjectApprovals.js";
import { ProjectDrawings } from "../ProjectDrawings.js";
import { ProjectTransmittals } from "../ProjectTransmittals.js";
import { ProjectFacetTabs } from "./ProjectFacetTabs.js";

type DrawingsSubTab = "drawings" | "transmittals" | "approvals";

/** Design › Drawings & approvals — Drawings · Transmittals · Approvals. */
export function DrawingsApprovalsPanel({
  projectId,
  initialSubTab = "drawings",
  focusApprovalId,
}: {
  projectId: string;
  initialSubTab?: DrawingsSubTab;
  focusApprovalId?: string | null;
}) {
  const facets = useMemo(
    () => [
      {
        id: "drawings",
        label: "Drawings",
        panel: <ProjectDrawings projectId={projectId} />,
      },
      {
        id: "transmittals",
        label: "Transmittals",
        panel: <ProjectTransmittals projectId={projectId} />,
      },
      {
        id: "approvals",
        label: "Approvals",
        panel: (
          <ProjectApprovals projectId={projectId} focusApprovalId={focusApprovalId} />
        ),
      },
    ],
    [projectId, focusApprovalId],
  );

  const [value, setValue] = useState<string>(initialSubTab);

  useEffect(() => {
    setValue(initialSubTab);
  }, [initialSubTab, projectId]);

  const safe = facets.some((f) => f.id === value) ? value : "drawings";

  return (
    <ProjectFacetTabs
      facets={facets}
      value={safe}
      onChange={setValue}
      ariaLabel="Drawings, transmittals, and approvals"
    />
  );
}
