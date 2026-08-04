import {
  Button,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  TextInput,
} from "@carbon/react";
import { Add } from "@carbon/icons-react";
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
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { ConfirmModal, DataGrid, DataState, StatusTag, type GridColDef } from "../../carbon/adapters/index.js";
import { trpc } from "../../lib/trpc.js";

type MemberKind = BbsElement;

const SUBTLE: React.CSSProperties = { margin: 0, color: "var(--cds-text-secondary)" };
const OVERLINE: React.CSSProperties = { ...SUBTLE, textTransform: "uppercase", letterSpacing: "0.02em" };
const ROW: React.CSSProperties = { display: "flex", gap: "0.5rem" };

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
            icon: <Add />,
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
        <Button kind="ghost" size="sm" onClick={() => removeItem.mutate({ id: p.row.id })}>
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

  const memberModal = (
    <Modal
      open={memberOpen}
      size="sm"
      modalHeading="Add member"
      primaryButtonText={addMember.isPending ? "Computing…" : "Compute & add"}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={addMember.isPending}
      onRequestClose={() => setMemberOpen(false)}
      onRequestSubmit={submitMember}
    >
      <Stack gap={5}>
        <Select
          id="bbs-elem"
          labelText="Element"
          value={memberKind}
          onChange={(e) => setMemberKind(e.target.value as MemberKind)}
        >
          {(Object.keys(BBS_ELEMENT_LABEL) as BbsElement[]).map((k) => (
            <SelectItem key={k} value={k} text={BBS_ELEMENT_LABEL[k]} />
          ))}
        </Select>

        {memberKind === "COLUMN" && (
          <>
            <TextInput id="c-mark" labelText="Mark" value={columnForm.mark} onChange={(e) => setColumnForm({ ...columnForm, mark: e.target.value })} />
            <div style={ROW}>
              <TextInput id="c-w" labelText="Width mm" value={columnForm.widthMm} onChange={(e) => setColumnForm({ ...columnForm, widthMm: e.target.value })} />
              <TextInput id="c-d" labelText="Depth mm" value={columnForm.depthMm} onChange={(e) => setColumnForm({ ...columnForm, depthMm: e.target.value })} />
              <TextInput id="c-h" labelText="Height mm" value={columnForm.heightMm} onChange={(e) => setColumnForm({ ...columnForm, heightMm: e.target.value })} />
            </div>
            <div style={ROW}>
              <TextInput id="c-cov" labelText="Cover mm" value={columnForm.coverMm} onChange={(e) => setColumnForm({ ...columnForm, coverMm: e.target.value })} />
              <Select id="c-tie" labelText="Tie Ø" value={columnForm.stirrupDiaMm} onChange={(e) => setColumnForm({ ...columnForm, stirrupDiaMm: e.target.value })}>
                {STANDARD_BAR_DIAMETERS_MM.map((d) => <SelectItem key={d} value={String(d)} text={String(d)} />)}
              </Select>
              <TextInput id="c-sp" labelText="Spacing mm" value={columnForm.spacingMm} onChange={(e) => setColumnForm({ ...columnForm, spacingMm: e.target.value })} />
            </div>
            <div style={ROW}>
              <Select id="c-hook" labelText="Hook" value={columnForm.hookAngle} onChange={(e) => setColumnForm({ ...columnForm, hookAngle: e.target.value })}>
                {[90, 135, 180].map((a) => <SelectItem key={a} value={String(a)} text={`${a}°`} />)}
              </Select>
              <Select id="c-tt" labelText="Tie type" value={columnForm.tieType} onChange={(e) => setColumnForm({ ...columnForm, tieType: e.target.value as typeof columnForm.tieType })}>
                {ColumnTieType.options.map((t) => <SelectItem key={t} value={t} text={t} />)}
              </Select>
            </div>
            <div style={ROW}>
              <Select id="c-md" labelText="Main Ø" value={columnForm.mainDiaMm} onChange={(e) => setColumnForm({ ...columnForm, mainDiaMm: e.target.value })}>
                {STANDARD_BAR_DIAMETERS_MM.map((d) => <SelectItem key={d} value={String(d)} text={String(d)} />)}
              </Select>
              <TextInput id="c-mn" labelText="Main nos" value={columnForm.mainCount} onChange={(e) => setColumnForm({ ...columnForm, mainCount: e.target.value })} />
            </div>
          </>
        )}

        {memberKind === "BEAM" && (
          <>
            <TextInput id="b-mark" labelText="Mark" value={beamForm.mark} onChange={(e) => setBeamForm({ ...beamForm, mark: e.target.value })} />
            <div style={ROW}>
              <TextInput id="b-span" labelText="Clear span mm" value={beamForm.clearSpanMm} onChange={(e) => setBeamForm({ ...beamForm, clearSpanMm: e.target.value })} />
              <TextInput id="b-b" labelText="b mm" value={beamForm.widthMm} onChange={(e) => setBeamForm({ ...beamForm, widthMm: e.target.value })} />
              <TextInput id="b-D" labelText="D mm" value={beamForm.depthMm} onChange={(e) => setBeamForm({ ...beamForm, depthMm: e.target.value })} />
            </div>
            <div style={ROW}>
              <Select id="b-conc" labelText="Concrete" value={beamForm.concreteGrade} onChange={(e) => setBeamForm({ ...beamForm, concreteGrade: e.target.value as typeof beamForm.concreteGrade })}>
                {ConcreteGrade.options.map((g) => <SelectItem key={g} value={g} text={g} />)}
              </Select>
              <Select id="b-steel" labelText="Steel" value={beamForm.steelGrade} onChange={(e) => setBeamForm({ ...beamForm, steelGrade: e.target.value as typeof beamForm.steelGrade })}>
                {SteelGrade.options.map((g) => <SelectItem key={g} value={g} text={g} />)}
              </Select>
              <Select id="b-top" labelText="Top bars" value={beamForm.topBarType} onChange={(e) => setBeamForm({ ...beamForm, topBarType: e.target.value as typeof beamForm.topBarType })}>
                {BeamTopBarType.options.map((t) => <SelectItem key={t} value={t} text={t} />)}
              </Select>
            </div>
            <div style={ROW}>
              <TextInput id="b-ss" labelText="Stirrup spacing support" value={beamForm.spacingSupportMm} onChange={(e) => setBeamForm({ ...beamForm, spacingSupportMm: e.target.value })} />
              <TextInput id="b-sm" labelText="Middle" value={beamForm.spacingMiddleMm} onChange={(e) => setBeamForm({ ...beamForm, spacingMiddleMm: e.target.value })} />
              <Select id="b-legs" labelText="Legs" value={beamForm.stirrupLegs} onChange={(e) => setBeamForm({ ...beamForm, stirrupLegs: e.target.value })}>
                <SelectItem value="2" text="2" />
                <SelectItem value="4" text="4" />
              </Select>
            </div>
            <div style={ROW}>
              <TextInput id="b-td" labelText="Top Ø / nos" value={beamForm.topDiaMm} onChange={(e) => setBeamForm({ ...beamForm, topDiaMm: e.target.value })} />
              <TextInput id="b-tn" labelText="Top nos" hideLabel value={beamForm.topCount} onChange={(e) => setBeamForm({ ...beamForm, topCount: e.target.value })} />
              <TextInput id="b-bd" labelText="Bot Ø / nos" value={beamForm.bottomDiaMm} onChange={(e) => setBeamForm({ ...beamForm, bottomDiaMm: e.target.value })} />
              <TextInput id="b-bn" labelText="Bot nos" hideLabel value={beamForm.bottomCount} onChange={(e) => setBeamForm({ ...beamForm, bottomCount: e.target.value })} />
            </div>
          </>
        )}

        {memberKind === "SLAB" && (
          <>
            <TextInput id="s-mark" labelText="Mark" value={slabForm.mark} onChange={(e) => setSlabForm({ ...slabForm, mark: e.target.value })} />
            <div style={ROW}>
              <TextInput id="s-x" labelText="Span X mm" value={slabForm.spanXMm} onChange={(e) => setSlabForm({ ...slabForm, spanXMm: e.target.value })} />
              <TextInput id="s-y" labelText="Span Y mm" value={slabForm.spanYMm} onChange={(e) => setSlabForm({ ...slabForm, spanYMm: e.target.value })} />
              <TextInput id="s-t" labelText="Thickness" value={slabForm.thicknessMm} onChange={(e) => setSlabForm({ ...slabForm, thicknessMm: e.target.value })} />
            </div>
            <div style={ROW}>
              <Select id="s-type" labelText="Type" value={slabForm.slabType} onChange={(e) => setSlabForm({ ...slabForm, slabType: e.target.value as typeof slabForm.slabType })}>
                {SlabType.options.map((t) => <SelectItem key={t} value={t} text={t} />)}
              </Select>
              <Select id="s-conc" labelText="Concrete" value={slabForm.concreteGrade} onChange={(e) => setSlabForm({ ...slabForm, concreteGrade: e.target.value as typeof slabForm.concreteGrade })}>
                {ConcreteGrade.options.map((g) => <SelectItem key={g} value={g} text={g} />)}
              </Select>
              <Select id="s-steel" labelText="Steel" value={slabForm.steelGrade} onChange={(e) => setSlabForm({ ...slabForm, steelGrade: e.target.value as typeof slabForm.steelGrade })}>
                {SteelGrade.options.map((g) => <SelectItem key={g} value={g} text={g} />)}
              </Select>
            </div>
            <div style={ROW}>
              <TextInput id="s-dx" labelText="ØX / c/c" value={slabForm.diaXMm} onChange={(e) => setSlabForm({ ...slabForm, diaXMm: e.target.value })} />
              <TextInput id="s-spx" labelText="c/c X" hideLabel value={slabForm.spacingXMm} onChange={(e) => setSlabForm({ ...slabForm, spacingXMm: e.target.value })} />
              <TextInput id="s-dy" labelText="ØY / c/c" value={slabForm.diaYMm} onChange={(e) => setSlabForm({ ...slabForm, diaYMm: e.target.value })} />
              <TextInput id="s-spy" labelText="c/c Y" hideLabel value={slabForm.spacingYMm} onChange={(e) => setSlabForm({ ...slabForm, spacingYMm: e.target.value })} />
            </div>
          </>
        )}

        {memberKind === "FOOTING" && (
          <>
            <TextInput id="f-mark" labelText="Mark" value={footingForm.mark} onChange={(e) => setFootingForm({ ...footingForm, mark: e.target.value })} />
            <div style={ROW}>
              <TextInput id="f-l" labelText="L mm" value={footingForm.lengthMm} onChange={(e) => setFootingForm({ ...footingForm, lengthMm: e.target.value })} />
              <TextInput id="f-b" labelText="B mm" value={footingForm.widthMm} onChange={(e) => setFootingForm({ ...footingForm, widthMm: e.target.value })} />
              <TextInput id="f-d" labelText="Depth" value={footingForm.depthMm} onChange={(e) => setFootingForm({ ...footingForm, depthMm: e.target.value })} />
            </div>
            <div style={ROW}>
              <TextInput id="f-cl" labelText="Col L" value={footingForm.columnLengthMm} onChange={(e) => setFootingForm({ ...footingForm, columnLengthMm: e.target.value })} />
              <TextInput id="f-cb" labelText="Col B" value={footingForm.columnWidthMm} onChange={(e) => setFootingForm({ ...footingForm, columnWidthMm: e.target.value })} />
              <TextInput id="f-cov" labelText="Cover" value={footingForm.coverMm} onChange={(e) => setFootingForm({ ...footingForm, coverMm: e.target.value })} />
            </div>
            <div style={ROW}>
              <TextInput id="f-dl" labelText="ØL / c/c" value={footingForm.diaLMm} onChange={(e) => setFootingForm({ ...footingForm, diaLMm: e.target.value })} />
              <TextInput id="f-spl" labelText="c/c L" hideLabel value={footingForm.spacingLMm} onChange={(e) => setFootingForm({ ...footingForm, spacingLMm: e.target.value })} />
              <TextInput id="f-db" labelText="ØB / c/c" value={footingForm.diaBMm} onChange={(e) => setFootingForm({ ...footingForm, diaBMm: e.target.value })} />
              <TextInput id="f-spb" labelText="c/c B" hideLabel value={footingForm.spacingBMm} onChange={(e) => setFootingForm({ ...footingForm, spacingBMm: e.target.value })} />
            </div>
          </>
        )}

        {addMember.error && <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={addMember.error.message} />}
      </Stack>
    </Modal>
  );

  const manualModal = (
    <Modal
      open={manualOpen}
      size="sm"
      modalHeading="Manual bar line"
      primaryButtonText="Add"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={!manual.barMark || !manual.cuttingLengthMm || addItem.isPending}
      onRequestClose={() => setManualOpen(false)}
      onRequestSubmit={() =>
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
      <Stack gap={5}>
        <TextInput id="m-mark" labelText="Bar mark" value={manual.barMark} onChange={(e) => setManual({ ...manual, barMark: e.target.value })} />
        <TextInput id="m-member" labelText="Member" value={manual.member} onChange={(e) => setManual({ ...manual, member: e.target.value })} />
        <div style={ROW}>
          <Select id="m-dia" labelText="Ø mm" value={manual.diaMm} onChange={(e) => setManual({ ...manual, diaMm: e.target.value })}>
            {STANDARD_BAR_DIAMETERS_MM.map((d) => <SelectItem key={d} value={String(d)} text={String(d)} />)}
          </Select>
          <TextInput id="m-nos" labelText="Members" value={manual.noOfMembers} onChange={(e) => setManual({ ...manual, noOfMembers: e.target.value })} />
          <TextInput id="m-bpm" labelText="Bars / member" value={manual.barsPerMember} onChange={(e) => setManual({ ...manual, barsPerMember: e.target.value })} />
        </div>
        <TextInput id="m-cut" labelText="Cutting length mm" value={manual.cuttingLengthMm} onChange={(e) => setManual({ ...manual, cuttingLengthMm: e.target.value })} />
        {addItem.error && <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={addItem.error.message} />}
      </Stack>
    </Modal>
  );

  if (openId && detail) {
    const s = detail.schedule;
    return (
      <>
        <CarbonScope>
          <Stack gap={4}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <Button size="sm" kind="ghost" onClick={() => setOpenId(null)}>
                ← All schedules
              </Button>
              <span className="cds--type-heading-compact-01">{s.ref} — {s.title}</span>
              <StatusTag
                value={s.status as BbsStatus}
                map={BBS_STATUS_TAG}
                label={BBS_STATUS_LABEL[s.status as BbsStatus] ?? s.status}
              />
              <div style={{ flex: 1 }} />
              {s.status === "DRAFT" && (
                <Button size="sm" kind="tertiary" onClick={() => setStatus.mutate({ id: s.id, status: "ISSUED" })}>
                  Mark issued
                </Button>
              )}
              <Button size="sm" kind="tertiary" onClick={() => setMemberOpen(true)}>
                Add member
              </Button>
              <Button size="sm" kind="tertiary" onClick={() => setManualOpen(true)}>
                Manual line
              </Button>
              <Button size="sm" kind="danger--ghost" onClick={() => setConfirmId(s.id)}>
                Delete
              </Button>
            </div>

            <p className="cds--type-body-01" style={SUBTLE}>
              Enter column / beam / slab / footing geometry to compute cutting lengths (IS 456).
              Weight uses d²/162 kg/m. Advisory Ast and anchorage checks appear below when relevant.
            </p>

            {(detail.members.length > 0 || detail.checks.length > 0) && (
              <Stack gap={3}>
                <p className="cds--type-label-01" style={OVERLINE}>Members</p>
                {detail.members.map((m) => (
                  <div
                    key={m.id}
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid var(--cds-border-subtle)", padding: "0.25rem 0" }}
                  >
                    <span className="cds--type-body-01" style={{ flex: 1 }}>
                      {BBS_ELEMENT_LABEL[m.element as BbsElement] ?? m.element} — {m.mark ?? "—"}
                    </span>
                    <Button size="sm" kind="ghost" onClick={() => removeMember.mutate({ id: m.id })}>
                      Remove
                    </Button>
                  </div>
                ))}
                {detail.checks.length > 0 && (
                  <>
                    <p className="cds--type-label-01" style={OVERLINE}>Checks</p>
                    {detail.checks.map((c, i) => (
                      <InlineNotification
                        key={`${c.mark}-${c.label}-${i}`}
                        kind={c.ok ? "success" : "warning"}
                        lowContrast
                        hideCloseButton
                        title={`${c.mark}: ${c.label}`}
                        subtitle={`${c.value} vs min ${c.limit} — ${c.message}`}
                      />
                    ))}
                  </>
                )}
              </Stack>
            )}

            <hr style={{ border: 0, borderTop: "1px solid var(--cds-border-subtle)", margin: 0 }} />

            <p className="cds--type-label-01" style={OVERLINE}>
              Schedule ({detail.items.length} lines · {detail.totalWeightKg.toFixed(2)} kg)
            </p>
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
              <div>
                <p className="cds--type-label-01" style={OVERLINE}>Steel summary by diameter</p>
                <Stack gap={2} style={{ marginTop: "0.25rem" }}>
                  {detail.summary.map((r) => (
                    <p key={r.diaMm} className="cds--type-body-01" style={{ margin: 0 }}>
                      Ø{r.diaMm} — {r.nos} nos · {r.totalLengthM.toFixed(2)} m · {r.weightKg.toFixed(2)} kg
                    </p>
                  ))}
                </Stack>
              </div>
            )}
          </Stack>
        </CarbonScope>

        <CarbonScope>
          {memberModal}
          {manualModal}
        </CarbonScope>

        <ConfirmModal
          open={!!confirmId}
          heading="Delete BBS?"
          body="Removes the schedule, members, and all bar lines."
          confirmText="Delete"
          danger
          pending={remove.isPending}
          onConfirm={() => confirmId && remove.mutate({ id: confirmId })}
          onClose={() => setConfirmId(null)}
        />
      </>
    );
  }

  return (
    <>
      <CarbonScope>
        <Stack gap={4}>
          <p className="cds--type-body-01" style={SUBTLE}>
            Project bar bending schedules — compute cutting lengths from member geometry, or enter
            lines manually. Consultancy quantities only (no site steel reconciliation).
          </p>
          <DataState
            loading={listQ.isLoading}
            isEmpty={rows.length === 0}
            columnCount={3}
            empty={{
              title: "No BBS yet",
              description: "Create a schedule, then add columns, beams, slabs, or footings.",
              action: (
                <Button size="sm" kind="tertiary" onClick={() => setCreateOpen(true)}>
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
              onRowClick={(p) => setOpenId(p.row.id as string)}
            />
          </DataState>
        </Stack>
      </CarbonScope>

      <CarbonScope>
        <Modal
          open={createOpen}
          size="sm"
          modalHeading="New BBS"
          primaryButtonText="Create"
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!title || create.isPending}
          onRequestClose={() => setCreateOpen(false)}
          onRequestSubmit={() => create.mutate({ projectId, title })}
        >
          <Stack gap={5}>
            <TextInput id="bbs-title" labelText="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ground floor RCC" />
            {create.error && <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={create.error.message} />}
          </Stack>
        </Modal>
      </CarbonScope>
    </>
  );
}
