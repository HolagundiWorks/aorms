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
  STEEL_RECON_STATUS_LABEL,
  STEEL_RECON_STATUS_TAG,
  STEEL_WASTAGE_SEVERITY_LABEL,
  STEEL_WASTAGE_SEVERITY_TAG,
  steelReconLineVariance,
  type SteelReconStatus,
} from "@esti/contracts";
import { pushToast, useScreenActions } from "@hcw/ui-kit";
import { useState } from "react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { DataGrid, DataState, StatusTag, type GridColDef } from "../../carbon/adapters/index.js";
import { trpc } from "../../lib/trpc.js";

const SUBTLE: React.CSSProperties = { margin: 0, color: "var(--cds-text-secondary)" };

/** Project › Steel — scheduled (BBS) vs issued vs consumed by diameter. */
export function ProjectSteelReconciliation({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const listQ = trpc.steelReconciliation.listByProject.useQuery({ projectId });
  const bbsQ = trpc.bbs.listByProject.useQuery({ projectId });
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [bbsId, setBbsId] = useState("");
  const [lineOpen, setLineOpen] = useState(false);
  const [line, setLine] = useState({
    diaMm: "12",
    scheduledKg: "0",
    issuedKg: "0",
    consumedKg: "0",
  });

  const detailQ = trpc.steelReconciliation.byId.useQuery(
    { id: openId! },
    { enabled: !!openId },
  );

  useScreenActions(
    createOpen || lineOpen || !!openId
      ? []
      : [
          {
            id: "new-steel-recon",
            zone: "center",
            tone: "primary",
            label: "New reconciliation",
            icon: <Add />,
            onClick: () => setCreateOpen(true),
          },
        ],
    [createOpen, lineOpen, openId],
  );

  const invalidate = () => {
    utils.steelReconciliation.listByProject.invalidate({ projectId });
    if (openId) utils.steelReconciliation.byId.invalidate({ id: openId });
  };

  const create = trpc.steelReconciliation.create.useMutation({
    meta: { errorTitle: "Couldn't create reconciliation" },
    onSuccess: (row) => {
      invalidate();
      setCreateOpen(false);
      setTitle("");
      setBbsId("");
      setOpenId(row.id);
      pushToast({ kind: "success", title: "Steel reconciliation created" });
    },
  });

  const seed = trpc.steelReconciliation.seedFromBbs.useMutation({
    meta: { errorTitle: "Couldn't seed from BBS" },
    onSuccess: () => {
      invalidate();
      pushToast({ kind: "success", title: "Seeded from BBS" });
    },
  });

  const addLine = trpc.steelReconciliation.addLine.useMutation({
    meta: { errorTitle: "Couldn't add line" },
    onSuccess: () => {
      invalidate();
      setLineOpen(false);
    },
  });

  const updateLine = trpc.steelReconciliation.updateLine.useMutation({
    meta: { errorTitle: "Couldn't update line" },
    onSuccess: invalidate,
  });

  const finalize = trpc.steelReconciliation.finalize.useMutation({
    meta: { errorTitle: "Couldn't finalize" },
    onSuccess: () => {
      invalidate();
      pushToast({ kind: "success", title: "Finalized" });
    },
  });

  const rows = listQ.data ?? [];
  const detail = detailQ.data;

  if (openId && detail) {
    const draft = detail.status === "DRAFT";
    const cols: GridColDef[] = [
      { field: "diaMm", headerName: "Ø mm", width: 80 },
      { field: "scheduledKg", headerName: "Scheduled", width: 110 },
      {
        field: "issuedKg",
        headerName: "Issued",
        width: 120,
        renderCell: (p) =>
          draft ? (
            <TextInput
              id={`issued-${p.row.id}`}
              labelText="Issued"
              hideLabel
              size="sm"
              type="number"
              defaultValue={p.row.issuedKg}
              onBlur={(e) =>
                updateLine.mutate({
                  id: p.row.id,
                  reconciliationId: detail.id,
                  issuedKg: Number(e.target.value) || 0,
                })
              }
            />
          ) : (
            p.row.issuedKg
          ),
      },
      {
        field: "consumedKg",
        headerName: "Consumed",
        width: 120,
        renderCell: (p) =>
          draft ? (
            <TextInput
              id={`consumed-${p.row.id}`}
              labelText="Consumed"
              hideLabel
              size="sm"
              type="number"
              defaultValue={p.row.consumedKg}
              onBlur={(e) =>
                updateLine.mutate({
                  id: p.row.id,
                  reconciliationId: detail.id,
                  consumedKg: Number(e.target.value) || 0,
                })
              }
            />
          ) : (
            p.row.consumedKg
          ),
      },
      {
        field: "wastage",
        headerName: "Wastage",
        flex: 1,
        minWidth: 160,
        renderCell: (p) => {
          const v = steelReconLineVariance(p.row);
          return (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>
                {v.wastageKg.toFixed(2)} kg ({v.wastagePct}%)
              </span>
              <StatusTag
                value={v.severity}
                map={STEEL_WASTAGE_SEVERITY_TAG}
                label={STEEL_WASTAGE_SEVERITY_LABEL[v.severity]}
              />
            </div>
          );
        },
      },
    ];

    return (
      <>
        <CarbonScope>
          <Stack gap={4}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <Button size="sm" kind="ghost" onClick={() => setOpenId(null)}>
                ← All
              </Button>
              <span className="cds--type-heading-compact-01">{detail.ref} — {detail.title}</span>
              <StatusTag
                value={detail.status as SteelReconStatus}
                map={STEEL_RECON_STATUS_TAG}
                label={STEEL_RECON_STATUS_LABEL[detail.status as SteelReconStatus]}
              />
              <span className="cds--type-body-01" style={SUBTLE}>
                Σ {detail.totals.scheduledKg} sched · {detail.totals.issuedKg} issued ·{" "}
                {detail.totals.consumedKg} consumed · {detail.totals.wastageKg} wastage kg
              </span>
            </div>

            {draft && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", flexWrap: "wrap" }}>
                <div style={{ minWidth: 220 }}>
                  <Select id="seed-bbs" size="sm" labelText="Seed from BBS" value={bbsId} onChange={(e) => setBbsId(e.target.value)}>
                    <SelectItem value="" text="Select…" />
                    {(bbsQ.data ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id} text={`${b.ref} — ${b.title}`} />
                    ))}
                  </Select>
                </div>
                <Button size="sm" kind="tertiary" disabled={!bbsId || seed.isPending} onClick={() => seed.mutate({ reconciliationId: detail.id, bbsId })}>
                  Seed
                </Button>
                <Button size="sm" kind="tertiary" onClick={() => setLineOpen(true)}>
                  Add diameter
                </Button>
                <Button size="sm" disabled={finalize.isPending || detail.lines.length === 0} onClick={() => finalize.mutate({ id: detail.id })}>
                  Finalize
                </Button>
              </div>
            )}
            {finalize.error && <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={finalize.error.message} />}

            <DataGrid
              rows={detail.lines}
              columns={cols}
              density="compact"
              autoHeight
              hideFooter
              disableRowSelectionOnClick
              getRowHeight={() => "auto"}
            />
          </Stack>
        </CarbonScope>

        <CarbonScope>
          <Modal
            open={lineOpen}
            size="xs"
            modalHeading="Add diameter line"
            primaryButtonText="Add"
            secondaryButtonText="Cancel"
            onRequestClose={() => setLineOpen(false)}
            onRequestSubmit={() =>
              addLine.mutate({
                reconciliationId: detail.id,
                diaMm: Number(line.diaMm),
                scheduledKg: Number(line.scheduledKg) || 0,
                issuedKg: Number(line.issuedKg) || 0,
                consumedKg: Number(line.consumedKg) || 0,
              })
            }
          >
            <Stack gap={5}>
              {(["diaMm", "scheduledKg", "issuedKg", "consumedKg"] as const).map((k) => (
                <TextInput
                  key={k}
                  id={`line-${k}`}
                  labelText={k}
                  value={line[k]}
                  onChange={(e) => setLine({ ...line, [k]: e.target.value })}
                />
              ))}
            </Stack>
          </Modal>
        </CarbonScope>
      </>
    );
  }

  return (
    <>
      <CarbonScope>
        <Stack gap={4}>
          <p className="cds--type-body-01" style={SUBTLE}>
            Compare BBS scheduled steel with issued and consumed quantities by diameter. Wastage =
            issued − consumed (warn &gt;3%, exceed &gt;5%).
          </p>
          <DataState
            loading={listQ.isLoading}
            isEmpty={rows.length === 0}
            columnCount={3}
            empty={{
              title: "No steel reconciliations",
              description: "Create one and seed diameters from a project BBS.",
              action: (
                <Button size="sm" kind="tertiary" onClick={() => setCreateOpen(true)}>
                  New reconciliation
                </Button>
              ),
            }}
          >
            <DataGrid
              rows={rows}
              columns={[
                { field: "ref", headerName: "Ref", width: 140 },
                { field: "title", headerName: "Title", flex: 1 },
                {
                  field: "status",
                  headerName: "Status",
                  width: 120,
                  renderCell: (p) => (
                    <StatusTag
                      value={p.row.status as SteelReconStatus}
                      map={STEEL_RECON_STATUS_TAG}
                      label={STEEL_RECON_STATUS_LABEL[p.row.status as SteelReconStatus]}
                    />
                  ),
                },
                {
                  field: "wastageKg",
                  headerName: "Wastage kg",
                  width: 120,
                  valueGetter: (_v, row) => Number(row.wastageKg).toFixed(2),
                },
              ]}
              density="compact"
              autoHeight
              hideFooter
              onRowClick={(p) => setOpenId(p.row.id as string)}
            />
          </DataState>
        </Stack>
      </CarbonScope>

      <CarbonScope>
        <Modal
          open={createOpen}
          size="sm"
          modalHeading="New steel reconciliation"
          primaryButtonText="Create"
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!title || create.isPending}
          onRequestClose={() => setCreateOpen(false)}
          onRequestSubmit={() =>
            create.mutate({
              projectId,
              title,
              bbsId: bbsId || undefined,
            })
          }
        >
          <Stack gap={5}>
            <TextInput id="sr-title" labelText="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Select id="sr-bbs" labelText="Seed from BBS (optional)" value={bbsId} onChange={(e) => setBbsId(e.target.value)}>
              <SelectItem value="" text="— none —" />
              {(bbsQ.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id} text={`${b.ref} — ${b.title}`} />
              ))}
            </Select>
            {create.error && <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={create.error.message} />}
          </Stack>
        </Modal>
      </CarbonScope>
    </>
  );
}
