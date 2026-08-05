import {
  Button,
  InlineNotification,
  Modal,
  PasswordInput,
  Select,
  SelectItem,
  Stack,
  TextInput,
} from "@carbon/react";
import { Add, Renew } from "@carbon/icons-react";
import {
  ASSIGNABLE_STAFF_ROLES,
  GENERAL_STAFF_ROLES,
  STAFF_ROLE_LABEL,
  STANDARD_LICENCE_LABEL,
  USER_TYPE_LABEL,
  accessLabelForUser,
  isStaffRole,
  userType,
} from "@esti/contracts";
import { useState } from "react";
import { pushToast, useScreenActions } from "@hcw/ui-kit";
import { useAuth } from "../lib/auth.js";
import { CarbonScope } from "../carbon/CarbonScope.js";
import { DataGrid, StatusDot, type GridColDef } from "../carbon/adapters/index.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { trpc } from "../lib/trpc.js";
import { AORMS_PORTALS } from "../lib/product-nomenclature.js";

const ROLE_LABEL: Record<string, string> = {
  ...STAFF_ROLE_LABEL,
  CONSULTANT: "Staff / Consultant",
  CLIENT: "Client",
};

const TYPE_TAG_COLOR: Record<string, "purple" | "gray" | "blue" | "teal" | "cyan"> = {
  COMPANY: "purple",
  STAFF: "gray",
  CLIENT: "blue",
  CONSULTANT: "teal",
  CONTRACTOR: "cyan",
};

const LABEL_STYLE: React.CSSProperties = { margin: 0, color: "var(--cds-text-secondary)" };

