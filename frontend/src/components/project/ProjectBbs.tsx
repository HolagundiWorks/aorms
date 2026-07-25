import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import {
  BBS_ELEMENT_LABEL,
  BBS_STATUS_LABEL,
  BBS_STATUS_TAG,
  BeamTopBarType,
  ColumnTieType,
  ConcreteGrade,
  SlabType,
  STANDARD_BAR_DIAMETERS_MM,
  SteelGrade,
  type BbsElement,
  type BbsStatus,
} from "@esti/contracts";
import { pushToast, useScreenActions } from "@hcw/ui-kit";
import { useState } from "react";
import { ConfirmModal } from "../ConfirmModal.js";
import { DataState } from "../DataState.js";
import { StatusTag } from "../StatusTag.js";
import { trpc } from "../../lib/trpc.js";

type MemberKind = BbsElement;

const emptyColumn = () => ({
  mark: "",
  widthMm: "300",
  depthMm: "450",
  heightMm: "3000",
  coverMm: "40",
  stirrupDiaMm: "8",
  spacingMm: "150",
  hookAngle: "135",
  tieType: "Closed" as const,
  mainDiaMm: "16",
  mainCount: "6",
});

const emptyBeam = () => ({
  mark: "",
  clearSpanMm: "5000",
  widthMm: "230",
  depthMm: "450",
  coverMm: "25",
  concreteGrade: "M25" as const,
  steelGrade: "Fe500" as const,
  stirrupDiaMm: "8",
  spacingSupportMm: "100",
  spacingMiddleMm: "200",
  stirrupLegs: "2",
  hookAngle: "135",
  topBarType: "Full Span" as const,
  topDiaMm: "12",
  topCount: "2",
  bottomDiaMm: "16",
  bottomCount: "3",
});

const emptySlab = () => ({
  mark: "",
  spanXMm: "3000",
  spanYMm: "4000",
  thicknessMm: "150",
  coverMm: "20",
  concreteGrade: "M20" as const,
  steelGrade: "Fe415" as const,
  slabType: "One-Way" as const,
  diaXMm: "10",
  spacingXMm: "150",
  diaYMm: "8",
  spacingYMm: "200",
});

const emptyFooting = () => ({
  mark: "",
  lengthMm: "2000",
  widthMm: "2000",
  columnLengthMm: "300",
  columnWidthMm: "300",
  depthMm: "500",
  coverMm: "50",
  concreteGrade: "M20" as const,
  steelGrade: "Fe415" as const,
  diaLMm: "12",
  spacingLMm: "150",
  diaBMm: "12",
  spacingBMm: "150",
});

/**
 * Project › BBS — schedules with geometry-driven cutting lengths (column / beam /
 * slab / footing) plus manual lines and a diameter steel summary.
 */
