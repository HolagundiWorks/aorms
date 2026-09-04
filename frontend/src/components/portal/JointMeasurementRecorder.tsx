import SquareFootOutlined from "@mui/icons-material/SquareFootOutlined";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  JOINT_MEASUREMENT_STATUS_LABEL,
  MEASUREMENT_UOM_LABEL,
  MeasurementUom,
  measureKindFromUom,
  type JointMeasurementAnnotationTool,
  type MeasurementUom as MeasurementUomT,
} from "@esti/contracts";
import { pushToast, RADIUS, Surface } from "@hcw/ui-kit";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ProjectFacetTabs } from "../project/ProjectFacetTabs.js";
import { StatusDot } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";

const PORTAL_DIALOG_SLOT = {
  paper: { className: "esti-portal-dialog", sx: { borderRadius: `${RADIUS}px` } },
} as const;

type LineDraft = {
  key: string;
  code: string;
  description: string;
  uom: MeasurementUomT;
  lengthMm: string;
  breadthMm: string;
  heightMm: string;
  countNos: string;
};

type AnnDraft = {
  id?: string;
  tool: JointMeasurementAnnotationTool;
  label: string;
  points: { x: number; y: number }[];
};

const UOMS = MeasurementUom.options;
const STATUS_COLOR: Record<string, "gray" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  SUBMITTED: "blue",
  APPROVED: "green",
  REJECTED: "red",
};

function blankLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    code: "",
    description: "",
    uom: "CUM",
    lengthMm: "",
    breadthMm: "",
    heightMm: "",
    countNos: "1",
  };
}

type Props = {
  projectId: string;
  open: boolean;
  onClose: () => void;
  /** Open an existing JM (else create new). */
  jointMeasurementId?: string | null;
  drawings?: { id: string; ref: string; title: string }[];
};

/**
 * Site supervisor joint measurement recorder — header, abstract lines, PDF annotate.
 */