export function Users({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const listQ = trpc.users.list.useQuery();
  const invalidate = () => utils.users.list.invalidate();
  const rows = listQ.data ?? [];
  const activeIn = (roles: readonly string[]) =>
    rows.filter((u) => roles.includes(u.role) && !u.disabled).length;
  const seats: Array<{ label: string; used: number }> = [
    { label: "Admin", used: rows.filter((u) => u.role === "OWNER").length },
    { label: "Accountant", used: activeIn(["ACCOUNTANT"]) },
    { label: "HR manager", used: activeIn(["HR_MANAGER"]) },
    { label: "Staff", used: activeIn(GENERAL_STAFF_ROLES) },
  ];
  const roleOptions = ASSIGNABLE_STAFF_ROLES;

  // Optimistic enable/disable (Doherty): flip the row immediately, roll back on
  // error, confirm with a toast (this toggle was previously silent — Nielsen #1).
  const setDisabled = trpc.users.setDisabled.useMutation({
    meta: { errorTitle: "Couldn't change the login state" },
    onMutate: async ({ id, disabled }) => {
      await utils.users.list.cancel();
      const prev = utils.users.list.getData();
      utils.users.list.setData(undefined, (old) =>
        old?.map((u) => (u.id === id ? { ...u, disabled } : u)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.users.list.setData(undefined, ctx.prev);
    },
    onSuccess: (_d, v) =>
      pushToast({ kind: "success", title: v.disabled ? "Login disabled" : "Login enabled" }),
    onSettled: invalidate,
  });
  const setRole = trpc.users.setRole.useMutation({
    onSuccess: () => {
      invalidate();
      setMsg("Role updated");
    },
  });

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<{
    email: string;
    fullName: string;
    password: string;
    role: (typeof ASSIGNABLE_STAFF_ROLES)[number];
  }>({ email: "", fullName: "", password: "", role: "ASSOCIATE" });
  const [msg, setMsg] = useState<string | null>(null);
  const createStaff = trpc.users.createStaff.useMutation({
    meta: { errorTitle: "Couldn't create the staff login" },
    onSuccess: (u) => {
      invalidate();
      setAddOpen(false);
      setForm({ email: "", fullName: "", password: "", role: "ASSOCIATE" });
      setMsg(`Staff login created for ${u.email}`);
    },
  });

  const [reset, setReset] = useState<{ id: string; email: string } | null>(
    null,
  );
  const [resetPw, setResetPw] = useState("");
  const resetPassword = trpc.users.resetPassword.useMutation({
    meta: { errorTitle: "Couldn't reset the password" },
    onSuccess: () => {
      setReset(null);
      setResetPw("");
      setMsg("Password reset");
    },
  });

  // Link a firm login to a central AORMS-U identity (portable person).
  const [link, setLink] = useState<{ id: string; email: string } | null>(null);
  const [linkVal, setLinkVal] = useState("");
  const linkIdentity = trpc.users.linkIdentity.useMutation({
    onSuccess: () => {
      invalidate();
      setLink(null);
      setLinkVal("");
      setMsg("Identity linked");
    },
  });

  // U-4 migration path: one-time (re-runnable) push of every linked login's
  // unified type to the hub, for accounts linked before U-3b shipped.
  const resync = trpc.users.resyncIdentityTypes.useMutation({
    onSuccess: (r) => setMsg(`Synced ${r.synced} of ${r.total} linked identities to the hub`),
    onError: (err) =>
      setMsg(
        err.message === "No identity hub configured"
          ? "No identity hub is configured on this install — nothing to sync."
          : `Sync failed: ${err.message}`,
      ),
  });

  useScreenActions(
    embedded || addOpen || reset !== null || link !== null
      ? []
      : [
          {
            id: "add-staff-login",
            zone: "center",
            tone: "primary",
            label: "Add staff login",
            icon: <Add />,
            onClick: () => setAddOpen(true),
          },
          {
            id: "resync-identity-types",
            zone: "right",
            label: resync.isPending ? "Syncing…" : "Resync identity types",
            icon: <Renew />,
            disabled: resync.isPending,
            onClick: () => resync.mutate(),
          },
        ],
    [embedded, addOpen, reset, link, resync.isPending],
  );

  const createBlockedReason =
    !form.email.trim()
      ? "Enter a login email."
      : form.fullName.trim().length < 2
        ? "Full name must be at least 2 characters."
        : form.password.length < 8
          ? "Temporary password must be at least 8 characters."
          : null;

  const columns: GridColDef[] = [
    { field: "email", headerName: "Email", flex: 1.4, minWidth: 200 },
    { field: "fullName", headerName: "Name", flex: 1, minWidth: 140 },
    {
      field: "type",
      headerName: "Type",
      flex: 1,
      minWidth: 130,
      valueGetter: (_v, row) => USER_TYPE_LABEL[userType(row)],
      renderCell: (p) => {
        const type = userType(p.row);
        return <StatusDot color={TYPE_TAG_COLOR[type] ?? "gray"} label={USER_TYPE_LABEL[type]} />;
      },
    },
    {
      field: "level",
      headerName: "Level",
      flex: 1,
      minWidth: 120,
      valueGetter: (_v, row) => accessLabelForUser(row),
    },
    {
      field: "role",
      headerName: "Role",
      flex: 1.2,
      minWidth: 180,
      sortable: false,
      renderCell: (p) => {
        const u = p.row;
        const isSelf = u.id === user?.id;
        const scope =
          u.role === "CLIENT"
            ? ` (${AORMS_PORTALS.client.label.toLowerCase()})`
            : u.consultantId
              ? ` (${AORMS_PORTALS.consultant.label.toLowerCase()})`
              : "";
        if (!isSelf && u.role !== "OWNER" && !u.clientId && !u.consultantId) {
          return (
            <div style={{ minWidth: 150 }}>
              <Select
                id={`role-${u.id}`}
                labelText="User role"
                hideLabel
                size="sm"
                value={isStaffRole(u.role) ? u.role : "ASSOCIATE"}
                onChange={(e) =>
                  setRole.mutate({
                    id: u.id,
                    role: e.target.value as (typeof ASSIGNABLE_STAFF_ROLES)[number],
                  })
                }
              >
                {roleOptions.map((r) => (
                  <SelectItem key={r} value={r} text={STAFF_ROLE_LABEL[r]} />
                ))}
              </Select>
            </div>
          );
        }
        return (
          <span>
            {ROLE_LABEL[u.role] ?? u.role}
            {scope}
          </span>
        );
      },
    },
    {
      field: "accountPublicId",
      headerName: "AORMS ID",
      flex: 1,
      minWidth: 130,
      valueGetter: (v) => v ?? "—",
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 110,
      valueGetter: (_v, row) => (row.disabled ? "Disabled" : "Active"),
      renderCell: (p) => (
        <StatusDot color={p.row.disabled ? "red" : "green"} label={p.row.disabled ? "Disabled" : "Active"} />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      minWidth: 320,
      flex: 1.6,
      renderCell: (p) => {
        const u = p.row;
        const isSelf = u.id === user?.id;
        return (
          <RowActionsMenu
            actions={[
              { label: "Reset password", onClick: () => setReset({ id: u.id, email: u.email }) },
              {
                label: "Link ID",
                onClick: () => {
                  setLink({ id: u.id, email: u.email });
                  setLinkVal(u.accountPublicId ?? "");
                },
              },
              !isSelf && {
                label: u.disabled ? "Enable" : "Disable",
                onClick: () => setDisabled.mutate({ id: u.id, disabled: !u.disabled }),
              },
            ]}
          />
        );
      },
    },
  ];

  const body = (
    <CarbonScope>
      <Stack gap={5}>
        <Stack gap={3}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h3 className="cds--type-heading-compact-01" style={{ margin: 0 }}>Active logins</h3>
            <StatusDot color="blue" label={STANDARD_LICENCE_LABEL} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
            {seats.map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span className="cds--type-label-01" style={LABEL_STYLE}>{s.label}</span>
                <span className="cds--type-body-01">{s.used} active · Unlimited</span>
              </div>
            ))}
          </div>
        </Stack>

        {msg && (
          <InlineNotification kind="success" lowContrast title="Done" subtitle={msg} onCloseButtonClick={() => setMsg(null)} />
        )}

        <hr style={{ border: 0, borderTop: "1px solid var(--cds-border-subtle)", margin: 0 }} />

        <Stack gap={3}>
          <h3 className="cds--type-heading-compact-01" style={{ margin: 0 }}>Logins</h3>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={listQ.isLoading}
            density="compact"
            rowHeight={52}
            disableRowSelectionOnClick
            hideFooter
            autoHeight
          />
        </Stack>
      </Stack>
    </CarbonScope>
  );

  return (
    <>
      {embedded ? (
        <CarbonScope>
          <div style={{ padding: "0.5rem" }}>
            <Stack gap={5}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <h2 className="cds--type-heading-03" style={{ margin: 0, flex: 1 }}>
                  Users &amp; access
                </h2>
                <Button size="sm" renderIcon={Add} onClick={() => setAddOpen(true)}>
                  Add staff login
                </Button>
                <Button kind="secondary" size="sm" renderIcon={Renew} disabled={resync.isPending} onClick={() => resync.mutate()}>
                  {resync.isPending ? "Syncing…" : "Resync identity types"}
                </Button>
              </div>
              <p className="cds--type-body-01" style={LABEL_STYLE}>
                Owner / staff / portal logins. {AORMS_PORTALS.client.label} and{" "}
                {AORMS_PORTALS.consultant.label.toLowerCase()} logins are created from their records.
              </p>
              {body}
            </Stack>
          </div>
        </CarbonScope>
      ) : (
        <RailLayout
          title="Users & access"
          description={`Owner / staff / portal logins. ${AORMS_PORTALS.client.label} and ${AORMS_PORTALS.consultant.label.toLowerCase()} logins are created from their records (Clients / Consultants).`}
        >
          {body}
        </RailLayout>
      )}

      <CarbonScope>
        <Modal
          open={addOpen}
          size="sm"
          modalHeading="Add staff login"
          primaryButtonText={createStaff.isPending ? "Creating…" : "Create"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={
            !form.email ||
            form.fullName.length < 2 ||
            form.password.length < 8 ||
            createStaff.isPending
          }
          onRequestClose={() => setAddOpen(false)}
          onRequestSubmit={() => createStaff.mutate(form)}
        >
          <Stack gap={5}>
            <p className="cds--type-body-01" style={{ margin: 0 }}>Creates an office staff login at the chosen seniority tier.</p>
            <TextInput
              id="u-name"
              labelText="Full name"
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              helperText="Shown on ID cards and assignments."
              invalid={form.fullName.length > 0 && form.fullName.trim().length < 2}
              invalidText="At least 2 characters."
            />
            <TextInput
              id="u-email"
              labelText="Login email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              helperText={!form.email.trim() ? "Required for sign-in." : undefined}
            />
            <Select
              id="u-role"
              labelText="Role (seniority tier)"
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  role: e.target.value as (typeof ASSIGNABLE_STAFF_ROLES)[number],
                }))
              }
            >
              {roleOptions.map((r) => (
                <SelectItem key={r} value={r} text={STAFF_ROLE_LABEL[r]} />
              ))}
            </Select>
            <PasswordInput
              id="u-pw"
              labelText="Temporary password (min 8 chars)"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              helperText="They can change this after first login."
              invalid={form.password.length > 0 && form.password.length < 8}
              invalidText="Use at least 8 characters."
            />
            {createBlockedReason && !createStaff.isPending && (
              <p className="cds--type-label-01" style={LABEL_STYLE}>{createBlockedReason}</p>
            )}
            {createStaff.error && (
              <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={createStaff.error.message} />
            )}
          </Stack>
        </Modal>

        <Modal
          open={reset !== null}
          size="sm"
          modalHeading={`Reset password — ${reset?.email ?? ""}`}
          primaryButtonText={resetPassword.isPending ? "Saving…" : "Reset"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={resetPw.length < 8 || resetPassword.isPending}
          onRequestClose={() => setReset(null)}
          onRequestSubmit={() => reset && resetPassword.mutate({ id: reset.id, password: resetPw })}
        >
          <PasswordInput
            id="u-reset"
            labelText="New password (min 8 chars)"
            value={resetPw}
            onChange={(e) => setResetPw(e.target.value)}
          />
        </Modal>

        <Modal
          open={link !== null}
          size="sm"
          modalHeading={`Link identity — ${link?.email ?? ""}`}
          primaryButtonText={linkIdentity.isPending ? "Saving…" : "Save"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={linkIdentity.isPending}
          onRequestClose={() => setLink(null)}
          onRequestSubmit={() =>
            link &&
            linkIdentity.mutate({ id: link.id, accountPublicId: linkVal.trim() || null })
          }
        >
          <Stack gap={5}>
            <p className="cds--type-body-01" style={{ margin: 0 }}>
              Link this firm login to a person&apos;s portable AORMS-U identity so their
              certifications and growth follow them. Leave blank to unlink.
            </p>
            <TextInput
              id="u-link"
              labelText="AORMS-U handle"
              placeholder="AORMS-U-2K4P9F"
              value={linkVal}
              onChange={(e) => setLinkVal(e.target.value)}
            />
            {linkIdentity.error && (
              <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={linkIdentity.error.message} />
            )}
          </Stack>
        </Modal>
      </CarbonScope>
    </>
  );
}