export function ProjectBbs({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.bbs.listByProject.useQuery({ projectId });
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberKind, setMemberKind] = useState<MemberKind>("COLUMN");
  const [columnForm, setColumnForm] = useState(emptyColumn);
  const [beamForm, setBeamForm] = useState(emptyBeam);
  const [slabForm, setSlabForm] = useState(emptySlab);
  const [footingForm, setFootingForm] = useState(emptyFooting);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({
    barMark: "",
    member: "",
    diaMm: "12",
    noOfMembers: "1",
    barsPerMember: "1",
    cuttingLengthMm: "",
  });
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const detailQ = trpc.bbs.byId.useQuery({ id: openId! }, { enabled: !!openId });

  useScreenActions(
    createOpen || memberOpen || manualOpen || !!openId
      ? []
      : [
          {
            id: "new-bbs",
            zone: "center",
            tone: "primary",
            label: "New BBS",
            icon: <AddIcon />,
            onClick: () => setCreateOpen(true),
          },
        ],
    [createOpen, memberOpen, manualOpen, openId],
  );

  const invalidate = () => {
    utils.bbs.listByProject.invalidate({ projectId });
    if (openId) utils.bbs.byId.invalidate({ id: openId });
  };

  const create = trpc.bbs.create.useMutation({
    meta: { errorTitle: "Couldn't create the BBS" },
    onSuccess: (row) => {
      invalidate();
      setCreateOpen(false);
      setTitle("");
      setOpenId(row.id);
      pushToast({ kind: "success", title: "BBS created" });
    },
  });

  const remove = trpc.bbs.remove.useMutation({
    meta: { errorTitle: "Couldn't delete the BBS" },
    onSuccess: () => {
      invalidate();
      setOpenId(null);
      setConfirmId(null);
    },
  });

  const addMember = trpc.bbs.addMember.useMutation({
    meta: { errorTitle: "Couldn't add member" },
    onSuccess: (r) => {
      invalidate();
      setMemberOpen(false);
      pushToast({
        kind: "success",
        title: `Added ${r.barCount} bar line(s)`,
      });
    },
  });

  const removeMember = trpc.bbs.removeMember.useMutation({
    meta: { errorTitle: "Couldn't remove member" },
    onSuccess: invalidate,
  });

  const addItem = trpc.bbs.addItem.useMutation({
    meta: { errorTitle: "Couldn't add bar line" },
    onSuccess: () => {
      invalidate();
      setManualOpen(false);
      setManual({
        barMark: "",
        member: "",
        diaMm: "12",
        noOfMembers: "1",
        barsPerMember: "1",
        cuttingLengthMm: "",
      });
    },
  });

  const removeItem = trpc.bbs.removeItem.useMutation({
    meta: { errorTitle: "Couldn't remove bar line" },
    onSuccess: invalidate,
  });

  const setStatus = trpc.bbs.update.useMutation({
    meta: { errorTitle: "Couldn't update status" },
    onSuccess: invalidate,
  });

  const rows = listQ.data ?? [];
  const detail = detailQ.data;

  const scheduleCols: GridColDef[] = [
    { field: "ref", headerName: "Ref", width: 140 },
    { field: "title", headerName: "Title", flex: 1.4, minWidth: 160 },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (p) => (
        <StatusTag
          value={p.row.status as BbsStatus}
          map={BBS_STATUS_TAG}
          label={BBS_STATUS_LABEL[p.row.status as BbsStatus] ?? p.row.status}
        />
      ),
    },
  ];

  const itemCols: GridColDef[] = [
    { field: "barMark", headerName: "Mark", width: 110 },
    { field: "member", headerName: "Member", width: 100 },
    { field: "element", headerName: "Element", width: 100 },
    { field: "role", headerName: "Role", width: 100 },
    { field: "diaMm", headerName: "Ø mm", width: 70 },
    { field: "noOfMembers", headerName: "Members", width: 90 },
    { field: "barsPerMember", headerName: "Bars", width: 70 },
    {
      field: "cuttingLengthMm",
      headerName: "Cut (mm)",
      width: 100,
      valueGetter: (_v, row) => Math.round(row.cuttingLengthMm),
    },
    {
      field: "weightKg",
      headerName: "Wt (kg)",
      width: 90,
      valueGetter: (_v, row) => Number(row.weightKg).toFixed(2),
    },
    {
      field: "actions",
      headerName: "",
      width: 90,
      sortable: false,
      renderCell: (p) => (
        <Button size="small" color="inherit" onClick={() => removeItem.mutate({ id: p.row.id })}>
          Remove
        </Button>
      ),
    },
  ];

  const submitMember = () => {
    if (!openId) return;
    if (memberKind === "COLUMN") {
      addMember.mutate({
        bbsId: openId,
        element: "COLUMN",
        input: {
          mark: columnForm.mark || undefined,
          widthMm: Number(columnForm.widthMm),
          depthMm: Number(columnForm.depthMm),
          heightMm: Number(columnForm.heightMm),
          coverMm: Number(columnForm.coverMm),
          stirrupDiaMm: Number(columnForm.stirrupDiaMm),
          spacingMm: Number(columnForm.spacingMm),
          hookAngle: Number(columnForm.hookAngle) as 90 | 135 | 180,
          tieType: columnForm.tieType,
          mainBars: [
            {
              diaMm: Number(columnForm.mainDiaMm),
              count: Number(columnForm.mainCount) || 0,
            },
          ],
        },
      });
      return;
    }
    if (memberKind === "BEAM") {
      addMember.mutate({
        bbsId: openId,
        element: "BEAM",
        input: {
          mark: beamForm.mark || undefined,
          clearSpanMm: Number(beamForm.clearSpanMm),
          widthMm: Number(beamForm.widthMm),
          depthMm: Number(beamForm.depthMm),
          coverMm: Number(beamForm.coverMm),
          concreteGrade: beamForm.concreteGrade,
          steelGrade: beamForm.steelGrade,
          stirrupDiaMm: Number(beamForm.stirrupDiaMm),
          spacingSupportMm: Number(beamForm.spacingSupportMm),
          spacingMiddleMm: Number(beamForm.spacingMiddleMm),
          stirrupLegs: Number(beamForm.stirrupLegs) as 2 | 4,
          hookAngle: Number(beamForm.hookAngle) as 90 | 135 | 180,
          topBarType: beamForm.topBarType,
          topBars: [
            { diaMm: Number(beamForm.topDiaMm), count: Number(beamForm.topCount) || 0 },
          ],
          bottomBars: [
            {
              diaMm: Number(beamForm.bottomDiaMm),
              count: Number(beamForm.bottomCount) || 0,
            },
          ],
        },
      });
      return;
    }
    if (memberKind === "SLAB") {
      addMember.mutate({
        bbsId: openId,
        element: "SLAB",
        input: {
          mark: slabForm.mark || undefined,
          spanXMm: Number(slabForm.spanXMm),
          spanYMm: Number(slabForm.spanYMm),
          thicknessMm: Number(slabForm.thicknessMm),
          coverMm: Number(slabForm.coverMm),
          concreteGrade: slabForm.concreteGrade,
          steelGrade: slabForm.steelGrade,
          slabType: slabForm.slabType,
          diaXMm: Number(slabForm.diaXMm),
          spacingXMm: Number(slabForm.spacingXMm),
          diaYMm: Number(slabForm.diaYMm),
          spacingYMm: Number(slabForm.spacingYMm),
        },
      });
      return;
    }
    addMember.mutate({
      bbsId: openId,
      element: "FOOTING",
      input: {
        mark: footingForm.mark || undefined,
        lengthMm: Number(footingForm.lengthMm),
        widthMm: Number(footingForm.widthMm),
        columnLengthMm: Number(footingForm.columnLengthMm),
        columnWidthMm: Number(footingForm.columnWidthMm),
        depthMm: Number(footingForm.depthMm),
        coverMm: Number(footingForm.coverMm),
        concreteGrade: footingForm.concreteGrade,
        steelGrade: footingForm.steelGrade,
        diaLMm: Number(footingForm.diaLMm),
        spacingLMm: Number(footingForm.spacingLMm),
        diaBMm: Number(footingForm.diaBMm),
        spacingBMm: Number(footingForm.spacingBMm),
      },
    });
  };

  if (openId && detail) {
    const s = detail.schedule;
    return (
      <>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Button size="small" variant="text" onClick={() => setOpenId(null)}>
              ← All schedules
            </Button>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {s.ref} — {s.title}
            </Typography>
            <StatusTag
              value={s.status as BbsStatus}
              map={BBS_STATUS_TAG}
              label={BBS_STATUS_LABEL[s.status as BbsStatus] ?? s.status}
            />
            <Box sx={{ flex: 1 }} />
            {s.status === "DRAFT" && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => setStatus.mutate({ id: s.id, status: "ISSUED" })}
              >
                Mark issued
              </Button>
            )}
            <Button size="small" variant="outlined" onClick={() => setMemberOpen(true)}>
              Add member
            </Button>
            <Button size="small" variant="outlined" onClick={() => setManualOpen(true)}>
              Manual line
            </Button>
            <Button size="small" color="error" onClick={() => setConfirmId(s.id)}>
              Delete
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Enter column / beam / slab / footing geometry to compute cutting lengths (IS 456).
            Weight uses d²/162 kg/m. Advisory Ast and anchorage checks appear below when relevant.
          </Typography>

          {(detail.members.length > 0 || detail.checks.length > 0) && (
            <Stack spacing={1}>
              <Typography variant="overline" color="text.secondary">
                Members
              </Typography>
              {detail.members.map((m) => (
                <Stack
                  key={m.id}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", borderBottom: 1, borderColor: "divider", py: 0.5 }}
                >
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {BBS_ELEMENT_LABEL[m.element as BbsElement] ?? m.element} — {m.mark ?? "—"}
                  </Typography>
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => removeMember.mutate({ id: m.id })}
                  >
                    Remove
                  </Button>
                </Stack>
              ))}
              {detail.checks.length > 0 && (
                <>
                  <Typography variant="overline" color="text.secondary">
                    Checks
                  </Typography>
                  {detail.checks.map((c, i) => (
                    <Alert key={`${c.mark}-${c.label}-${i}`} severity={c.ok ? "success" : "warning"}>
                      {c.mark}: {c.label} — {c.value} vs min {c.limit} — {c.message}
                    </Alert>
                  ))}
                </>
              )}
            </Stack>
          )}

          <Divider />

          <Typography variant="overline" color="text.secondary">
            Schedule ({detail.items.length} lines · {detail.totalWeightKg.toFixed(2)} kg)
          </Typography>
          <DataState
            loading={detailQ.isLoading}
            isEmpty={detail.items.length === 0}
            columnCount={8}
            empty={{
              title: "No bars yet",
              description: "Add a structural member or a manual line.",
            }}
          >
            <DataGrid
              rows={detail.items}
              columns={itemCols}
              density="compact"
              autoHeight
              hideFooter
              disableRowSelectionOnClick
            />
          </DataState>

          {detail.summary.length > 0 && (
            <Box>
              <Typography variant="overline" color="text.secondary">
                Steel summary by diameter
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {detail.summary.map((r) => (
                  <Typography key={r.diaMm} variant="body2">
                    Ø{r.diaMm} — {r.nos} nos · {r.totalLengthM.toFixed(2)} m · {r.weightKg.toFixed(2)}{" "}
                    kg
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>

        <Dialog open={memberOpen} onClose={() => setMemberOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Add member</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                select
                label="Element"
                value={memberKind}
                onChange={(e) => setMemberKind(e.target.value as MemberKind)}
              >
                {(Object.keys(BBS_ELEMENT_LABEL) as BbsElement[]).map((k) => (
                  <MenuItem key={k} value={k}>
                    {BBS_ELEMENT_LABEL[k]}
                  </MenuItem>
                ))}
              </TextField>

              {memberKind === "COLUMN" && (
                <>
                  <TextField
                    label="Mark"
                    value={columnForm.mark}
                    onChange={(e) => setColumnForm({ ...columnForm, mark: e.target.value })}
                  />
                  <Stack direction="row" spacing={1}>
                    <TextField
                      label="Width mm"
                      value={columnForm.widthMm}
                      onChange={(e) => setColumnForm({ ...columnForm, widthMm: e.target.value })}
                    />
                    <TextField
                      label="Depth mm"
                      value={columnForm.depthMm}
                      onChange={(e) => setColumnForm({ ...columnForm, depthMm: e.target.value })}
                    />
                    <TextField
                      label="Height mm"
                      value={columnForm.heightMm}
                      onChange={(e) => setColumnForm({ ...columnForm, heightMm: e.target.value })}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      label="Cover mm"
                      value={columnForm.coverMm}
                      onChange={(e) => setColumnForm({ ...columnForm, coverMm: e.target.value })}
                    />
                    <TextField
                      select
                      label="Tie Ø"
                      value={columnForm.stirrupDiaMm}
                      onChange={(e) =>
                        setColumnForm({ ...columnForm, stirrupDiaMm: e.target.value })
                      }
                      sx={{ minWidth: 100 }}
                    >
                      {STANDARD_BAR_DIAMETERS_MM.map((d) => (
                        <MenuItem key={d} value={String(d)}>
                          {d}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Spacing mm"
                      value={columnForm.spacingMm}
                      onChange={(e) => setColumnForm({ ...columnForm, spacingMm: e.target.value })}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      select
                      label="Hook"
                      value={columnForm.hookAngle}
                      onChange={(e) => setColumnForm({ ...columnForm, hookAngle: e.target.value })}
                    >
                      {[90, 135, 180].map((a) => (
                        <MenuItem key={a} value={String(a)}>
                          {a}°
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label="Tie type"
                      value={columnForm.tieType}
                      onChange={(e) =>
                        setColumnForm({
                          ...columnForm,
                          tieType: e.target.value as typeof columnForm.tieType,
                        })
                      }
                      sx={{ flex: 1 }}
                    >
                      {ColumnTieType.options.map((t) => (
                        <MenuItem key={t} value={t}>
                          {t}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      select
                      label="Main Ø"
                      value={columnForm.mainDiaMm}
                      onChange={(e) => setColumnForm({ ...columnForm, mainDiaMm: e.target.value })}
                    >
                      {STANDARD_BAR_DIAMETERS_MM.map((d) => (
                        <MenuItem key={d} value={String(d)}>
                          {d}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Main nos"
                      value={columnForm.mainCount}
                      onChange={(e) => setColumnForm({ ...columnForm, mainCount: e.target.value })}
                    />
                  </Stack>
                </>
              )}

              {memberKind === "BEAM" && (
                <>
                  <TextField
                    label="Mark"
                    value={beamForm.mark}
                    onChange={(e) => setBeamForm({ ...beamForm, mark: e.target.value })}
                  />
                  <Stack direction="row" spacing={1}>
                    <TextField
                      label="Clear span mm"
                      value={beamForm.clearSpanMm}
                      onChange={(e) => setBeamForm({ ...beamForm, clearSpanMm: e.target.value })}
                    />
                    <TextField
                      label="b mm"
                      value={beamForm.widthMm}
                      onChange={(e) => setBeamForm({ ...beamForm, widthMm: e.target.value })}
                    />
                    <TextField
                      label="D mm"
                      value={beamForm.depthMm}
                      onChange={(e) => setBeamForm({ ...beamForm, depthMm: e.target.value })}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      select
                      label="Concrete"
                      value={beamForm.concreteGrade}
                      onChange={(e) =>
                        setBeamForm({
                          ...beamForm,
                          concreteGrade: e.target.value as typeof beamForm.concreteGrade,
                        })
                      }
                    >
                      {ConcreteGrade.options.map((g) => (
                        <MenuItem key={g} value={g}>
                          {g}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label="Steel"
                      value={beamForm.steelGrade}
                      onChange={(e) =>
                        setBeamForm({
                          ...beamForm,
                          steelGrade: e.target.value as typeof beamForm.steelGrade,
                        })
                      }
                    >
                      {SteelGrade.options.map((g) => (
                        <MenuItem key={g} value={g}>
                          {g}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label="Top bars"
                      value={beamForm.topBarType}
                      onChange={(e) =>
                        setBeamForm({
                          ...beamForm,
                          topBarType: e.target.value as typeof beamForm.topBarType,
                        })
                      }
                    >
                      {BeamTopBarType.options.map((t) => (
                        <MenuItem key={t} value={t}>
                          {t}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      label="Stirrup spacing support"
                      value={beamForm.spacingSupportMm}
                      onChange={(e) =>
                        setBeamForm({ ...beamForm, spacingSupportMm: e.target.value })
                      }
                    />
                    <TextField
                      label="Middle"
                      value={beamForm.spacingMiddleMm}
                      onChange={(e) =>
                        setBeamForm({ ...beamForm, spacingMiddleMm: e.target.value })
                      }
                    />
                    <TextField
                      select
                      label="Legs"
                      value={beamForm.stirrupLegs}
                      onChange={(e) => setBeamForm({ ...beamForm, stirrupLegs: e.target.value })}
                    >
                      <MenuItem value="2">2</MenuItem>
                      <MenuItem value="4">4</MenuItem>
                    </TextField>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      label="Top Ø / nos"
                      value={beamForm.topDiaMm}
                      onChange={(e) => setBeamForm({ ...beamForm, topDiaMm: e.target.value })}
                    />
                    <TextField
                      value={beamForm.topCount}
                      onChange={(e) => setBeamForm({ ...beamForm, topCount: e.target.value })}
                    />
                    <TextField
                      label="Bot Ø / nos"
                      value={beamForm.bottomDiaMm}
                      onChange={(e) => setBeamForm({ ...beamForm, bottomDiaMm: e.target.value })}
                    />
                    <TextField
                      value={beamForm.bottomCount}
                      onChange={(e) => setBeamForm({ ...beamForm, bottomCount: e.target.value })}
                    />
                  </Stack>
                </>
              )}

              {memberKind === "SLAB" && (
                <>
                  <TextField
                    label="Mark"
                    value={slabForm.mark}
                    onChange={(e) => setSlabForm({ ...slabForm, mark: e.target.value })}
                  />
                  <Stack direction="row" spacing={1}>
                    <TextField
                      label="Span X mm"
                      value={slabForm.spanXMm}
                      onChange={(e) => setSlabForm({ ...slabForm, spanXMm: e.target.value })}
                    />
                    <TextField
                      label="Span Y mm"
                      value={slabForm.spanYMm}
                      onChange={(e) => setSlabForm({ ...slabForm, spanYMm: e.target.value })}
                    />
                    <TextField
                      label="Thickness"
                      value={slabForm.thicknessMm}
                      onChange={(e) => setSlabForm({ ...slabForm, thicknessMm: e.target.value })}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      select
                      label="Type"
                      value={slabForm.slabType}
                      onChange={(e) =>
                        setSlabForm({
                          ...slabForm,
                          slabType: e.target.value as typeof slabForm.slabType,
                        })
                      }
                    >
                      {SlabType.options.map((t) => (
                        <MenuItem key={t} value={t}>
                          {t}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label="Concrete"
                      value={slabForm.concreteGrade}
                      onChange={(e) =>
                        setSlabForm({
                          ...slabForm,
                          concreteGrade: e.target.value as typeof slabForm.concreteGrade,
                        })
                      }
                    >
                      {ConcreteGrade.options.map((g) => (
                        <MenuItem key={g} value={g}>
                          {g}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label="Steel"
                      value={slabForm.steelGrade}
                      onChange={(e) =>
                        setSlabForm({
                          ...slabForm,
                          steelGrade: e.target.value as typeof slabForm.steelGrade,
                        })
                      }
                    >
                      {SteelGrade.options.map((g) => (
                        <MenuItem key={g} value={g}>
                          {g}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      label="ØX / c/c"
                      value={slabForm.diaXMm}
                      onChange={(e) => setSlabForm({ ...slabForm, diaXMm: e.target.value })}
                    />
                    <TextField
                      value={slabForm.spacingXMm}
                      onChange={(e) => setSlabForm({ ...slabForm, spacingXMm: e.target.value })}
                    />
                    <TextField
                      label="ØY / c/c"
                      value={slabForm.diaYMm}
                      onChange={(e) => setSlabForm({ ...slabForm, diaYMm: e.target.value })}
                    />
                    <TextField
                      value={slabForm.spacingYMm}
                      onChange={(e) => setSlabForm({ ...slabForm, spacingYMm: e.target.value })}
                    />
                  </Stack>
                </>
              )}

              {memberKind === "FOOTING" && (
                <>
                  <TextField
                    label="Mark"
                    value={footingForm.mark}
                    onChange={(e) => setFootingForm({ ...footingForm, mark: e.target.value })}
                  />
                  <Stack direction="row" spacing={1}>
                    <TextField
                      label="L mm"
                      value={footingForm.lengthMm}
                      onChange={(e) =>
                        setFootingForm({ ...footingForm, lengthMm: e.target.value })
                      }
                    />
                    <TextField
                      label="B mm"
                      value={footingForm.widthMm}
                      onChange={(e) => setFootingForm({ ...footingForm, widthMm: e.target.value })}
                    />
                    <TextField
                      label="Depth"
                      value={footingForm.depthMm}
                      onChange={(e) => setFootingForm({ ...footingForm, depthMm: e.target.value })}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      label="Col L"
                      value={footingForm.columnLengthMm}
                      onChange={(e) =>
                        setFootingForm({ ...footingForm, columnLengthMm: e.target.value })
                      }
                    />
                    <TextField
                      label="Col B"
                      value={footingForm.columnWidthMm}
                      onChange={(e) =>
                        setFootingForm({ ...footingForm, columnWidthMm: e.target.value })
                      }
                    />
                    <TextField
                      label="Cover"
                      value={footingForm.coverMm}
                      onChange={(e) => setFootingForm({ ...footingForm, coverMm: e.target.value })}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      label="ØL / c/c"
                      value={footingForm.diaLMm}
                      onChange={(e) => setFootingForm({ ...footingForm, diaLMm: e.target.value })}
                    />
                    <TextField
                      value={footingForm.spacingLMm}
                      onChange={(e) =>
                        setFootingForm({ ...footingForm, spacingLMm: e.target.value })
                      }
                    />
                    <TextField
                      label="ØB / c/c"
                      value={footingForm.diaBMm}
                      onChange={(e) => setFootingForm({ ...footingForm, diaBMm: e.target.value })}
                    />
                    <TextField
                      value={footingForm.spacingBMm}
                      onChange={(e) =>
                        setFootingForm({ ...footingForm, spacingBMm: e.target.value })
                      }
                    />
                  </Stack>
                </>
              )}

              {addMember.error && <Alert severity="error">{addMember.error.message}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant="text" onClick={() => setMemberOpen(false)}>
              Cancel
            </Button>
            <Button variant="contained" disabled={addMember.isPending} onClick={submitMember}>
              {addMember.isPending ? "Computing…" : "Compute & add"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={manualOpen} onClose={() => setManualOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Manual bar line</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Bar mark"
                value={manual.barMark}
                onChange={(e) => setManual({ ...manual, barMark: e.target.value })}
              />
              <TextField
                label="Member"
                value={manual.member}
                onChange={(e) => setManual({ ...manual, member: e.target.value })}
              />
              <Stack direction="row" spacing={1}>
                <TextField
                  select
                  label="Ø mm"
                  value={manual.diaMm}
                  onChange={(e) => setManual({ ...manual, diaMm: e.target.value })}
                  sx={{ minWidth: 100 }}
                >
                  {STANDARD_BAR_DIAMETERS_MM.map((d) => (
                    <MenuItem key={d} value={String(d)}>
                      {d}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Members"
                  value={manual.noOfMembers}
                  onChange={(e) => setManual({ ...manual, noOfMembers: e.target.value })}
                />
                <TextField
                  label="Bars / member"
                  value={manual.barsPerMember}
                  onChange={(e) => setManual({ ...manual, barsPerMember: e.target.value })}
                />
              </Stack>
              <TextField
                label="Cutting length mm"
                value={manual.cuttingLengthMm}
                onChange={(e) => setManual({ ...manual, cuttingLengthMm: e.target.value })}
              />
              {addItem.error && <Alert severity="error">{addItem.error.message}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant="text" onClick={() => setManualOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={!manual.barMark || !manual.cuttingLengthMm || addItem.isPending}
              onClick={() =>
                openId &&
                addItem.mutate({
                  bbsId: openId,
                  barMark: manual.barMark,
                  member: manual.member || undefined,
                  diaMm: Number(manual.diaMm),
                  noOfMembers: Number(manual.noOfMembers) || 1,
                  barsPerMember: Number(manual.barsPerMember) || 1,
                  cuttingLengthMm: Number(manual.cuttingLengthMm),
                })
              }
            >
              Add
            </Button>
          </DialogActions>
        </Dialog>

        <ConfirmModal
          open={!!confirmId}
          heading="Delete BBS?"
          body="Removes the schedule, members, and all bar lines."
          confirmText="Delete"
          pending={remove.isPending}
          onConfirm={() => confirmId && remove.mutate({ id: confirmId })}
          onClose={() => setConfirmId(null)}
        />
      </>
    );
  }

  return (
    <>
      <Stack spacing={1.5}>
        <Typography variant="body2" color="text.secondary">
          Project bar bending schedules — compute cutting lengths from member geometry, or enter
          lines manually. Consultancy quantities only (no site steel reconciliation).
        </Typography>
        <DataState
          loading={listQ.isLoading}
          isEmpty={rows.length === 0}
          columnCount={3}
          empty={{
            title: "No BBS yet",
            description: "Create a schedule, then add columns, beams, slabs, or footings.",
            action: (
              <Button size="small" variant="outlined" onClick={() => setCreateOpen(true)}>
                New BBS
              </Button>
            ),
          }}
        >
          <DataGrid
            rows={rows}
            columns={scheduleCols}
            density="compact"
            autoHeight
            hideFooter
            disableRowSelectionOnClick
            onRowClick={(p) => setOpenId(p.row.id)}
            sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
          />
        </DataState>
      </Stack>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New BBS</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ground floor RCC"
            />
            {create.error && <Alert severity="error">{create.error.message}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!title || create.isPending}
            onClick={() => create.mutate({ projectId, title })}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
