import {
  Alert,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { Close, Filter } from "@carbon/icons-react";
import { useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { CarbonScope } from "../carbon/CarbonScope.js";
import { DataGrid, type GridColDef } from "../carbon/adapters/index.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { trpc } from "../lib/trpc.js";

const PAGE_SIZES = [10, 25, 50, 100];

type Filters = { search: string; entity: string; action: string };

function jsonDetail(value: unknown) {
  return value === null || value === undefined ? "No snapshot recorded" : JSON.stringify(value, null, 2);
}

const fmtTime = (v: string | number | Date) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v));

const PRE_STYLE = {
  margin: 0,
  padding: "0.75rem",
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 12,
  whiteSpace: "pre-wrap" as const,
  overflowX: "auto" as const,
  background: "var(--cds-layer)",
  border: "1px solid var(--cds-border-subtle)",
};

export function AuditLog({ embedded = false }: { embedded?: boolean }) {
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [filters, setFilters] = useState<Filters>({ search: "", entity: "", action: "" });
  const [applied, setApplied] = useState<Filters>(filters);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = trpc.audit.list.useQuery({
    page: paginationModel.page + 1,
    pageSize: paginationModel.pageSize,
    search: applied.search || undefined,
    entity: applied.entity || undefined,
    action: applied.action || undefined,
  });
  const rows = list.data?.rows ?? [];
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  function applyFilters() {
    setPaginationModel((m) => ({ ...m, page: 0 }));
    setApplied(filters);
  }
  function clearFilters() {
    const empty = { search: "", entity: "", action: "" };
    setFilters(empty);
    setApplied(empty);
    setPaginationModel((m) => ({ ...m, page: 0 }));
  }

  useScreenActions(
    embedded
      ? []
      : [
          { id: "clear-filters", zone: "left", tone: "danger", label: "Clear", icon: <Close />, onClick: clearFilters },
          { id: "apply-filters", zone: "right", tone: "primary", label: "Apply filters", icon: <Filter />, onClick: applyFilters },
        ],
    [embedded, filters],
  );

  const columns: GridColDef[] = [
    { field: "createdAt", headerName: "Time", flex: 1.2, minWidth: 160, renderCell: (p) => fmtTime(p.row.createdAt) },
    { field: "entity", headerName: "Entity", flex: 1, minWidth: 120 },
    { field: "action", headerName: "Action", flex: 1, minWidth: 120 },
    {
      field: "actor",
      headerName: "Actor",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => row.actorName ?? row.actorEmail ?? "System",
    },
    { field: "entityId", headerName: "Record ID", flex: 1, minWidth: 120, valueGetter: (v) => v ?? "—" },
    {
      field: "details",
      headerName: "Details",
      sortable: false,
      filterable: false,
      width: 100,
      renderCell: (p) => <RowActionsMenu actions={[{ label: "View", onClick: () => setSelectedId(p.row.id) }]} />,
    },
  ];

  const filterFields = (
    <div
      style={{
        display: "flex",
        flexDirection: embedded ? "row" : "column",
        flexWrap: "wrap",
        gap: "0.75rem",
        alignItems: embedded ? "flex-end" : "stretch",
      }}
    >
      <div style={embedded ? { minWidth: 200, flex: 1 } : undefined}>
        <TextField id="audit-search" label="Search actor, entity, or action" size="small" value={filters.search} onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && applyFilters()} />
      </div>
      <div style={embedded ? { minWidth: 140 } : undefined}>
        <TextField id="audit-entity" label="Entity" size="small" value={filters.entity} onChange={(e) => setFilters((c) => ({ ...c, entity: e.target.value }))} select>
          <MenuItem value="">All entities</MenuItem>
          {(list.data?.filters.entities ?? []).map((entity) => (
            <MenuItem key={entity} value={entity}>{entity}</MenuItem>
          ))}
        </TextField>
      </div>
      <div style={embedded ? { minWidth: 140 } : undefined}>
        <TextField id="audit-action" label="Action" size="small" value={filters.action} onChange={(e) => setFilters((c) => ({ ...c, action: e.target.value }))} select>
          <MenuItem value="">All actions</MenuItem>
          {(list.data?.filters.actions ?? []).map((action) => (
            <MenuItem key={action} value={action}>{action}</MenuItem>
          ))}
        </TextField>
      </div>
      {embedded && (
        <>
          <Button variant="outlined" size="small" startIcon={<Close />} onClick={clearFilters}>
            Clear
          </Button>
          <Button size="small" startIcon={<Filter />} onClick={applyFilters}>
            Apply filters
          </Button>
        </>
      )}
    </div>
  );

  const grid = (
    <>
      {list.error && (
        <Alert severity="error"><AlertTitle>Couldn't load audit log</AlertTitle>{list.error.message}</Alert>
      )}
      <DataGrid
        rows={rows}
        columns={columns}
        loading={list.isLoading}
        rowCount={list.data?.total ?? 0}
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={PAGE_SIZES}
        disableRowSelectionOnClick
        autoHeight
      />
    </>
  );

  return (
    <>
      {embedded ? (
        <CarbonScope>
          <div style={{ padding: "0.5rem" }}>
            <Stack spacing={2.5}>
              <h2 className="cds--type-heading-03" style={{ margin: 0 }}>
                Audit log
              </h2>
              <p className="cds--type-body-01" style={{ margin: 0, color: "var(--cds-text-secondary)" }}>
                Append-only record of security-sensitive and operational changes.
              </p>
              {filterFields}
              {grid}
            </Stack>
          </div>
        </CarbonScope>
      ) : (
        <RailLayout
          title="Audit log"
          description="Append-only record of security-sensitive and operational changes."
          aside={filterFields}
        >
          {grid}
        </RailLayout>
      )}

      <CarbonScope>
        <Dialog open={selected !== null} onClose={() => setSelectedId(null)} fullWidth maxWidth="md">
      <DialogTitle>{selected ? `${selected.entity} · ${selected.action}` : "Audit details"}</DialogTitle>
      <DialogContent>

          {selected && (
            <Stack spacing={2}>
              <p className="cds--type-body-01" style={{ margin: 0 }}>
                Record: {selected.entityId ?? "Not associated with a domain record"}
              </p>
              <p className="cds--type-body-01" style={{ margin: 0 }}>
                Actor: {selected.actorName ?? selected.actorEmail ?? selected.actorId ?? "System"}
              </p>
              {(["before", "after"] as const).map((k) => (
                <Stack spacing={1} key={k}>
                  <p className="cds--type-heading-compact-01" style={{ margin: 0, textTransform: "capitalize" }}>
                    {k}
                  </p>
                  <pre style={PRE_STYLE}>{jsonDetail(selected[k])}</pre>
                </Stack>
              ))}
            </Stack>
          )}
        
      </DialogContent>
    </Dialog>
      </CarbonScope>
    </>
  );
}
