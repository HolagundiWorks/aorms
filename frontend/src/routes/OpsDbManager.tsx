import { Alert, Box, Stack, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Surface } from "@hcw/ui-kit";
import { DataState } from "../components/DataState.js";
import { trpc } from "../lib/trpc.js";

/**
 * Online ops DB manager — browse Mongo (or memory) firm ops documents.
 * Canon: docs/esti/AORMS-SUITE.md · MONGO-OPS.md
 * Geometry admin remains ShilpiDB Desktop / hosted shilpid.
 */
export function OpsDbManager() {
  const statusQ = trpc.mongoOps.status.useQuery();
  const browseQ = trpc.mongoOps.adminBrowse.useQuery();

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

  const tasks = (browseQ.data?.tasks ?? []).map((t) => ({ id: t.taskId, ...t }));
  const artifacts = (browseQ.data?.artifacts ?? []).map((a, i) => ({
    id: `${a.entity}:${a.entityId}:${i}`,
    ...a,
  }));

  return (
    <Stack spacing={3} sx={{ p: 2 }}>
      <Stack spacing={0.5}>
        <Typography variant="h4" component="h1">
          Ops DB manager
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Firm-scoped Mongo ops (tasks · published artifacts). Geometry stays in ShilpiDB.
        </Typography>
      </Stack>

      <Alert severity="info" variant="outlined" sx={{ borderRadius: "8px" }}>
        Store mode: <strong>{statusQ.data?.mode ?? "…"}</strong>
        {statusQ.data?.shilpiConfigured
          ? ` · Shilpi HTTP ${statusQ.data.shilpi.ok ? "up" : "down"} (${statusQ.data.shilpi.url})`
          : " · Shilpi HTTP not configured"}
      </Alert>

      <Surface layer="soft" sx={{ p: 2, borderRadius: "8px" }}>
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
          Published tasks
        </Typography>
        <DataState
          loading={browseQ.isLoading}
          isEmpty={!browseQ.isLoading && tasks.length === 0}
          columnCount={4}
          empty={{ title: "No published tasks", description: "Publish from AStudio Tasks or POST /api/ops/tasks." }}
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
            description: "Publish drawingPackage artifacts from desktop or mongoOps.publishDrawingPackage.",
          }}
        >
          <Box sx={{ width: "100%" }}>
            <DataGrid rows={artifacts} columns={artCols} autoHeight disableRowSelectionOnClick />
          </Box>
        </DataState>
      </Surface>
    </Stack>
  );
}
