import { Tab, TabList, Tabs } from "@carbon/react";
import { useState } from "react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { ProjectDocuments, ProjectSpecSheets } from "../ProjectDocuments.js";

/**
 * Documents | Specifications — one workspace tab, two surfaces. Wave 3 (Carbon):
 * stock `Tabs`/`TabList` for the tab bar; panels render conditionally below to
 * preserve the original lazy mount. Was MUI `Tabs`/`Tab`.
 */
export function DocumentsSpecsPanel({ projectId }: { projectId: string }) {
  const [sub, setSub] = useState(0);
  return (
    <div>
      <CarbonScope>
        <Tabs
          selectedIndex={sub}
          onChange={({ selectedIndex }) => setSub(selectedIndex)}
        >
          <TabList aria-label="Documents and specifications" contained>
            <Tab>Documents</Tab>
            <Tab>Specifications</Tab>
          </TabList>
        </Tabs>
      </CarbonScope>
      {sub === 0 && <ProjectDocuments projectId={projectId} includeSpecs={false} />}
      {sub === 1 && <ProjectSpecSheets projectId={projectId} />}
    </div>
  );
}
