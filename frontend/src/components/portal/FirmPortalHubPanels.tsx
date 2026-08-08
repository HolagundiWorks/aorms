import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import type { ReactNode } from "react";
import { DataState } from "../DataState.js";
import { StatusDot } from "../StatusTag.js";
import { formatINR } from "@esti/contracts";

type PhaseRow = { code: string; label: string; billingPct: number; status: string };
type ProgressRow = {
  id: string;
  periodStart: string;
  periodEnd: string;
  physicalProgressPct: number | null;
  openSnagCount: number | null;
  status: string;
};
type DrawingRow = { id: string; ref: string; title: string; status: string };
type TransmittalRow = {
  id: string;
  ref: string;
  purpose: string | null;
  channel: string | null;
  dateIssued: string | null;
};
type InvoiceRow = {
  ref: string;
  documentKind: string | null;
  status: string;
  grandTotalPaise: number | null;
  dateInvoice: string | null;
};
type ApprovalRow = {
  id: string;
  title: string;
  entityType: string;
  status: string;
  sentDate: string | null;
};
type RaBillRow = {
  id: string;
  ref: string;
  billNo: string | number | null;
  status: string;
  grossPaise: number | null;
  periodEnd: string | null;
  certifiedAt: string | Date | null;
};
type ProjectSummary = {
  ref: string;
  title: string;
  status: string;
  projectType: string;
  jurisdiction: string;
};

function PanelShell({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h5" component="h2">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {hint}
        </Typography>
      </Stack>
      {children}
    </Stack>
  );
}

