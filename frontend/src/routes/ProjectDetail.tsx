import { Box, Skeleton, Stack, Typography } from "@mui/material";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_TAG,
  PROJECT_WORK_TYPE_LABEL,
  formatINR,
  type ProjectStatus,
} from "@esti/contracts";
import { RailLayout } from "../components/RailLayout.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { type ReactNode, useCallback, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ProjectEstimates } from "../components/ProjectEstimates.js";
import { ProjectMeasurementPanel } from "../components/measurement/ProjectMeasurementPanel.js";
import { DrawingsApprovalsPanel } from "../components/project/DrawingsApprovalsPanel.js";
import { DocumentsSpecsPanel } from "../components/project/DocumentsSpecsPanel.js";
import { ProjectBriefPanel } from "../components/project/ProjectBriefPanel.js";
import { ProjectFinancePanel } from "../components/project/ProjectFinancePanel.js";
import { ProjectTenders } from "../components/project/ProjectTenders.js";
import { ProjectMoodboard } from "../components/project/ProjectMoodboard.js";
import { ProjectSectionNav } from "../components/project/ProjectSectionNav.js";
import {
  ProjectCoordinationPanel,
  ProjectSiteBandPanel,
  ProjectTechnicalPanel,
} from "../components/project/ProjectSitePanels.js";
import { ProjectSettings } from "../components/ProjectSettings.js";
import { ProjectLessons } from "../components/ProjectLessons.js";
import { ProjectOverview } from "../components/ProjectOverview.js";
import { ProjectRailSignals } from "../components/ProjectRailSignals.js";
import { StatusTag } from "../components/StatusTag.js";
import { useCapabilities } from "../lib/capabilities.js";
import { trpc } from "../lib/trpc.js";

type ProjectTab = { slug: string; label: string; panel: ReactNode };
type ProjectGroup = { slug: string; label: string; tabs: ProjectTab[] };

/** Map legacy deep-link tab slugs onto Setup · Design · Commercial · Site. */
const LEGACY_TAB: Record<string, string> = {
  "running-bills": "measurement",
  costing: "measurement",
  pipeline: "brief",
  program: "brief",
  info: "brief",
  cpi: "brief",
  ro: "brief",
  "spec-sheets": "documents",
  delivery: "site",
  "site-visits": "site",
  snags: "site",
  "progress-reports": "site",
  "phase-stages": "site",
  communications: "coordination",
  minutes: "coordination",
  programme: "coordination",
  packages: "coordination",
  bbs: "technical",
  "steel-recon": "technical",
  steel: "technical",
  "ra-certification": "technical",
  "running-account": "technical",
  "steel-certification": "technical",
  approvals: "drawings",
  invoices: "finance",
  "purchase-orders": "finance",
  team: "settings",
};

/** Nested facet defaults when landing from a legacy slug. */
const LEGACY_FACET: Record<string, string> = {
  "site-visits": "site-progress",
  snags: "snags",
  "progress-reports": "progress-reports",
  "phase-stages": "phase-stages",
  communications: "communications",
  minutes: "minutes",
  programme: "programme",
  packages: "packages",
  bbs: "bbs",
  "steel-recon": "steel-recon",
  steel: "steel-recon",
  "ra-certification": "ra-certification",
  "running-account": "ra-certification",
  "steel-certification": "steel-certification",
  invoices: "invoices",
  "purchase-orders": "purchase-orders",
  team: "team",
  pipeline: "pipeline",
  program: "program",
  info: "info",
  cpi: "cpi",
  ro: "ro",
};

