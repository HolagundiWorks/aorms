/**
 * P7.2 — manual India usage billing: list reports, export CSV, mark billed.
 */
import { useEffect, useState } from "react";
import {
  Button,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  TextArea,
  TextInput,
} from "@carbon/react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { DataGrid, StatusDot, type GridColDef } from "../../carbon/adapters/index.js";
import { RowActionsMenu } from "../../components/RowActionsMenu.js";
import { trpc } from "../lib/trpc";

type Rows = Awaited<ReturnType<typeof trpc.admin.usageReports.list.query>>;

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export default function UsageReportsTab() {
  const [periodStart, setPeriodStart] = useState(currentPeriod);
  const [billed, setBilled] = useState<"all" | "billed" | "unbilled">("all");
  const [rows, setRows] = useState<Rows>([]);
  const [error, setError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [suspendFor, setSuspendFor] = useState<string | null>(null);
  const [suspendNote, setSuspendNote] = useState("");

  async function load() {
    setError(null);
    try {
      setRows(await trpc.admin.usageReports.list.query({ periodStart, billed }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
  }, [periodStart, billed]);

  async function exportCsv() {
    setError(null);
    try {
      const res = await trpc.admin.usageReports.exportCsv.query({ periodStart, billed });
      downloadCsv(res.filename, res.csv);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function markBilled() {
    if (!noteFor) return;
    setError(null);
    try {
      await trpc.admin.usageReports.markBilled.mutate({
        id: noteFor,
        billingNote: note.trim() || undefined,
      });
      setNoteFor(null);
      setNote("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function markUnbilled(id: string) {
    await trpc.admin.usageReports.markUnbilled.mutate({ id });
    await load();
  }

  async function suspendForNonPayment() {
    if (!suspendFor) return;
    setError(null);
    try {
      await trpc.admin.usageReports.suspendForNonPayment.mutate({
        usageReportId: suspendFor,
        note: suspendNote.trim() || undefined,
      });
      setSuspendFor(null);
      setSuspendNote("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const columns: GridColDef<Rows[number]>[] = [
    { field: "orgName", headerName: "Organization", flex: 1.2, minWidth: 160 },
    { field: "productCode", headerName: "Product", flex: 0.8, minWidth: 100 },
    {
      field: "storageUsedBytes",
      headerName: "Storage used",
      flex: 1,
      minWidth: 120,
      renderCell: (p) => fmtBytes(p.row.storageUsedBytes),
    },
    {
      field: "aiTokensThisMonth",
      headerName: "AI tokens",
      flex: 0.8,
      minWidth: 100,
      valueGetter: (_v, row) => row.aiTokensThisMonth,
    },
    {
      field: "billedAt",
      headerName: "Billing",
      flex: 1,
      minWidth: 140,
      renderCell: (p) =>
        p.row.billedAt ? (
          <StatusDot color="green" label={`Billed ${new Date(p.row.billedAt).toLocaleDateString()}`} />
        ) : (
          <StatusDot color="teal" label="Unbilled" />
        ),
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 70,
      align: "right",
      renderCell: (p) => (
        <RowActionsMenu
          actions={[
            !p.row.billedAt && {
              label: "Mark billed…",
              onClick: () => {
                setNoteFor(p.row.id);
                setNote("");
              },
            },
            !!p.row.billedAt && {
              label: "Clear billed mark",
              onClick: () => void markUnbilled(p.row.id),
            },
            {
              label: "Suspend for non-payment…",
              onClick: () => {
                setSuspendFor(p.row.id);
                setSuspendNote(`Non-payment — ${p.row.orgName} · ${p.row.periodStart}`);
              },
              danger: true,
            },
          ]}
        />
      ),
    },
  ];

  return (
    <CarbonScope>
      <Stack gap={5}>
        <p className="cds--type-body-01" style={{ margin: 0, color: "var(--cds-text-secondary)" }}>
          Manual India invoice path — export CSV for offline GST billing, then mark rows billed.
          Stripe is not wired.
        </p>
        {error && <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={error} />}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", flexWrap: "wrap" }}>
          <TextInput
            id="ur-period"
            size="sm"
            type="date"
            labelText="Period start"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
          />
          <div style={{ minWidth: 140 }}>
            <Select
              id="ur-filter"
              size="sm"
              labelText="Filter"
              value={billed}
              onChange={(e) => setBilled(e.target.value as typeof billed)}
            >
              <SelectItem value="all" text="All" />
              <SelectItem value="unbilled" text="Unbilled" />
              <SelectItem value="billed" text="Billed" />
            </Select>
          </div>
          <div style={{ flex: 1 }} />
          <Button kind="secondary" size="sm" onClick={() => void exportCsv()}>
            Export CSV
          </Button>
        </div>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          density="compact"
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50]}
          paginationModel={{ page: 0, pageSize: 25 }}
          autoHeight
        />

        <Modal
          open={!!noteFor}
          size="xs"
          modalHeading="Mark usage billed"
          primaryButtonText="Mark billed"
          secondaryButtonText="Cancel"
          onRequestClose={() => setNoteFor(null)}
          onRequestSubmit={() => void markBilled()}
        >
          <TextInput
            id="ur-note"
            labelText="Billing note (invoice ref)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. INV-2026-07-014"
          />
        </Modal>

        <Modal
          open={!!suspendFor}
          size="xs"
          danger
          modalHeading="Suspend for non-payment"
          primaryButtonText="Suspend licence"
          secondaryButtonText="Cancel"
          onRequestClose={() => setSuspendFor(null)}
          onRequestSubmit={() => void suspendForNonPayment()}
        >
          <Stack gap={4}>
            <p className="cds--type-body-01" style={{ margin: 0, color: "var(--cds-text-secondary)" }}>
              Sets the org&apos;s product licence to SUSPENDED. The workspace blocks writes on its
              next licence refresh. Reinstate from Licences when payment clears.
            </p>
            <TextArea
              id="ur-suspend-note"
              labelText="Note"
              value={suspendNote}
              onChange={(e) => setSuspendNote(e.target.value)}
              rows={2}
            />
          </Stack>
        </Modal>
      </Stack>
    </CarbonScope>
  );
}
