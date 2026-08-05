import { useEffect, useState } from "react";
import {
  ACCOUNT_STATUS_LABEL,
  type AccountSignupProfile,
  type AccountStatus,
} from "@esti/contracts";
import {
  Button,
  InlineNotification,
  Modal,
  Stack,
  TextInput,
} from "@carbon/react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { DataGrid, StatusDot, type GridColDef } from "../../carbon/adapters/index.js";
import { trpc } from "../lib/trpc";

type AccountRow = {
  id: string;
  publicId: string | null;
  email: string;
  name: string | null;
  status: AccountStatus;
  profile: AccountSignupProfile | null;
  isPlatformAdmin: boolean;
  createdAt: Date | string;
  suspendedAt: Date | string | null;
};

const fmt = (d: Date | string) => new Date(d).toLocaleDateString();

const statusColor: Record<AccountStatus, string> = {
  ACTIVE: "green",
  SUSPENDED: "red",
  DELETED: "gray",
};

function suggestPassword(len = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => chars[n % chars.length]).join("");
}

function profileField(
  profile: AccountSignupProfile | null | unknown,
  key: keyof AccountSignupProfile,
): string {
  if (!profile || typeof profile !== "object") return "—";
  const v = (profile as AccountSignupProfile)[key];
  return typeof v === "string" && v.trim() ? v : "—";
}

/** Manual account support: search, password reset, suspend/reactivate, delete. */
export default function AccountsTab() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [search, setSearch] = useState("");
  const [reset, setReset] = useState<{ email: string } | null>(null);
  const [remove, setRemove] = useState<AccountRow | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function load(q?: string) {
    const rows = await trpc.admin.accounts.list.query({ search: q || undefined });
    setAccounts(rows as AccountRow[]);
  }
  useEffect(() => {
    void load();
  }, []);

  async function doSearch(e: React.FormEvent) {
    e.preventDefault();
    await load(search);
  }

  function openReset(email: string) {
    setReset({ email });
    setNewPassword(suggestPassword());
    setNote(null);
  }

  async function doReset() {
    if (!reset) return;
    setBusy(true);
    try {
      await trpc.admin.accounts.resetPassword.mutate({ email: reset.email, newPassword });
      setNote({
        kind: "success",
        text: `Password reset for ${reset.email}. Send them this password manually: ${newPassword}`,
      });
      setReset(null);
    } catch (e) {
      setNote({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(row: AccountRow, status: "ACTIVE" | "SUSPENDED") {
    setBusy(true);
    setNote(null);
    try {
      await trpc.admin.accounts.setStatus.mutate({ accountId: row.id, status });
      setNote({
        kind: "success",
        text:
          status === "SUSPENDED"
            ? `Suspended ${row.email}. Licences for their owned companies are paused.`
            : `Reactivated ${row.email}.`,
      });
      await load(search);
    } catch (e) {
      setNote({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function doRemove() {
    if (!remove) return;
    setBusy(true);
    try {
      await trpc.admin.accounts.remove.mutate({
        accountId: remove.id,
        confirmEmail,
      });
      setNote({ kind: "success", text: `Deleted account ${remove.email}.` });
      setRemove(null);
      setConfirmEmail("");
      await load(search);
    } catch (e) {
      setNote({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const columns: GridColDef<AccountRow>[] = [
    { field: "email", headerName: "Email", flex: 1.3, minWidth: 180 },
    {
      field: "firmName",
      headerName: "Firm",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => profileField(row.profile, "firmName"),
    },
    {
      field: "mobile",
      headerName: "Mobile",
      flex: 0.9,
      minWidth: 120,
      valueGetter: (_v, row) => profileField(row.profile, "mobile"),
    },
    {
      field: "publicId",
      headerName: "AORMS ID",
      flex: 0.9,
      minWidth: 120,
      valueGetter: (v) => v ?? "—",
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => (
        <StatusDot color={statusColor[p.row.status]} label={ACCOUNT_STATUS_LABEL[p.row.status]} />
      ),
    },
    {
      field: "isPlatformAdmin",
      headerName: "Role",
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      renderCell: (p) =>
        p.row.isPlatformAdmin ? (
          <StatusDot color="purple" label="Platform admin" />
        ) : null,
    },
    {
      field: "createdAt",
      headerName: "Created",
      flex: 0.7,
      minWidth: 100,
      renderCell: (p) => fmt(p.row.createdAt),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 280,
      renderCell: (p) => {
        const row = p.row;
        if (row.status === "DELETED") return null;
        return (
          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
            <Button kind="ghost" size="sm" onClick={() => openReset(row.email)}>
              Reset PW
            </Button>
            {row.status === "ACTIVE" && !row.isPlatformAdmin && (
              <Button kind="ghost" size="sm" onClick={() => setStatus(row, "SUSPENDED")}>
                Suspend
              </Button>
            )}
            {row.status === "SUSPENDED" && (
              <Button kind="ghost" size="sm" onClick={() => setStatus(row, "ACTIVE")}>
                Reactivate
              </Button>
            )}
            {!row.isPlatformAdmin && (
              <Button
                kind="danger--ghost"
                size="sm"
                onClick={() => {
                  setRemove(row);
                  setConfirmEmail("");
                  setNote(null);
                }}
              >
                Delete
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <CarbonScope>
      <Stack gap={5}>
        {note && (
          <InlineNotification kind={note.kind} lowContrast title={note.kind === "error" ? "Error" : "Done"} subtitle={note.text} onCloseButtonClick={() => setNote(null)} />
        )}

        <form onSubmit={doSearch}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <TextInput
                id="account-search"
                labelText="Search accounts"
                placeholder="email · AORMS-U · firm · mobile"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" kind="secondary" disabled={busy}>
              Search
            </Button>
          </div>
        </form>

        <DataGrid
          rows={accounts.filter((a) => a.status !== "DELETED")}
          columns={columns}
          getRowId={(r) => r.id}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />

        <Modal
          open={reset !== null}
          size="sm"
          modalHeading={`Reset password — ${reset?.email ?? ""}`}
          primaryButtonText={busy ? "Saving…" : "Reset"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={newPassword.length < 8 || busy}
          onRequestClose={() => setReset(null)}
          onRequestSubmit={doReset}
        >
          <Stack gap={5}>
            <p className="cds--type-body-01" style={{ margin: 0 }}>
              Sets a new password immediately. Copy it and send it to the person yourself —
              this does not email them automatically.
            </p>
            <TextInput
              id="reset-pw"
              labelText="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Pre-filled with a random password — edit if you prefer your own."
            />
          </Stack>
        </Modal>

        <Modal
          open={remove !== null}
          size="sm"
          danger
          modalHeading="Delete account"
          primaryButtonText={busy ? "Deleting…" : "Delete account"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={
            busy ||
            !remove ||
            confirmEmail.trim().toLowerCase() !== remove.email.toLowerCase()
          }
          onRequestClose={() => setRemove(null)}
          onRequestSubmit={doRemove}
        >
          <Stack gap={5}>
            <p className="cds--type-body-01" style={{ margin: 0 }}>
              Soft-deletes <strong>{remove?.email}</strong>, revokes their licences, and frees the
              email for a future signup. Type the account email to confirm.
            </p>
            <TextInput
              id="confirm-email"
              labelText="Confirm email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
            />
          </Stack>
        </Modal>
      </Stack>
    </CarbonScope>
  );
}
