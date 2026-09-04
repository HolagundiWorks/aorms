import { Alert, Box, Stack, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Surface } from "@hcw/ui-kit";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

/** Local row shapes — browse payload may lose inference when mongodb types are absent in the FE tsc graph. */
type OpsBrowseTask = {
  taskId: string;
  projectId: string;
  title: string;
  status: string;
  updatedAt: string;
};
type OpsBrowseArtifact = {
  entity: string;
  entityId: string;
  title: string;
  drawingPackageId?: string;
  vdbUri?: string;
  updatedAt: string;
};

/**
 * Online ops DB manager — browse Mongo (or memory) firm ops + hub sync/meta from desktop Flush.
 * Canon: docs/esti/AORMS-SUITE.md · MONGO-OPS.md · PORTAL-SYNC-BRIDGE.md
 * Geometry admin remains ShilpiDB Desktop / hosted shilpid. Does not edit firm.db.
 */
export function OpsDbManager() {
  const statusQ = trpc.mongoOps.status.useQuery();
  const browseQ = trpc.mongoOps.adminBrowse.useQuery();
  const connectorQ = trpc.mongoOps.adminConnectorSummary.useQuery(undefined, {
    retry: false,
  });

  const taskCols: GridColDef[] = [
    { field: "taskId", headerName: "Task", flex: 1, minWidth: 120 },
    { field: "projectId", headerName: "Project", flex: 1.2, minWidth: 140 },
    { field: "title", headerName: "Title", flex: 2, minWidth: 160 },
    { field: "status", headerName: "Status", flex: 0.8, minWidth: 90 },
    { field: "updatedAt", headerName: "Updated", flex: 1.2, minWidth: 140 },
  ];
  const artCols: GridColDef[] = [
    { field: "entity", headerName: "Entity", flex: 1, minWidth: 110 },
    { field: "entityId", headerName: "Id", flex: 1, minWidth: 120 },
    { field: "title", headerName: "Title", flex: 2, minWidth: 160 },
    { field: "drawingPackageId", headerName: "Package", flex: 1, minWidth: 120 },
    { field: "vdbUri", headerName: "vdb", flex: 1.2, minWidth: 140 },
    { field: "updatedAt", headerName: "Updated", flex: 1.2, minWidth: 140 },
  ];
  const syncCols: GridColDef[] = [
    { field: "entity", headerName: "Entity", flex: 1, minWidth: 110 },
    { field: "entityId", headerName: "Id", flex: 1.2, minWidth: 140 },
    { field: "source", headerName: "Source", flex: 1.2, minWidth: 140 },
    { field: "updatedAt", headerName: "Updated", flex: 1.2, minWidth: 140 },
  ];
  const metaCols: GridColDef[] = [
    { field: "seq", headerName: "Seq", width: 80 },
    { field: "entity", headerName: "Entity", flex: 1, minWidth: 110 },
    { field: "entityId", headerName: "Id", flex: 1.2, minWidth: 140 },
    { field: "op", headerName: "Op", width: 90 },
    { field: "stream", headerName: "Stream", width: 90 },
    { field: "updatedAt", headerName: "Updated", flex: 1.2, minWidth: 140 },
  ];

  const browseTasks = (browseQ.data?.tasks ?? []) as OpsBrowseTask[];
  const browseArtifacts = (browseQ.data?.artifacts ?? []) as OpsBrowseArtifact[];
  const tasks = browseTasks.map((t) => ({ id: t.taskId, ...t }));
  const artifacts = browseArtifacts.map((a, i) => ({
    id: `${a.entity}:${a.entityId}:${i}`,
    ...a,
  }));
  const syncRows = (connectorQ.data?.syncRecords ?? []).map((r) => ({ ...r }));
  const metaRows = (connectorQ.data?.metaEvents ?? []).map((r) => ({ ...r }));

  const connectorForbidden = connectorQ.error?.data?.code === "FORBIDDEN";
  const connector = connectorQ.data;

  return (
    <Stack spacing={3} sx={{ p: 2 }}>
      <Stack spacing={0.5}>
        <Typography variant="h4" component="h1">
          Connection manager
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Hub bind status and published Mongo ops (tasks · artifacts) for the office hub.
        </Typography>
      </Stack>

      <Alert severity="info" variant="outlined" sx={{ borderRadius: "8px" }}>
        Store mode: <strong>{statusQ.data?.mode ?? connector?.opsMode ?? "…"}</strong>
        {statusQ.data?.shilpiConfigured || connector?.shilpiConfigured
          ? ` · Shilpi HTTP ${(statusQ.data?.shilpi ?? connector?.shilpi)?.ok ? "up" : "down"} (${(statusQ.data?.shilpi ?? connector?.shilpi)?.url ?? "—"})`
          : " · Shilpi HTTP not configured"}
      </Alert>

      <Surface layer="soft" sx={{ p: 2, borderRadius: "8px" }}>
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
          Desktop connector
        </Typography>
        {connectorForbidden ? (
          <Typography variant="body2" color="text.secondary">
            Connector summary requires firm:admin. Ops browse below still works for staff with write access.
          </Typography>
        ) : connectorQ.isLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading connector status…
          </Typography>
        ) : connectorQ.isError ? (
          <Typography variant="body2" color="text.secondary">
            Could not load connector summary.
          </Typography>
        ) : (
          <Stack spacing={1}>
            <Typography variant="body2" sx={{ fontFamily: "ui-monospace, Consolas, monospace" }}>
              role={connector?.role ?? "—"} · hub=
              {connector?.hubUrl ?? "—(self / ESTI_HUB_URL)"} · hasSyncToken=
              {connector?.hasSyncToken ? "yes" : "no"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {connector?.desktopConnectorHint}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Sync path: office hub → POST /api/sync/meta · /api/ops/* → this page.
            </Typography>
          </Stack>
        )}
      </Surface>

      <Surface layer="soft" sx={{ p: 2, borderRadius: "8px" }}>
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
          Published tasks
        </Typography>
        <DataState
          loading={browseQ.isLoading}
          isEmpty={!browseQ.isLoading && tasks.length === 0}
          columnCount={4}
          empty={{
            title: "No published tasks",
            description: `Publish from office hub tasks. POST /api/ops/tasks also works.`,
          }}
        >
          <Box sx={{ width: "100%" }}>
            <DataGrid rows={tasks} columns={taskCols} autoHeight disableRowSelectionOnClick />
          </Box>
        </DataState>
      </Surface>

      <Surface layer="soft" sx={{ p: 2, borderRadius: "8px" }}>
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
          Published artifacts / drawing packages
        </Typography>
        <DataState
          loading={browseQ.isLoading}
          isEmpty={!browseQ.isLoading && artifacts.length === 0}
          columnCount={4}
          empty={{
            title: "No published packages",
            description: `Publish drawingPackage artifacts via mongoOps.publishDrawingPackage.`,
          }}
        >
          <Box sx={{ width: "100%" }}>
            <DataGrid rows={artifacts} columns={artCols} autoHeight disableRowSelectionOnClick />
          </Box>
        </DataState>
      </Surface>

      {!connectorForbidden && (
        <>
          <Surface layer="soft" sx={{ p: 2, borderRadius: "8px" }}>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              Hub sync records
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Recent esti_sync_record rows for this firm (artifact-side hub store).
            </Typography>
            <DataState
              loading={connectorQ.isLoading}
              isEmpty={!connectorQ.isLoading && syncRows.length === 0}
              columnCount={4}
              empty={{
                title: "No sync records yet",
                description: `Sync records from office hub (POST /api/sync/ingest).`,
              }}
            >
              <Box sx={{ width: "100%" }}>
                <DataGrid rows={syncRows} columns={syncCols} autoHeight disableRowSelectionOnClick />
              </Box>
            </DataState>
          </Surface>

          <Surface layer="soft" sx={{ p: 2, borderRadius: "8px" }}>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              Hub meta events
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Recent esti_meta_event rows (desktop meta Flush / connect.ping smoke).
            </Typography>
            <DataState
              loading={connectorQ.isLoading}
              isEmpty={!connectorQ.isLoading && metaRows.length === 0}
              columnCount={5}
              empty={{
                title: "No meta events yet",
                description: `Enqueue test meta from office hub.`,
              }}
            >
              <Box sx={{ width: "100%" }}>
                <DataGrid rows={metaRows} columns={metaCols} autoHeight disableRowSelectionOnClick />
              </Box>
            </DataState>
          </Surface>
        </>
      )}
    </Stack>
  );
}