export function JointMeasurementRecorder({
  projectId,
  open,
  onClose,
  jointMeasurementId,
  drawings = [],
}: Props) {
  const utils = trpc.useUtils();
  const [jmId, setJmId] = useState<string | null>(jointMeasurementId ?? null);
  const [tab, setTab] = useState("sheet");
  const [subject, setSubject] = useState("Joint measurement");
  const [measuredOn, setMeasuredOn] = useState("");
  const [details, setDetails] = useState("");
  const [attentionToId, setAttentionToId] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);
  const [status, setStatus] = useState("DRAFT");
  const [reviewNote, setReviewNote] = useState<string | null>(null);

  const [drawingId, setDrawingId] = useState("");
  // Read inside the detailQ.data effect below without depending on `drawings`
  // (a prop) — keeps that effect scoped to "run when the loaded detail
  // changes" rather than re-running whenever the drawing list changes.
  const drawingsRef = useRef(drawings);
  drawingsRef.current = drawings;
  const [tool, setTool] = useState<JointMeasurementAnnotationTool>("PIN");
  const [annLabel, setAnnLabel] = useState("");
  const [draftPoints, setDraftPoints] = useState<{ x: number; y: number }[]>([]);
  const [localAnns, setLocalAnns] = useState<AnnDraft[]>([]);

  const teamQ = trpc.jointMeasurement.projectTeam.useQuery(
    { projectId },
    { enabled: open && !!projectId },
  );
  const detailQ = trpc.jointMeasurement.get.useQuery(
    { id: jmId! },
    { enabled: open && !!jmId },
  );

  useEffect(() => {
    if (open) {
      setJmId(jointMeasurementId ?? null);
      setTab("sheet");
      if (!jointMeasurementId) {
        setSubject("Joint measurement");
        setMeasuredOn("");
        setDetails("");
        setAttentionToId("");
        setLines([blankLine()]);
        setStatus("DRAFT");
        setReviewNote(null);
        setLocalAnns([]);
        setDraftPoints([]);
      }
    }
  }, [open, jointMeasurementId]);

  useEffect(() => {
    const d = detailQ.data;
    if (!d) return;
    setSubject(d.header.subject);
    setMeasuredOn(d.header.measuredOn ?? "");
    setDetails(d.header.details ?? "");
    setAttentionToId(d.header.attentionToId ?? "");
    setStatus(d.header.status);
    setReviewNote(d.header.reviewNote);
    setLines(
      d.lines.length > 0
        ? d.lines.map((l) => ({
            key: l.id,
            code: l.code ?? "",
            description: l.description,
            uom: (UOMS.includes(l.uom as MeasurementUomT)
              ? l.uom
              : "CUM") as MeasurementUomT,
            lengthMm: l.lengthMm != null ? String(l.lengthMm) : "",
            breadthMm: l.breadthMm != null ? String(l.breadthMm) : "",
            heightMm: l.heightMm != null ? String(l.heightMm) : "",
            countNos: String(l.countNos ?? 1),
          }))
        : [blankLine()],
    );
    setLocalAnns(
      d.annotations.map((a) => {
        const geo = a.geometry as { points?: { x: number; y: number }[] };
        return {
          id: a.id,
          tool: a.tool as JointMeasurementAnnotationTool,
          label: a.label ?? "",
          points: geo.points ?? [],
        };
      }),
    );
    setDrawingId(
      (prev) => prev || d.annotations[0]?.drawingId || drawingsRef.current[0]?.id || prev,
    );
  }, [detailQ.data]);

  const editable = status === "DRAFT" || status === "REJECTED";

  const upsertDraft = trpc.jointMeasurement.upsertDraft.useMutation({
    meta: { errorTitle: "Couldn't save joint measurement" },
  });
  const upsertLines = trpc.jointMeasurement.upsertLines.useMutation({
    meta: { errorTitle: "Couldn't save lines" },
  });
  const submit = trpc.jointMeasurement.submitForApproval.useMutation({
    meta: { errorTitle: "Couldn't submit" },
    onSuccess: () => {
      utils.jointMeasurement.listForSite.invalidate({ projectId });
      if (jmId) utils.jointMeasurement.get.invalidate({ id: jmId });
      pushToast({ kind: "success", title: "Submitted for approval" });
      onClose();
    },
  });
  const upsertAnn = trpc.jointMeasurement.upsertAnnotation.useMutation({
    meta: { errorTitle: "Couldn't save annotation" },
  });
  const removeAnn = trpc.jointMeasurement.removeAnnotation.useMutation({
    meta: { errorTitle: "Couldn't remove annotation" },
  });

  async function ensureSaved(): Promise<string | null> {
    const header = await upsertDraft.mutateAsync({
      id: jmId ?? undefined,
      projectId,
      subject: subject.trim() || "Joint measurement",
      measuredOn: measuredOn || null,
      details: details.trim() || null,
      attentionToId: attentionToId || null,
    });
    setJmId(header.id);
    setStatus(header.status);
    const payload = lines
      .filter((l) => l.description.trim())
      .map((l, i) => ({
        code: l.code.trim() || null,
        description: l.description.trim(),
        uom: l.uom,
        measureKind: measureKindFromUom(l.uom),
        lengthMm: l.lengthMm ? Number(l.lengthMm) : null,
        breadthMm: l.breadthMm ? Number(l.breadthMm) : null,
        heightMm: l.heightMm ? Number(l.heightMm) : null,
        countNos: l.countNos ? Number(l.countNos) : 1,
        sortOrder: (i + 1) * 10,
      }));
    await upsertLines.mutateAsync({
      jointMeasurementId: header.id,
      lines: payload,
      replace: true,
    });
    utils.jointMeasurement.listForSite.invalidate({ projectId });
    return header.id;
  }

  function onCanvasClick(e: MouseEvent<SVGSVGElement>) {
    if (!editable || !drawingId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000);
    if (tool === "PIN") {
      void persistAnnotation({
        tool: "PIN",
        label: annLabel,
        points: [{ x, y }],
      });
      return;
    }
    const next = [...draftPoints, { x, y }];
    setDraftPoints(next);
  }

  async function finishPathAnnotation() {
    if (draftPoints.length < 2 || !drawingId) return;
    await persistAnnotation({ tool, label: annLabel, points: draftPoints });
    setDraftPoints([]);
  }

  async function persistAnnotation(ann: AnnDraft) {
    const id = jmId ?? (await ensureSaved());
    if (!id || !drawingId) {
      pushToast({ kind: "error", title: "Select a drawing first" });
      return;
    }
    const row = await upsertAnn.mutateAsync({
      jointMeasurementId: id,
      drawingId,
      tool: ann.tool,
      label: ann.label || null,
      geometry: { kind: ann.tool, points: ann.points },
      pageNo: 0,
      color: "#FF4F18",
    });
    setLocalAnns((prev) => [
      ...prev.filter((a) => a.id !== row.id),
      { id: row.id, tool: ann.tool, label: ann.label, points: ann.points },
    ]);
    pushToast({ kind: "success", title: "Annotation saved" });
  }

  const team = teamQ.data ?? [];
  const pending = upsertDraft.isPending || upsertLines.isPending || submit.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={PORTAL_DIALOG_SLOT}
    >
      <DialogTitle>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <SquareFootOutlined fontSize="small" />
          <Typography component="span" variant="h6">
            Joint measurement
          </Typography>
          <StatusDot
            color={STATUS_COLOR[status] ?? "gray"}
            label={
              JOINT_MEASUREMENT_STATUS_LABEL[
                status as keyof typeof JOINT_MEASUREMENT_STATUS_LABEL
              ] ?? status
            }
          />
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {status === "REJECTED" && reviewNote ? (
            <Typography variant="body2" color="error">
              Rejected — {reviewNote}
            </Typography>
          ) : null}
          <ProjectFacetTabs
            ariaLabel="Joint measurement sections"
            value={tab}
            onChange={setTab}
            facets={[
              {
                id: "sheet",
                label: "Sheet",
                panel: (
                  <Stack spacing={2}>
                    <TextField
                      label="Subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      fullWidth
                      required
                      disabled={!editable}
                    />
                    <TextField
                      label="Measured on"
                      type="date"
                      value={measuredOn}
                      onChange={(e) => setMeasuredOn(e.target.value)}
                      fullWidth
                      disabled={!editable}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                      label="Details"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      fullWidth
                      multiline
                      minRows={2}
                      disabled={!editable}
                    />
                    {team.length > 0 ? (
                      <TextField
                        select
                        label="Tag team member (optional)"
                        helperText="Which firm team member should approve / handle this?"
                        value={attentionToId}
                        onChange={(e) => setAttentionToId(e.target.value)}
                        fullWidth
                        disabled={!editable}
                      >
                        <MenuItem value="">— any team member —</MenuItem>
                        {team.map((m) => (
                          <MenuItem key={m.id} value={m.id}>
                            {`${m.fullName} (${m.role})`}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : null}

                    <Typography variant="subtitle2">Items</Typography>
                    <Stack spacing={1}>
                      {lines.map((line, idx) => (
                        <Surface
                          key={line.key}
                          layer="soft"
                          className="hcw-surface"
                          sx={{ p: 1.5, borderRadius: "8px" }}
                        >
                          <Stack spacing={1}>
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1}
                              sx={{ alignItems: { sm: "flex-start" } }}
                            >
                              <TextField
                                label="Code"
                                value={line.code}
                                disabled={!editable}
                                onChange={(e) =>
                                  setLines((rows) =>
                                    rows.map((r, i) =>
                                      i === idx ? { ...r, code: e.target.value } : r,
                                    ),
                                  )
                                }
                                sx={{ width: { xs: "100%", sm: 100 } }}
                                size="small"
                              />
                              <TextField
                                label="Particulars"
                                value={line.description}
                                disabled={!editable}
                                onChange={(e) =>
                                  setLines((rows) =>
                                    rows.map((r, i) =>
                                      i === idx ? { ...r, description: e.target.value } : r,
                                    ),
                                  )
                                }
                                fullWidth
                                size="small"
                              />
                              <TextField
                                select
                                label="UOM"
                                value={line.uom}
                                disabled={!editable}
                                onChange={(e) =>
                                  setLines((rows) =>
                                    rows.map((r, i) =>
                                      i === idx
                                        ? { ...r, uom: e.target.value as MeasurementUomT }
                                        : r,
                                    ),
                                  )
                                }
                                sx={{ width: { xs: "100%", sm: 110 } }}
                                size="small"
                              >
                                {UOMS.map((u) => (
                                  <MenuItem key={u} value={u}>
                                    {MEASUREMENT_UOM_LABEL[u]}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Stack>
                            <Stack
                              direction="row"
                              spacing={1}
                              useFlexGap
                              sx={{ flexWrap: "wrap" }}
                            >
                              <TextField
                                label="L (mm)"
                                value={line.lengthMm}
                                disabled={!editable}
                                onChange={(e) =>
                                  setLines((rows) =>
                                    rows.map((r, i) =>
                                      i === idx ? { ...r, lengthMm: e.target.value } : r,
                                    ),
                                  )
                                }
                                size="small"
                                sx={{ flex: "1 1 72px", minWidth: 72 }}
                              />
                              <TextField
                                label="B (mm)"
                                value={line.breadthMm}
                                disabled={!editable}
                                onChange={(e) =>
                                  setLines((rows) =>
                                    rows.map((r, i) =>
                                      i === idx ? { ...r, breadthMm: e.target.value } : r,
                                    ),
                                  )
                                }
                                size="small"
                                sx={{ flex: "1 1 72px", minWidth: 72 }}
                              />
                              <TextField
                                label="H (mm)"
                                value={line.heightMm}
                                disabled={!editable}
                                onChange={(e) =>
                                  setLines((rows) =>
                                    rows.map((r, i) =>
                                      i === idx ? { ...r, heightMm: e.target.value } : r,
                                    ),
                                  )
                                }
                                size="small"
                                sx={{ flex: "1 1 72px", minWidth: 72 }}
                              />
                              <TextField
                                label="Nos"
                                value={line.countNos}
                                disabled={!editable}
                                onChange={(e) =>
                                  setLines((rows) =>
                                    rows.map((r, i) =>
                                      i === idx ? { ...r, countNos: e.target.value } : r,
                                    ),
                                  )
                                }
                                size="small"
                                sx={{ width: 72 }}
                              />
                              {editable && lines.length > 1 ? (
                                <Button
                                  variant="text"
                                  color="error"
                                  size="small"
                                  onClick={() =>
                                    setLines((rows) => rows.filter((_, i) => i !== idx))
                                  }
                                >
                                  Remove
                                </Button>
                              ) : null}
                            </Stack>
                          </Stack>
                        </Surface>
                      ))}
                    </Stack>
                    {editable ? (
                      <Button variant="outlined" onClick={() => setLines((r) => [...r, blankLine()])}>
                        Add line
                      </Button>
                    ) : null}
                  </Stack>
                ),
              },
              {
                id: "annotate",
                label: "Annotate",
                panel: (
                  <Stack spacing={2}>
                    <TextField
                      select
                      label="Drawing"
                      value={drawingId}
                      onChange={(e) => setDrawingId(e.target.value)}
                      fullWidth
                      disabled={!editable}
                    >
                      <MenuItem value="">Select drawing…</MenuItem>
                      {drawings.map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.ref} — {d.title}
                        </MenuItem>
                      ))}
                    </TextField>
                    {editable ? (
                      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                        {(["PEN", "HIGHLIGHT", "PIN", "CLOUD"] as const).map((t) => (
                          <Button
                            key={t}
                            size="small"
                            variant={tool === t ? "contained" : "outlined"}
                            onClick={() => {
                              setTool(t);
                              setDraftPoints([]);
                            }}
                          >
                            {t}
                          </Button>
                        ))}
                        <TextField
                          size="small"
                          label="Label"
                          value={annLabel}
                          onChange={(e) => setAnnLabel(e.target.value)}
                          sx={{ minWidth: 160 }}
                        />
                        {tool !== "PIN" ? (
                          <Button
                            size="small"
                            variant="contained"
                            disabled={draftPoints.length < 2}
                            onClick={() => void finishPathAnnotation()}
                          >
                            Finish mark
                          </Button>
                        ) : null}
                      </Stack>
                    ) : null}
                    <Typography variant="caption" color="text.secondary">
                      Click on the sheet to place pins or path points (normalized coordinates).
                      Annotations lock after submit.
                    </Typography>
                    <Box
                      sx={{
                        border: 1,
                        borderColor: "divider",
                        borderRadius: `${RADIUS}px`,
                        bgcolor: "background.default",
                        height: 280,
                        overflow: "hidden",
                      }}
                    >
                      <svg
                        width="100%"
                        height="100%"
                        viewBox="0 0 1000 1000"
                        onClick={onCanvasClick}
                        style={{ cursor: editable && drawingId ? "crosshair" : "default" }}
                      >
                        <rect x={0} y={0} width={1000} height={1000} fill="#F2F4F7" />
                        {localAnns.map((a, i) => {
                          if (a.tool === "PIN" && a.points[0]) {
                            return (
                              <g key={a.id ?? i}>
                                <circle
                                  cx={a.points[0].x}
                                  cy={a.points[0].y}
                                  r={14}
                                  fill="#FF4F18"
                                />
                                {a.label ? (
                                  <text
                                    x={a.points[0].x + 18}
                                    y={a.points[0].y + 4}
                                    fontSize={22}
                                    fill="#141517"
                                  >
                                    {a.label}
                                  </text>
                                ) : null}
                              </g>
                            );
                          }
                          if (a.points.length < 2) return null;
                          const d = a.points
                            .map((p, pi) => `${pi === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                            .join(" ");
                          return (
                            <path
                              key={a.id ?? i}
                              d={d}
                              fill={
                                a.tool === "CLOUD" || a.tool === "HIGHLIGHT"
                                  ? "rgba(255,79,24,0.15)"
                                  : "none"
                              }
                              stroke="#FF4F18"
                              strokeWidth={a.tool === "HIGHLIGHT" ? 28 : 4}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          );
                        })}
                        {draftPoints.length > 0 ? (
                          <polyline
                            points={draftPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                            fill="none"
                            stroke="#141517"
                            strokeWidth={3}
                            strokeDasharray="8 6"
                          />
                        ) : null}
                      </svg>
                    </Box>
                    {editable && localAnns.length > 0 ? (
                      <Stack spacing={0.5}>
                        {localAnns.map((a) => (
                          <Stack
                            key={a.id ?? a.label}
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: "center" }}
                          >
                            <Typography variant="caption" sx={{ flex: 1 }}>
                              {a.tool}
                              {a.label ? ` — ${a.label}` : ""}
                            </Typography>
                            {a.id && jmId ? (
                              <Button
                                size="small"
                                variant="text"
                                color="error"
                                onClick={() =>
                                  removeAnn.mutate(
                                    { id: a.id!, jointMeasurementId: jmId },
                                    {
                                      onSuccess: () =>
                                        setLocalAnns((prev) =>
                                          prev.filter((x) => x.id !== a.id),
                                        ),
                                    },
                                  )
                                }
                              >
                                Remove
                              </Button>
                            ) : null}
                          </Stack>
                        ))}
                      </Stack>
                    ) : null}
                  </Stack>
                ),
              },
            ]}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose}>
          Close
        </Button>
        {editable ? (
          <>
            <Button
              variant="outlined"
              disabled={pending || !subject.trim()}
              onClick={() =>
                void ensureSaved().then((id) => {
                  if (id) pushToast({ kind: "success", title: "Draft saved" });
                })
              }
            >
              Save draft
            </Button>
            <Button
              variant="contained"
              disabled={pending || !subject.trim()}
              onClick={() =>
                void ensureSaved().then((id) => {
                  if (id) submit.mutate({ id });
                })
              }
            >
              {submit.isPending ? "Submitting…" : "Submit for approval"}
            </Button>
          </>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
