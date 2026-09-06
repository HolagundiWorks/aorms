import { Column, Grid, InlineNotification, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { UserRoleSelect } from "../../../components/aorms/UserRoleSelect";
import { UserDisabledToggle } from "../../../components/aorms/UserDisabledToggle";

/**
 * Staff user management — this repo's own module map calls out
 * `Users.tsx | User management (firm:admin)` and `web/` never had a page
 * for it at all. RLS (`profiles: owner manages`) only allows OWNER to
 * UPDATE any profile, so this page gates itself the same way, matching
 * the actual DB permission rather than a looser page-level check.
 *
 * Inviting a brand-new staff member isn't built here — that needs
 * Supabase Auth admin's `inviteUserByEmail` (a service-role operation),
 * flagged as a follow-up. `profiles` also has no email column (that lives
 * in `auth.users`, not exposed via the public API), so full name is the
 * only identifier shown.
 */
export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: myProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  const isOwner = myProfile?.role === "OWNER";

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, disabled")
    .order("full_name");

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Users</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Staff directory — role and access. Inviting a new staff member isn&apos;t built here yet.
        </p>

        {!isOwner && (
          <InlineNotification
            kind="info"
            title="Read-only"
            subtitle="Only the firm owner can change roles or disable accounts — you can still see the directory."
            hideCloseButton
            lowContrast
            style={{ marginBottom: "1.5rem" }}
          />
        )}

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load users: {error.message}
          </p>
        ) : (
          <Table aria-label="Users" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Role</TableHeader>
                <TableHeader>Status</TableHeader>
                {isOwner && <TableHeader>Actions</TableHeader>}
              </TableRow>
            </TableHead>
            <TableBody>
              {(profiles ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.full_name || "—"}</TableCell>
                  <TableCell>
                    {isOwner ? <UserRoleSelect userId={p.id} role={p.role} /> : p.role}
                  </TableCell>
                  <TableCell>
                    <Tag type={p.disabled ? "red" : "green"} size="sm">
                      {p.disabled ? "Disabled" : "Active"}
                    </Tag>
                  </TableCell>
                  {isOwner && (
                    <TableCell>
                      <UserDisabledToggle userId={p.id} disabled={p.disabled} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {(profiles ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={isOwner ? 4 : 3}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No users found.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Column>
    </Grid>
  );
}
