import { Column, Grid, InlineNotification, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { AddStaffInviteForm } from "../../../components/aorms/AddStaffInviteForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { UserRoleSelect } from "../../../components/aorms/UserRoleSelect";
import { UserDisabledToggle } from "../../../components/aorms/UserDisabledToggle";
import { MyNameEditor } from "../../../components/aorms/MyNameEditor";
import { MyCalendarFeedButton } from "../../../components/aorms/MyCalendarFeedButton";

/**
 * Staff user management — this repo's own module map calls out
 * `Users.tsx | User management (firm:admin)` and `web/` never had a page
 * for it at all. RLS (`profiles: owner manages`) only allows OWNER to
 * UPDATE any profile, so this page gates itself the same way, matching
 * the actual DB permission rather than a looser page-level check.
 *
 * Inviting a brand-new staff member (2026-09-08, portal-invites.ts) uses
 * Supabase Auth admin's `inviteUserByEmail` — this app never sees or sets
 * a password, the invited person sets their own via the emailed link.
 * `profiles` has no email column (that lives in `auth.users`, not exposed
 * via the public API), so full name is the only identifier shown for
 * existing rows.
 *
 * "Edit my own name" (2026-09-08, migration 0031) is a genuinely separate
 * permission path from the isOwner gate above — RLS never let *anyone*,
 * OWNER included, self-edit their own row (`profiles: owner manages` only
 * covers updating someone *else's*), so `MyNameEditor` renders on the
 * signed-in user's own row regardless of role.
 *
 * Explicitly scoped to STAFF_ROLES (2026-09-08) — found live while
 * verifying the new portal-login provisioning: a freshly-invited
 * CONTRACTOR/CONSULTANT profile showed up in this "staff directory" too
 * (no role filter existed before, since no non-staff role had ever
 * reached `profiles` this way), and its role rendered through
 * `UserRoleSelect` as "OWNER" — Carbon's `Select` falls back to its first
 * `SelectItem` when the given `role` isn't one of the options it renders
 * (ASSIGNABLE_STAFF_ROLES never included CONTRACTOR/CONSULTANT/CLIENT),
 * which visually misrepresented the real stored role and risked an owner
 * unknowingly promoting a portal login to real staff access via that
 * dropdown. The real fix is filtering this page's own query to the roles
 * it's actually meant to manage — portal users have their own login
 * status shown on /contractors and /consultants instead.
 *
 * "My calendar feed" (2026-09-09, migration 0033) closes Phase 5's own
 * flagged gap — the `.ics` workload subscription Route Handler
 * (`/api/calendar/[token]`) was deliberately deferred when the dashboard
 * shipped. Same self-service-on-my-own-row placement as MyNameEditor.
 *
 * "Invite a staff member" moved into the AORMS left context-panel pattern
 * (2026-09-09) — was a permanently inline form above the table before.
 */
const STAFF_ROLES = ["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE", "VIEWER", "SITE_SUPERVISOR"];
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
    .in("role", STAFF_ROLES)
    .order("full_name");

  const rows = profiles ?? [];
  const activeCount = rows.filter((p) => !p.disabled).length;
  const ownerCount = rows.filter((p) => p.role === "OWNER").length;

  return (
    <ContextPanelLayout>
      {isOwner && (
        <ContextPanel title="Invite staff member" description="Send a staff sign-in invitation by email.">
          <AddStaffInviteForm />
        </ContextPanel>
      )}
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Users"
              description="Staff directory — role and access."
              actions={isOwner ? <ContextPanelTrigger size="sm">Invite staff member</ContextPanelTrigger> : undefined}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total staff" value={rows.length} />
              <KpiTile label="Active" value={activeCount} />
              <KpiTile label="Owners" value={ownerCount} />
            </div>

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
                    <TableHeader>My calendar feed</TableHeader>
                    {isOwner && <TableHeader>Actions</TableHeader>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(profiles ?? []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.id === user?.id ? <MyNameEditor initialName={p.full_name} /> : p.full_name || "—"}</TableCell>
                      <TableCell>
                        {isOwner ? <UserRoleSelect userId={p.id} role={p.role} /> : p.role}
                      </TableCell>
                      <TableCell>
                        <Tag type={p.disabled ? "red" : "green"} size="sm">
                          {p.disabled ? "Disabled" : "Active"}
                        </Tag>
                      </TableCell>
                      <TableCell>{p.id === user?.id ? <MyCalendarFeedButton /> : "—"}</TableCell>
                      {isOwner && (
                        <TableCell>
                          <UserDisabledToggle userId={p.id} disabled={p.disabled} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {(profiles ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isOwner ? 5 : 4}>
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
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
