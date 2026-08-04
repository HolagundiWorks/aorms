import { Button, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { ATTENDANCE_STATUS, type AttendanceStatusCode } from "@esti/contracts";
import { useEffect, useState } from "react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { DataGrid, DataState, StatusDot, type GridColDef } from "../../carbon/adapters/index.js";
import { RowActionsMenu } from "../RowActionsMenu.js";
import { trpc } from "../../lib/trpc.js";
import { toISO } from "./workHelpers.js";

const STATUS_TAG: Record<AttendanceStatusCode, "green" | "red" | "blue" | "teal" | "gray"> = {
  PRESENT: "green",
  ABSENT: "red",
  HALF_DAY: "teal",
  WFH: "blue",
  ON_LEAVE: "gray",
};

export function AttendanceTab() {
  const utils = trpc.useUtils();
  const [date, setDate] = useState(() => toISO(new Date()));
  const registerQ = trpc.attendance.dayRegister.useQuery({ date });
  const [draft, setDraft] = useState<Record<string, AttendanceStatusCode>>({});

  useEffect(() => {
    const next: Record<string, AttendanceStatusCode> = {};
    for (const row of registerQ.data?.rows ?? []) {
      if (row.status) next[row.teamMemberId] = row.status as AttendanceStatusCode;
    }
    setDraft(next);
  }, [registerQ.data]);

  const mark = trpc.attendance.mark.useMutation({
    meta: { errorTitle: "Couldn't mark the attendance" },
    onSuccess: () => {
      utils.attendance.dayRegister.invalidate({ date });
      utils.dashboard.attendanceToday.invalidate();
    },
  });

  const saveAll = trpc.attendance.markDay.useMutation({
    meta: { errorTitle: "Couldn't save the attendance register" },
    onSuccess: () => {
      utils.attendance.dayRegister.invalidate({ date });
      utils.dashboard.attendanceToday.invalidate();
    },
  });

  const rows = registerQ.data?.rows ?? [];

  const statusFor = (teamMemberId: string, rowStatus: string | null | undefined): AttendanceStatusCode =>
    draft[teamMemberId] ?? (rowStatus as AttendanceStatusCode | undefined) ?? "PRESENT";

  const columns: GridColDef[] = [
    { field: "memberName", headerName: "Member", flex: 1.2, minWidth: 160 },
    { field: "memberRole", headerName: "Role", flex: 1, minWidth: 120 },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      minWidth: 170,
      sortable: false,
      filterable: false,
      renderCell: (p) => {
        const status = statusFor(p.row.teamMemberId as string, p.row.status as string | null);
        return (
          <div style={{ minWidth: 150 }}>
            <Select
              id={`att-${p.row.teamMemberId}`}
              labelText="Status"
              hideLabel
              size="sm"
              value={status}
              onChange={(e) =>
                setDraft((d) => ({ ...d, [p.row.teamMemberId as string]: e.target.value as AttendanceStatusCode }))
              }
            >
              {(Object.keys(ATTENDANCE_STATUS) as AttendanceStatusCode[]).map((k) => (
                <SelectItem key={k} value={k} text={ATTENDANCE_STATUS[k]} />
              ))}
            </Select>
          </div>
        );
      },
    },
    {
      field: "actions",
      headerName: "",
      flex: 1,
      minWidth: 190,
      sortable: false,
      filterable: false,
      renderCell: (p) => {
        const status = statusFor(p.row.teamMemberId as string, p.row.status as string | null);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <StatusDot color={STATUS_TAG[status]} label={ATTENDANCE_STATUS[status]} />
            <RowActionsMenu
              actions={[
                {
                  label: "Save",
                  disabled: mark.isPending,
                  onClick: () => mark.mutate({ teamMemberId: p.row.teamMemberId as string, attendanceDate: date, status }),
                },
              ]}
            />
          </div>
        );
      },
    },
  ];

  return (
    <CarbonScope>
      <Stack gap={5}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <TextInput
              id="att-date"
              labelText="Date"
              type="date"
              size="sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <Button
            kind="secondary"
            disabled={saveAll.isPending || rows.length === 0}
            onClick={() =>
              saveAll.mutate({
                date,
                entries: rows.map((r) => ({
                  teamMemberId: r.teamMemberId,
                  status: draft[r.teamMemberId] ?? "PRESENT",
                })),
              })
            }
          >
            Save register
          </Button>
        </div>
        <p className="cds--type-body-01" style={{ margin: 0 }}>
          Daily office attendance — present, absent, half-day, WFH, or on leave. Architecture firms
          use a simple register, not hourly timesheets.
        </p>

        <DataState
          loading={registerQ.isLoading}
          isEmpty={rows.length === 0}
          columnCount={4}
          empty={{ title: "No team members", description: "Add staff in Team before marking attendance." }}
        >
          <div>
            <p className="cds--type-heading-compact-01" style={{ margin: "0 0 0.5rem" }}>{`Attendance · ${date}`}</p>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(r) => r.teamMemberId}
              getRowHeight={() => "auto"}
              density="compact"
              disableRowSelectionOnClick
              hideFooter
              autoHeight
            />
          </div>
        </DataState>
      </Stack>
    </CarbonScope>
  );
}
