import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import SquareFootOutlined from "@mui/icons-material/SquareFootOutlined";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { JOINT_MEASUREMENT_STATUS_LABEL } from "@esti/contracts";
import { RADIUS, Surface, useScreenActions } from "@hcw/ui-kit";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExternalPortalShell } from "../components/portal/ExternalPortalShell.js";
import {
  FirmPortalDrawingsPanel,
  FirmPortalProgressPanel,
  FirmPortalProjectPanel,
} from "../components/portal/FirmPortalHubPanels.js";
import { JointMeasurementRecorder } from "../components/portal/JointMeasurementRecorder.js";
import { ProjectSiteReference } from "../components/ProjectSiteReference.js";
import { StatusDot } from "../components/StatusTag.js";
import { trpc } from "../lib/trpc.js";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";

const PORTAL_DIALOG_SLOT = {
  paper: { className: "esti-portal-dialog", sx: { borderRadius: `${RADIUS}px` } },
} as const;

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red" | "teal"> = {
  DRAFT: "gray",
  SUBMITTED: "blue",
  APPROVED: "green",
  REJECTED: "red",
  ISSUED: "teal",
};

export function SitePortal() {
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const meQ = trpc.auth.me.useQuery();
  const user = meQ.data;
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    meta: { errorTitle: "Couldn't sign out" },
    onSuccess: () => utils.auth.me.invalidate(),
  });

  // Projects list (for supervisor to pick from when not scoped to one)
  const projectsQ = trpc.projectOffice.list.useQuery(
    { limit: 50, offset: 0 },
    { enabled: !projectId },
  );

  // Inspections for selected project
  const inspectionsQ = trpc.inspections.listForSite.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );
  const invalidate = () => utils.inspections.listForSite.invalidate({ projectId: projectId! });

  const submit = trpc.inspections.submit.useMutation({ meta: { errorTitle: "Couldn't submit the inspection" }, onSuccess: invalidate });
  const createForSite = trpc.inspections.createForSite.useMutation({
    meta: { errorTitle: "Couldn't create the inspection" },
    onSuccess: () => { invalidate(); setCreateOpen(false); resetForm(); },
  });

  const visitsQ = trpc.siteVisits.listForSite.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );
  const confirmBySupervisor = trpc.siteVisits.confirmBySupervisor.useMutation({
    meta: { errorTitle: "Couldn't confirm the site visit" },
    onSuccess: () => utils.siteVisits.listForSite.invalidate({ projectId: projectId! }),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [jmOpen, setJmOpen] = useState(false);
  const [jmId, setJmId] = useState<string | null>(null);
  const [form, setForm] = useState({
    dateVisit: "", weather: "", attendees: "", progress: "", observations: "", instructions: "",
  });
  const resetForm = () => setForm({ dateVisit: "", weather: "", attendees: "", progress: "", observations: "", instructions: "" });

  const projectDetailQ = trpc.sitePortal.projectDetail.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );
  const progressQ = trpc.sitePortal.issuedProgressReports.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );
  const jmListQ = trpc.jointMeasurement.listForSite.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  const dockDialogOpen = createOpen || jmOpen;
  const dockActions = useMemo(() => {
    if (!projectId || dockDialogOpen) return [];
    return [
      {
        id: "site-jm",
        zone: "center" as const,
        tone: "primary" as const,
        label: "Joint measurement",
        icon: <SquareFootOutlined />,
        onClick: () => {
          setJmId(null);
          setJmOpen(true);
        },
      },
      {
        id: "site-inspection",
        zone: "center" as const,
        tone: "default" as const,
        label: "Inspection",
        onClick: () => setCreateOpen(true),
      },
    ];
  }, [projectId, dockDialogOpen]);
  // deps required — kit effect ignores `actions` unless listed (empty [] = mount-only).
  useScreenActions(dockActions, [dockActions]);

  const portalPanels = projectId
    ? {
        project: (
          <FirmPortalProjectPanel
            loading={projectDetailQ.isLoading}
            project={projectDetailQ.data?.project ?? null}
            phases={projectDetailQ.data?.phases ?? []}
            pickProjectHint="Pick a project from Updates to see summary and stages."
          />
        ),
        progress: (
          <FirmPortalProgressPanel
            loading={projectDetailQ.isLoading || progressQ.isLoading}
            reports={progressQ.data ?? []}
            phases={projectDetailQ.data?.phases}
          />
        ),
        drawings: (
          <FirmPortalDrawingsPanel
            loading={projectDetailQ.isLoading}
            drawings={(projectDetailQ.data?.drawings ?? []).map((dr) => ({
              id: dr.id,
              ref: dr.ref,
              title: dr.title,
              status: dr.status,
            }))}
            transmittals={(projectDetailQ.data?.transmittals ?? []).map((t) => ({
              id: t.id,
              ref: t.ref,
              purpose: t.purpose,
              channel: t.channel,
              dateIssued: t.dateIssued,
            }))}
          />
        ),
      }
    : undefined;

  const shellProps = {
    companyName: user?.fullName ?? "Site supervisor",
    portalLabel: AORMS_PORTALS.site.label,
    onSignOut: () => logout.mutate(),
    signingOut: logout.isPending,
    panels: portalPanels,
  };

  if (!projectId) {
    return (
      <ExternalPortalShell {...shellProps}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h5" component="h2">{AORMS_PORTALS.site.label}</Typography>
            <Typography variant="body2" color="text.secondary">
              Field view — pick a project
            </Typography>
          </Stack>
          {projectsQ.isLoading && (
            <Stack spacing={1.5} aria-busy="true" aria-label="Loading projects">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={72} sx={{ borderRadius: "8px !important" }} />
              ))}
            </Stack>
          )}
          {(projectsQ.data ?? []).length === 0 && !projectsQ.isLoading && (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2">No projects assigned yet.</Typography>
            </Box>
          )}
          <Stack spacing={1.5}>
            {(projectsQ.data ?? []).map((p) => (
              <Surface
                key={p.id}
                layer="soft"
                className="hcw-surface"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/projects/${p.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/projects/${p.id}`);
                  }
                }}
                sx={{
                  p: 2,
                  borderRadius: "8px",
                  cursor: "pointer",
                  outline: "none",
                  "&:focus-visible": { boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}` },
                }}
              >
                <Stack spacing={1}>
                  <Typography variant="body1">
                    <strong>{p.ref}</strong> — {p.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{p.status}</Typography>
                </Stack>
              </Surface>
            ))}
          </Stack>
        </Stack>
      </ExternalPortalShell>
    );
  }

  const inspections = inspectionsQ.data ?? [];

  const projectTitle = projectDetailQ.data?.project?.title;
  const projectRef = projectDetailQ.data?.project?.ref;

  return (
    <ExternalPortalShell {...shellProps}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Button
            variant="text"
            size="small"
            startIcon={<ArrowBackOutlined />}
            onClick={() => navigate("/")}
            sx={{ alignSelf: "flex-start", px: 0 }}
          >
            All projects
          </Button>
          <Typography variant="h5" component="h2">
            {projectRef ? `${projectRef} — ` : ""}
            {projectTitle ?? "Site"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Field view — inspections, visits, joint measurement
          </Typography>
        </Stack>

        {/* Site visits requiring supervisor confirmation */}
        {(visitsQ.data ?? []).filter((v) => v.status === "PLANNED" && !v.supervisorConfirmedAt).length > 0 && (
          <Stack spacing={1.5}>
            <Typography variant="h6" component="h3">Site visits — confirm your attendance</Typography>
            {(visitsQ.data ?? [])
              .filter((v) => v.status === "PLANNED" && !v.supervisorConfirmedAt)
              .map((v) => (
                <Surface key={v.id} layer="soft" className="hcw-surface" sx={{ p: 2, borderRadius: "8px" }}>
                  <Stack spacing={1.5}>
                    <Typography variant="body1"><strong>{v.plannedDate}</strong></Typography>
                    {v.notes && <Typography variant="body2" color="text.secondary">{v.notes}</Typography>}
                    <Box>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={confirmBySupervisor.isPending}
                        onClick={() => confirmBySupervisor.mutate({ id: v.id })}
                      >
                        Confirm attendance
                      </Button>
                    </Box>
                  </Stack>
                </Surface>
              ))}
          </Stack>
        )}

        {/* Agreed baseline (read-only source of truth) */}
        <ProjectSiteReference projectId={projectId} compact />

        <Stack spacing={1.5}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
          >
            <Typography variant="h6" component="h3" sx={{ flex: 1, minWidth: 140 }}>
              Joint measurements
            </Typography>
            <Button
              size="small"
              variant="contained"
              startIcon={<SquareFootOutlined />}
              onClick={() => {
                setJmId(null);
                setJmOpen(true);
              }}
            >
              Record
            </Button>
          </Stack>
          {jmListQ.isLoading ? (
            <Skeleton variant="rectangular" height={64} sx={{ borderRadius: "8px !important" }} />
          ) : null}
          {(jmListQ.data ?? []).length === 0 && !jmListQ.isLoading ? (
            <Typography variant="body2" color="text.secondary">
              Record a joint measurement abstract (or use the action dock), then submit for office approval.
            </Typography>
          ) : null}
          {(jmListQ.data ?? []).map((jm) => (
            <Surface
              key={jm.id}
              layer="soft"
              className="hcw-surface"
              role="button"
              tabIndex={0}
              onClick={() => {
                setJmId(jm.id);
                setJmOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setJmId(jm.id);
                  setJmOpen(true);
                }
              }}
              sx={{
                p: 1.5,
                borderRadius: "8px",
                cursor: "pointer",
                outline: "none",
                "&:focus-visible": { boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}` },
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                  {jm.subject}
                </Typography>
                <StatusDot
                  color={STATUS_TAG[jm.status] ?? "gray"}
                  label={
                    JOINT_MEASUREMENT_STATUS_LABEL[
                      jm.status as keyof typeof JOINT_MEASUREMENT_STATUS_LABEL
                    ] ?? jm.status
                  }
                />
              </Stack>
              {jm.measuredOn ? (
                <Typography variant="caption" color="text.secondary">
                  Measured {jm.measuredOn}
                </Typography>
              ) : null}
            </Surface>
          ))}
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
        >
          <Typography variant="h6" component="h3" sx={{ flex: 1, minWidth: 140 }}>
            Inspections
          </Typography>
          <Button variant="contained" size="small" onClick={() => setCreateOpen(true)}>
            New inspection
          </Button>
        </Stack>

        {inspectionsQ.isLoading && (
          <Stack spacing={0.5}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={32} />
            ))}
          </Stack>
        )}
        {inspections.length === 0 && !inspectionsQ.isLoading && (
          <Typography variant="body2" color="text.secondary">
            No inspection reports yet. Use New inspection or the action dock.
          </Typography>
        )}

        <Stack spacing={1.5}>
          {inspections.map((insp) => (
            <Surface key={insp.id} layer="soft" className="hcw-surface" sx={{ p: 2, borderRadius: "8px" }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Typography variant="body1"><strong>{insp.ref}</strong></Typography>
                  <StatusDot color={STATUS_TAG[insp.status] ?? "gray"} label={insp.status} />
                </Stack>
                {insp.dateVisit && (
                  <Typography variant="body2" color="text.secondary">Visit: {insp.dateVisit}</Typography>
                )}
                {insp.progress && (
                  <Typography variant="body2">
                    {insp.progress.slice(0, 120)}{insp.progress.length > 120 ? "…" : ""}
                  </Typography>
                )}
                {insp.status === "REJECTED" && insp.rejectionNote && (
                  <Alert severity="error">
                    <strong>Rejected</strong> — {insp.rejectionNote}
                  </Alert>
                )}
                {insp.status === "DRAFT" && (
                  <Box>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={submit.isPending}
                      onClick={() => submit.mutate({ id: insp.id })}
                    >
                      {submit.isPending ? "Submitting…" : "Submit for approval"}
                    </Button>
                  </Box>
                )}
              </Stack>
            </Surface>
          ))}
        </Stack>
      </Stack>

      <Dialog
        aria-labelledby="site-portal-inspection-title"
        open={createOpen}
        onClose={() => { setCreateOpen(false); resetForm(); }}
        fullWidth
        maxWidth="sm"
        slotProps={PORTAL_DIALOG_SLOT}
      >
        <DialogTitle id="site-portal-inspection-title">New inspection report</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              id="si-date"
              label="Date of visit"
              type="date"
              value={form.dateVisit}
              onChange={(e) => setForm((f) => ({ ...f, dateVisit: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              id="si-weather"
              label="Weather"
              value={form.weather}
              onChange={(e) => setForm((f) => ({ ...f, weather: e.target.value }))}
              fullWidth
            />
            <TextField
              id="si-att"
              label="Attendees"
              value={form.attendees}
              onChange={(e) => setForm((f) => ({ ...f, attendees: e.target.value }))}
              fullWidth
            />
            <TextField
              id="si-prog"
              label="Progress"
              multiline
              rows={3}
              value={form.progress}
              onChange={(e) => setForm((f) => ({ ...f, progress: e.target.value }))}
              fullWidth
            />
            <TextField
              id="si-obs"
              label="Observations"
              multiline
              rows={3}
              value={form.observations}
              onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
              fullWidth
            />
            <TextField
              id="si-instr"
              label="Instructions"
              multiline
              rows={3}
              value={form.instructions}
              onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => { setCreateOpen(false); resetForm(); }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={createForSite.isPending}
            onClick={() =>
              createForSite.mutate({
                projectId: projectId!,
                dateVisit: form.dateVisit || undefined,
                weather: form.weather || undefined,
                attendees: form.attendees || undefined,
                progress: form.progress || undefined,
                observations: form.observations || undefined,
                instructions: form.instructions || undefined,
                inspectorName: user?.fullName || undefined,
              })
            }
          >
            {createForSite.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <JointMeasurementRecorder
        projectId={projectId}
        open={jmOpen}
        jointMeasurementId={jmId}
        drawings={(projectDetailQ.data?.drawings ?? []).map((d) => ({
          id: d.id,
          ref: d.ref,
          title: d.title,
        }))}
        onClose={() => {
          setJmOpen(false);
          setJmId(null);
          void jmListQ.refetch();
        }}
      />
    </ExternalPortalShell>
  );
}
