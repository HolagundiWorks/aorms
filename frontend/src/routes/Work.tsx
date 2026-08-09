import { Box, Stack, Typography } from "@mui/material";
import { useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import { useScreenActions } from "@hcw/ui-kit";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { ProjectSectionNav } from "../components/project/ProjectSectionNav.js";
import { ActivityTab } from "../components/work/ActivityTab.js";
import { AttendanceTab } from "../components/work/AttendanceTab.js";
import { TaskBoardTab } from "../components/work/TaskBoardTab.js";
import { TaskCalendarTab } from "../components/work/TaskCalendarTab.js";
import { TasksTab, type TasksTabHandle } from "../components/work/TasksTab.js";
import { WorkloadTab } from "../components/work/WorkloadTab.js";
import { can } from "@esti/contracts";
import { canonicalWorkTab, type WorkTabSlug } from "../components/work/workHelpers.js";
import { ClientRequests } from "./ClientRequests.js";
import { ConsultantRequests } from "./ConsultantRequests.js";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";

type TabDef = { slug: WorkTabSlug; label: string; panel: React.ReactNode };

export function Work() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const settingsQ = trpc.settings.get.useQuery();
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;

  const canWrite = can(user?.role, "write");
  const canHr = can(user?.role, "hr:manage");

  const tasksRef = useRef<TasksTabHandle>(null);

  const allTabs: TabDef[] = useMemo(
    () => [
      { slug: "tasks", label: "Tasks", panel: <TasksTab ref={tasksRef} /> },
      { slug: "board", label: "Board", panel: <TaskBoardTab /> },
      { slug: "calendar", label: "Calendar", panel: <TaskCalendarTab /> },
      ...(hrEnabled && canHr
        ? [{ slug: "workload" as WorkTabSlug, label: "Workload", panel: <WorkloadTab /> }]
        : []),
      { slug: "activity", label: "Activity", panel: <ActivityTab /> },
      ...(canWrite
        ? [
            {
              slug: "requests" as WorkTabSlug,
              label: "Requests",
              panel: (
                <Stack spacing={4}>
                  <Stack spacing={1}>
                    <Typography variant="h6" component="h2">
                      Client requests
                    </Typography>
                    <ClientRequests embedded />
                  </Stack>
                  <Stack spacing={1}>
                    <Typography variant="h6" component="h2">
                      Consultant requests
                    </Typography>
                    <ConsultantRequests embedded />
                  </Stack>
                </Stack>
              ),
            },
          ]
        : []),
      ...(hrEnabled && canHr
        ? [
            {
              slug: "attendance" as WorkTabSlug,
              label: "Attendance",
              panel: <AttendanceTab />,
            },
          ]
        : []),
    ],
    [hrEnabled, canHr, canWrite],
  );

  const tab = canonicalWorkTab((searchParams.get("tab") ?? "tasks") as WorkTabSlug);
  const tabIndex = Math.max(
    0,
    allTabs.findIndex((t) => t.slug === tab),
  );
  const activeTab = allTabs[tabIndex]?.slug ?? "tasks";
  const activePanel = allTabs.find((t) => t.slug === activeTab)?.panel ?? null;

  const workGroups = useMemo(() => {
    const bySlug = new Map(allTabs.map((t) => [t.slug, t]));
    const pick = (...slugs: WorkTabSlug[]) =>
      slugs
        .filter((s) => bySlug.has(s))
        .map((s) => ({ slug: s, label: bySlug.get(s)!.label }));

    const groups = [
      { slug: "execute", label: "Execute", tabs: pick("tasks", "board", "calendar") },
      {
        slug: "coordinate",
        label: "Coordinate",
        tabs: pick("requests", "activity"),
      },
      {
        slug: "capacity",
        label: "Capacity",
        tabs: pick("workload", "attendance"),
      },
    ];
    return groups.filter((g) => g.tabs.length > 0);
  }, [allTabs]);

  useScreenActions(
    activeTab === "tasks"
      ? [
          {
            id: "new-task",
            zone: "center",
            tone: "primary",
            label: "New task",
            icon: <AddIcon />,
            onClick: () => tasksRef.current?.openCreate(),
          },
        ]
      : [],
    [activeTab],
  );

  return (
    <RailLayout
      title="Work"
      description={
        hrEnabled && canHr
          ? "Tasks, portal triage, workload, attendance, and office activity."
          : "Tasks, client and consultant requests, and activity — enable Team & HR for workload and attendance."
      }
      tabs={
        <ProjectSectionNav
          ariaLabel="Work sections"
          groups={workGroups}
          activeSlug={activeTab}
          onSelect={(slug) => setSearchParams({ tab: slug }, { replace: true })}
        />
      }
    >
      <PageBreadcrumb
        items={[
          { label: "Tasks" },
          { label: allTabs[tabIndex]?.label ?? "Tasks" },
        ]}
      />
      <Box>{activePanel}</Box>
    </RailLayout>
  );
}