export function ProjectDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canHr, canWrite, canFees, canInvoice } = useCapabilities();
  const project = trpc.projectOffice.byId.useQuery({ id }, { enabled: !!id });
  const settingsQ = trpc.settings.get.useQuery();
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const phasesQ = trpc.phases.listByProject.useQuery(
    { projectId: id },
    { enabled: !!id },
  );

  const rawTab = searchParams.get("tab") ?? "overview";
  const facetParam = searchParams.get("facet");
  const approvalId = searchParams.get("approvalId");
  const invoiceId = searchParams.get("invoiceId");
  const showTeam = hrEnabled && canHr;
  const isResidential = /residential/i.test(project.data?.projectType ?? "");
  const drawingsInitialSub =
    rawTab === "approvals" || approvalId ? ("approvals" as const) : ("drawings" as const);

  const siteInitialFacet = facetParam ?? LEGACY_FACET[rawTab];
  const financeInitialFacet =
    facetParam === "invoices" || facetParam === "purchase-orders"
      ? facetParam
      : LEGACY_FACET[rawTab] === "invoices" || LEGACY_FACET[rawTab] === "purchase-orders"
        ? LEGACY_FACET[rawTab]
        : invoiceId
          ? "invoices"
          : undefined;

  const setFacet = useCallback(
    (facet: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("facet", facet);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const projectGroups = useMemo((): ProjectGroup[] => {
    // Odd peer groups: Setup 3 · Design 5 · Commercial gated · Site 3.
    const setupTabs: ProjectTab[] = [
      { slug: "overview", label: "Overview", panel: <ProjectOverview projectId={id} /> },
      {
        slug: "brief",
        label: "Brief",
        panel: (
          <ProjectBriefPanel
            projectId={id}
            showCpi={isResidential}
            initialFacet={siteInitialFacet}
          />
        ),
      },
      {
        slug: "settings",
        label: "Settings",
        panel: <ProjectSettings projectId={id} showTeam={showTeam} />,
      },
    ];

    const designTabs: ProjectTab[] = [
      {
        slug: "measurement",
        label: "Measurement",
        panel: <ProjectMeasurementPanel projectId={id} />,
      },
      {
        slug: "drawings",
        label: "Drawings & approvals",
        panel: (
          <DrawingsApprovalsPanel
            projectId={id}
            initialSubTab={drawingsInitialSub}
            focusApprovalId={approvalId}
          />
        ),
      },
      {
        slug: "documents",
        label: "Documents",
        panel: <DocumentsSpecsPanel projectId={id} />,
      },
      {
        slug: "moodboard",
        label: "Moodboard",
        panel: <ProjectMoodboard projectId={id} />,
      },
      { slug: "lessons", label: "Lessons", panel: <ProjectLessons projectId={id} /> },
    ];

    const commercialTabs: ProjectTab[] = [];
    if (canFees) {
      commercialTabs.push({
        slug: "estimation",
        label: "Estimation",
        panel: <ProjectEstimates projectId={id} />,
      });
    }
    if (canWrite) {
      commercialTabs.push({
        slug: "tenders",
        label: "Tenders",
        panel: <ProjectTenders projectId={id} />,
      });
    }
    if (canInvoice || canWrite) {
      commercialTabs.push({
        slug: "finance",
        label: "Finance",
        panel: (
          <ProjectFinancePanel
            projectId={id}
            canInvoice={canInvoice}
            canWrite={canWrite}
            highlightInvoiceId={invoiceId}
            initialFacet={financeInitialFacet}
            onFacetChange={setFacet}
          />
        ),
      });
    }

    const siteTabs: ProjectTab[] = [
      {
        slug: "site",
        label: "Site",
        panel: (
          <ProjectSiteBandPanel projectId={id} initialFacet={siteInitialFacet} />
        ),
      },
      {
        slug: "coordination",
        label: "Coordination",
        panel: (
          <ProjectCoordinationPanel projectId={id} initialFacet={siteInitialFacet} />
        ),
      },
      {
        slug: "technical",
        label: "Technical",
        panel: (
          <ProjectTechnicalPanel projectId={id} initialFacet={siteInitialFacet} />
        ),
      },
    ];

    const groups: ProjectGroup[] = [
      { slug: "setup", label: "Setup", tabs: setupTabs },
      { slug: "design", label: "Design", tabs: designTabs },
    ];
    if (commercialTabs.length > 0) {
      groups.push({ slug: "commercial", label: "Commercial", tabs: commercialTabs });
    }
    groups.push({ slug: "site", label: "Site", tabs: siteTabs });
    return groups;
  }, [
    id,
    showTeam,
    isResidential,
    canWrite,
    canFees,
    canInvoice,
    approvalId,
    invoiceId,
    drawingsInitialSub,
    siteInitialFacet,
    financeInitialFacet,
    setFacet,
  ]);

  const projectTabs = projectGroups.flatMap((g) => g.tabs);

  const tabSlug = LEGACY_TAB[rawTab] ?? rawTab;
  const tabIndex = Math.max(
    0,
    projectTabs.findIndex((t) => t.slug === tabSlug),
  );
  const activeTab = projectTabs[tabIndex]?.slug ?? "overview";
  const activeGroup =
    projectGroups.find((g) => g.tabs.some((t) => t.slug === activeTab)) ?? projectGroups[0]!;
  const activeLabel = projectTabs.find((t) => t.slug === activeTab)?.label ?? activeTab;
  const activePanel = projectTabs.find((t) => t.slug === activeTab)?.panel ?? null;

  const selectTab = (slug: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", slug);
        // Clear facet when switching peers unless staying on finance/site bands.
        if (slug !== "finance" && slug !== "site" && slug !== "coordination" && slug !== "technical") {
          next.delete("facet");
        }
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    if (rawTab === "tasks" && id) {
      navigate(`/tasks?projectId=${id}`, { replace: true });
      return;
    }
    const preserveRaw =
      rawTab === "approvals" ||
      rawTab === "invoices" ||
      rawTab === "purchase-orders" ||
      rawTab === "team";
    const shouldNormalizeTab =
      tabSlug !== activeTab || (rawTab !== activeTab && !preserveRaw);
    if (shouldNormalizeTab) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", activeTab);
          const legacyFacet = LEGACY_FACET[rawTab];
          if (legacyFacet && !next.get("facet")) {
            next.set("facet", legacyFacet);
          }
          return next;
        },
        { replace: true },
      );
    }
  }, [tabSlug, activeTab, rawTab, setSearchParams, id, navigate]);

  useEffect(() => {
    if (activeTab === "settings" && (facetParam === "team" || rawTab === "team") && showTeam) {
      document.getElementById("project-settings-team")?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    }
  }, [activeTab, facetParam, rawTab, showTeam]);

  if (project.isLoading) {
    return (
      <RailLayout title="Loading project…" description="Fetching project details">
        <Stack spacing={1.5} aria-busy="true" aria-label="Loading project">
          <Skeleton variant="rectangular" height={40} />
          <Skeleton variant="rectangular" height={220} />
          <Skeleton variant="rectangular" height={120} />
        </Stack>
      </RailLayout>
    );
  }
  if (!project.data) {
    return (
      <Typography component="p">
        Project not found. <Link to="/projects">Back</Link>
      </Typography>
    );
  }
  const p = project.data;
  const phases = phasesQ.data ?? [];
  const currentPhase =
    phases.find((ph) => ph.id === p.currentPhaseId) ?? phases[phases.length - 1];
  const workTypeLabel =
    PROJECT_WORK_TYPE_LABEL[
      (p as { workType?: keyof typeof PROJECT_WORK_TYPE_LABEL }).workType ??
        "ARCHITECTURE"
    ];
  const contractValuePaise = (p as { contractValuePaise?: number })
    .contractValuePaise;

  const Fact = ({ label, value }: { label: string; value: ReactNode }) => (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        gap: 1,
        py: 0.5,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="caption" sx={{ textAlign: "right", fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );

  return (
    <RailLayout
      title={`${p.ref} — ${p.title}`}
      description={`${workTypeLabel} · ${p.projectType} · ${p.jurisdiction}`}
      tabs={
        <ProjectSectionNav
          ariaLabel="Project sections"
          groups={projectGroups.map((g) => ({
            slug: g.slug,
            label: g.label,
            tabs: g.tabs.map((t) => ({ slug: t.slug, label: t.label })),
          }))}
          activeSlug={activeTab}
          onSelect={selectTab}
        />
      }
      aside={
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          useFlexGap
          sx={{ alignItems: { md: "flex-start" }, flexWrap: "wrap" }}
        >
          <StatusTag
            value={p.status as ProjectStatus}
            map={PROJECT_STATUS_TAG}
            label={
              PROJECT_STATUS_LABEL[p.status as keyof typeof PROJECT_STATUS_LABEL] ??
              p.status
            }
          />

          <Box sx={{ minWidth: 200, flex: "1 1 220px" }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
              Facts
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              {currentPhase && (
                <Fact
                  label="Stage"
                  value={
                    <Link to={`/projects/${id}?tab=brief`}>{currentPhase.label}</Link>
                  }
                />
              )}
              <Fact
                label="Status"
                value={
                  PROJECT_STATUS_LABEL[p.status as keyof typeof PROJECT_STATUS_LABEL] ??
                  p.status
                }
              />
              <Fact label="Type" value={p.projectType} />
              <Fact label="Jurisdiction" value={p.jurisdiction} />
              {typeof contractValuePaise === "number" && (
                <Fact
                  label="Contract value"
                  value={formatINR(contractValuePaise, { paise: false })}
                />
              )}
            </Box>
          </Box>

          <Box sx={{ flex: "1 1 240px", minWidth: 200 }}>
            <ProjectRailSignals projectId={id} />
          </Box>
        </Stack>
      }
    >
      <PageBreadcrumb
        items={[
          { label: "Projects", to: "/projects" },
          { label: p.ref, to: `/projects/${id}?tab=overview` },
          { label: activeGroup.label },
          { label: activeLabel },
        ]}
      />

      <Box sx={{ pt: 0.5 }}>{activePanel}</Box>
    </RailLayout>
  );
}
