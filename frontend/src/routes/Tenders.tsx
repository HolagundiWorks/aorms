import { Stack, Typography } from "@mui/material";
import { TENDER_STATUS_LABEL, TENDER_STATUS_TAG, type TenderStatus } from "@esti/contracts";
import { Link } from "react-router-dom";
import {
  DataGrid,
  DataState,
  PageBreadcrumb,
  StatusDot,
  type GridColDef,
} from "../carbon/adapters/index.js";
import { RailLayout } from "../components/RailLayout.js";
import { trpc } from "../lib/trpc.js";

/** Office › Tenders — open tenders across projects (detail lives on the project). */
export function Tenders() {
  const listQ = trpc.tenders.listOpen.useQuery();
  const rows = listQ.data ?? [];

  const columns: GridColDef[] = [
    {
      field: "title",
      headerName: "Tender",
      flex: 1.5,
      minWidth: 180,
      renderCell: (p) => <Link to={`/projects/${p.row.projectId}?tab=tenders`}>{p.row.title}</Link>,
    },
    {
      field: "projectRef",
      headerName: "Project",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => `${row.projectRef} — ${row.projectTitle}`,
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (p) => (
        <StatusDot
          color={TENDER_STATUS_TAG[p.row.status as TenderStatus] ?? "gray"}
          label={TENDER_STATUS_LABEL[p.row.status as TenderStatus] ?? p.row.status}
        />
      ),
    },
    {
      field: "dueDate",
      headerName: "Due",
      width: 120,
      valueGetter: (_v, row) => row.dueDate ?? "—",
    },
  ];

  return (
    <RailLayout
      title="Tenders"
      description="Open project tenders — invite contractors; they bid in the contractor portal."
    >
      <PageBreadcrumb items={[{ label: "Office" }, { label: "Tenders" }]} />
      <Stack spacing={2} sx={{ mt: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ m: 0 }}>
          The firm issues tenders. Contractors submit sealed bids via their portal login at
          /login?tab=portals. Create and manage tenders from a project&apos;s Tenders tab.
        </Typography>
        <DataState
          loading={listQ.isLoading}
          isEmpty={rows.length === 0}
          columnCount={4}
          empty={{
            title: "No open tenders",
            description: "Open a project → Tenders to draft and invite contractors.",
          }}
        >
          <DataGrid rows={rows} columns={columns} density="compact" autoHeight hideFooter disableRowSelectionOnClick />
        </DataState>
      </Stack>
    </RailLayout>
  );
}
