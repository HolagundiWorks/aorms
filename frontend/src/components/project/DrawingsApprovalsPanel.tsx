import { Tab, TabList, Tabs } from "@carbon/react";
import { useEffect, useState } from "react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { ProjectApprovals } from "../ProjectApprovals.js";
import { ProjectDrawings } from "../ProjectDrawings.js";
import { ProjectTransmittals } from "../ProjectTransmittals.js";

type DrawingsSubTab = "drawings" | "transmittals" | "approvals";

function subTabIndex(tab: DrawingsSubTab): number {
  if (tab === "transmittals") return 1;
  if (tab === "approvals") return 2;
  return 0;
}

/**
 * Progressive disclosure for the former concatenated Drawings + Transmittals +
 * Approvals stack (Hick / Serial Position). One tab at a time. Wave 3 (Carbon).
 */
export function DrawingsApprovalsPanel({
  projectId,
  initialSubTab = "drawings",
  focusApprovalId,
}: {
  projectId: string;
  initialSubTab?: DrawingsSubTab;
  focusApprovalId?: string | null;
}) {
  const [sub, setSub] = useState(() => subTabIndex(initialSubTab));

  useEffect(() => {
    setSub(subTabIndex(initialSubTab));
  }, [initialSubTab, projectId]);
  return (
    <div>
      <CarbonScope>
        <Tabs selectedIndex={sub} onChange={({ selectedIndex }) => setSub(selectedIndex)}>
          <TabList aria-label="Drawings, transmittals, and approvals" contained scrollIntoView>
            <Tab>Drawings</Tab>
            <Tab>Transmittals</Tab>
            <Tab>Approvals</Tab>
          </TabList>
        </Tabs>
      </CarbonScope>
      {sub === 0 && <ProjectDrawings projectId={projectId} />}
      {sub === 1 && <ProjectTransmittals projectId={projectId} />}
      {sub === 2 && (
        <ProjectApprovals projectId={projectId} focusApprovalId={focusApprovalId} />
      )}
    </div>
  );
}