/** Project tab — summary + stages from portal projectDetail. */
export function FirmPortalProjectPanel({
  loading,
  project,
  phases,
  pickProjectHint,
}: {
  loading: boolean;
  project: ProjectSummary | null;
  phases: PhaseRow[];
  pickProjectHint?: string;
}) {
  if (!project && !loading) {
    return (
      <PanelShell title="Project" hint={pickProjectHint ?? "Open a project from Updates to see summary and stages."}>
        <Typography variant="body2" color="text.secondary">
          No project selected.
        </Typography>
      </PanelShell>
    );
  }
  return (
    <PanelShell title="Project" hint="Published project summary and stage status.">
      <DataState loading={loading} isEmpty={!project} columnCount={2} empty={{ title: "No project", description: "" }}>
        {project && (
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="h6" component="h3">
                {project.title}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <span className="esti-label">
                  {project.ref} · {project.projectType} · {project.jurisdiction}
                </span>
                <StatusDot color="cool-gray" label={project.status} />
              </Stack>
            </Stack>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Stages
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Stage</TableCell>
                    <TableCell>Billing %</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {phases.map((ph) => (
                    <TableRow key={ph.code}>
                      <TableCell>{ph.label}</TableCell>
                      <TableCell>{ph.billingPct}%</TableCell>
                      <TableCell>{ph.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Stack>
        )}
      </DataState>
    </PanelShell>
  );
}

/** Progress tab — issued progress reports (+ optional stage %). */
export function FirmPortalProgressPanel({
  loading,
  reports,
  phases,
}: {
  loading: boolean;
  reports: ProgressRow[];
  phases?: PhaseRow[];
}) {
  return (
    <PanelShell
      title="Progress"
      hint="Phase status and issued progress reports from the firm (hub-published when on hub role)."
    >
      {phases && phases.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
            Stages
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {phases.map((ph) => (
              <Box key={ph.code} sx={{ py: 0.5, px: 1, border: 1, borderColor: "divider", borderRadius: "8px" }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: "block" }}>
                  {ph.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {ph.status} · {ph.billingPct}%
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
      <DataState
        loading={loading}
        isEmpty={!loading && reports.length === 0}
        columnCount={3}
        empty={{
          title: "No progress reports yet",
          description: "Issued period reports will list here once the firm publishes them.",
        }}
      >
        <Stack spacing={1}>
          {reports.map((r) => (
            <Box key={r.id} sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {r.periodStart} → {r.periodEnd}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {r.physicalProgressPct != null ? `${r.physicalProgressPct}% physical · ` : ""}
                {r.openSnagCount != null ? `${r.openSnagCount} open snags · ` : ""}
                {r.status}
              </Typography>
            </Box>
          ))}
        </Stack>
      </DataState>
    </PanelShell>
  );
}

const DRAWING_COLS: GridColDef[] = [
  { field: "ref", headerName: "Ref", flex: 1, minWidth: 120 },
  { field: "title", headerName: "Title", flex: 2, minWidth: 180 },
  { field: "status", headerName: "Status", flex: 0.8, minWidth: 100 },
];

const TX_COLS: GridColDef[] = [
  { field: "ref", headerName: "Ref", flex: 1, minWidth: 120 },
  { field: "purpose", headerName: "Purpose", flex: 2, minWidth: 160 },
  { field: "channel", headerName: "Channel", flex: 1, minWidth: 110 },
  {
    field: "dateIssued",
    headerName: "Issued",
    flex: 1,
    minWidth: 110,
    valueGetter: (v) => v ?? "—",
  },
];

/** Drawings tab — READY drawings + issued transmittals + Shilpi package refs. */
export function FirmPortalDrawingsPanel({
  loading,
  drawings,
  transmittals,
  packages,
}: {
  loading: boolean;
  drawings: DrawingRow[];
  transmittals: TransmittalRow[];
  packages?: Array<{
    id: string;
    title: string;
    drawingPackageId?: string;
    vdbUri?: string;
    updatedAt?: string;
  }>;
}) {
  const pkgs = packages ?? [];
  return (
    <PanelShell title="Drawings" hint="READY drawings, transmittals, and published Shilpi packages.">
      <DataState
        loading={loading}
        isEmpty={!loading && drawings.length === 0 && transmittals.length === 0 && pkgs.length === 0}
        columnCount={3}
        empty={{
          title: "No drawings yet",
          description: "Issued drawing packages and transmittals will appear here.",
        }}
      >
        <Stack spacing={3}>
          {pkgs.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Published packages (Shilpi)
              </Typography>
              <Stack spacing={1}>
                {pkgs.map((p) => (
                  <Box key={p.id} sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {p.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.drawingPackageId ?? p.id}
                      {p.vdbUri ? ` · ${p.vdbUri}` : ""}
                      {p.updatedAt ? ` · ${p.updatedAt}` : ""}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
          {drawings.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Issued drawings
              </Typography>
              <DataGrid rows={drawings} columns={DRAWING_COLS} disableRowSelectionOnClick autoHeight />
            </Box>
          )}
          {transmittals.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Transmittals
              </Typography>
              <DataGrid
                rows={transmittals}
                getRowId={(r) => r.id}
                columns={TX_COLS}
                disableRowSelectionOnClick
                autoHeight
              />
            </Box>
          )}
        </Stack>
      </DataState>
    </PanelShell>
  );
}

/** Documents tab — invoices + approvals + certified RA bills (finals / numbers). */
export function FirmPortalDocumentsPanel({
  loading,
  invoices,
  approvals,
  raBills,
}: {
  loading: boolean;
  invoices: InvoiceRow[];
  approvals: ApprovalRow[];
  raBills?: RaBillRow[];
}) {
  const ra = raBills ?? [];
  const invCols: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 1, minWidth: 120 },
    { field: "documentKind", headerName: "Kind", flex: 1, minWidth: 100 },
    { field: "status", headerName: "Status", flex: 0.8, minWidth: 90 },
    {
      field: "grandTotalPaise",
      headerName: "Amount",
      flex: 1,
      minWidth: 110,
      valueGetter: (v: number | null) => (v != null ? formatINR(v) : "—"),
    },
    { field: "dateInvoice", headerName: "Date", flex: 1, minWidth: 110, valueGetter: (v) => v ?? "—" },
  ];
  const apCols: GridColDef[] = [
    { field: "title", headerName: "Title", flex: 2, minWidth: 160 },
    { field: "entityType", headerName: "Type", flex: 1, minWidth: 100 },
    { field: "status", headerName: "Status", flex: 0.8, minWidth: 90 },
    { field: "sentDate", headerName: "Sent", flex: 1, minWidth: 110, valueGetter: (v) => v ?? "—" },
  ];
  const raCols: GridColDef[] = [
    { field: "ref", headerName: "Ref", flex: 1, minWidth: 120 },
    {
      field: "billNo",
      headerName: "Bill #",
      flex: 0.7,
      minWidth: 80,
      valueGetter: (v: string | number | null) => (v != null && v !== "" ? String(v) : "—"),
    },
    { field: "status", headerName: "Status", flex: 1, minWidth: 110 },
    {
      field: "grossPaise",
      headerName: "Gross",
      flex: 1,
      minWidth: 110,
      valueGetter: (v: number | null) => (v != null ? formatINR(v) : "—"),
    },
    {
      field: "periodEnd",
      headerName: "Period end",
      flex: 1,
      minWidth: 110,
      valueGetter: (v) => v ?? "—",
    },
  ];
  return (
    <PanelShell title="Documents" hint="Issued invoices, approvals, and certified RA bills — finals and numbers only.">
      <DataState
        loading={loading}
        isEmpty={!loading && invoices.length === 0 && approvals.length === 0 && ra.length === 0}
        columnCount={4}
        empty={{
          title: "No documents yet",
          description: "Issued invoices, approvals, and certified RA bills will list here.",
        }}
      >
        <Stack spacing={3}>
          {invoices.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Invoices
              </Typography>
              <DataGrid
                rows={invoices.map((iv, i) => ({ id: `${iv.ref}-${i}`, ...iv }))}
                columns={invCols}
                disableRowSelectionOnClick
                autoHeight
              />
            </Box>
          )}
          {approvals.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Approvals
              </Typography>
              <DataGrid rows={approvals} columns={apCols} disableRowSelectionOnClick autoHeight />
            </Box>
          )}
          {ra.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Certified RA bills
              </Typography>
              <DataGrid
                rows={ra}
                getRowId={(r) => r.id}
                columns={raCols}
                disableRowSelectionOnClick
                autoHeight
              />
            </Box>
          )}
        </Stack>
      </DataState>
    </PanelShell>
  );
}
