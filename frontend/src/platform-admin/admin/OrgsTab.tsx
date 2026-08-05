import { useEffect, useState } from "react";
import {
  Button,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Stack,
  TextInput,
} from "@carbon/react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { DataGrid, StatusDot, type GridColDef } from "../../carbon/adapters/index.js";
import { trpc } from "../lib/trpc";

type Orgs = Awaited<ReturnType<typeof trpc.admin.orgs.list.query>>;
type Members = Awaited<ReturnType<typeof trpc.admin.orgs.members.query>>;

const STATUS_TAG: Record<string, string> = {
  ACTIVE: "green",
  INVITED: "teal",
  LEFT: "gray",
};

export default function OrgsTab() {
  const [orgs, setOrgs] = useState<Orgs>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [loginDomain, setLoginDomain] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Member management for one org.
  const [manage, setManage] = useState<{ id: string; name: string } | null>(null);
  const [members, setMembers] = useState<Members>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);
  // Issue a portable certification to a member.
  const [certWho, setCertWho] = useState("");
  const [certTitle, setCertTitle] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [certNote, setCertNote] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; slug: string } | null>(
    null,
  );
  const [deleteSlug, setDeleteSlug] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function load() {
    setOrgs(await trpc.admin.orgs.list.query());
  }
  useEffect(() => {
    void load();
  }, []);

  async function openMembers(org: { id: string; name: string }) {
    setManage(org);
    setMemberError(null);
    setInviteEmail("");
    setMembers(await trpc.admin.orgs.members.query({ orgId: org.id }));
  }

  async function reloadMembers() {
    if (manage) setMembers(await trpc.admin.orgs.members.query({ orgId: manage.id }));
  }

  async function setStatus(accountId: string, status: "ACTIVE" | "LEFT") {
    if (!manage) return;
    await trpc.admin.orgs.setMemberStatus.mutate({ orgId: manage.id, accountId, status });
    await reloadMembers();
  }

  async function invite() {
    if (!manage) return;
    setMemberError(null);
    try {
      await trpc.admin.orgs.inviteMember.mutate({ orgId: manage.id, email: inviteEmail });
      setInviteEmail("");
      await reloadMembers();
    } catch (e) {
      setMemberError((e as Error).message);
    }
  }

  async function issueCert() {
    setCertNote(null);
    if (!certWho || !certTitle) return;
    try {
      await trpc.admin.certifications.issue.mutate({
        accountPublicId: certWho,
        title: certTitle,
        issuer: certIssuer || undefined,
      });
      setCertTitle("");
      setCertIssuer("");
      setCertNote("Certification issued.");
    } catch (e) {
      setCertNote((e as Error).message);
    }
  }

  const certifiable = members.filter((m) => m.publicId);

  async function create() {
    setError(null);
    try {
      await trpc.admin.orgs.create.mutate({
        name,
        slug: slug || undefined,
        billingEmail: email || undefined,
        loginDomain: loginDomain || undefined,
      });
      setOpen(false);
      setName("");
      setSlug("");
      setEmail("");
      setLoginDomain("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeOrg() {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await trpc.admin.orgs.remove.mutate({ orgId: deleteTarget.id, confirmSlug: deleteSlug });
      setDeleteTarget(null);
      setDeleteSlug("");
      if (manage?.id === deleteTarget.id) setManage(null);
      await load();
    } catch (e) {
      setDeleteError((e as Error).message);
    }
  }

  const orgColumns: GridColDef<Orgs[number]>[] = [
    { field: "name", headerName: "Name", flex: 1.2, minWidth: 160 },
    {
      field: "publicId",
      headerName: "AORMS ID",
      flex: 1,
      minWidth: 140,
      valueGetter: (v) => v ?? "—",
    },
    {
      field: "loginDomain",
      headerName: "Login domain",
      flex: 1,
      minWidth: 140,
      valueGetter: (v) => v ?? "—",
    },
    { field: "slug", headerName: "Slug", flex: 1, minWidth: 120 },
    {
      field: "billingEmail",
      headerName: "Billing email",
      flex: 1.2,
      minWidth: 180,
      valueGetter: (v) => v ?? "—",
    },
    {
      field: "members",
      headerName: "Members",
      sortable: false,
      filterable: false,
      width: 130,
      renderCell: (p) => (
        <Button kind="ghost" size="sm" onClick={() => openMembers({ id: p.row.id, name: p.row.name })}>
          Manage
        </Button>
      ),
    },
    {
      field: "delete",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 100,
      renderCell: (p) => (
        <Button
          kind="danger--ghost"
          size="sm"
          onClick={() => {
            setDeleteError(null);
            setDeleteSlug("");
            setDeleteTarget({ id: p.row.id, name: p.row.name, slug: p.row.slug });
          }}
        >
          Delete
        </Button>
      ),
    },
  ];

  const memberColumns: GridColDef<Members[number]>[] = [
    { field: "email", headerName: "Email", flex: 1.4, minWidth: 180 },
    {
      field: "publicId",
      headerName: "AORMS ID",
      flex: 1,
      minWidth: 140,
      valueGetter: (v) => v ?? "—",
    },
    { field: "role", headerName: "Role", flex: 0.8, minWidth: 110 },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => (
        <StatusDot color={STATUS_TAG[p.row.status] ?? "gray"} label={p.row.status} />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 180,
      renderCell: (p) => (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {p.row.status !== "ACTIVE" && (
            <Button kind="ghost" size="sm" onClick={() => setStatus(p.row.accountId, "ACTIVE")}>
              Approve
            </Button>
          )}
          {p.row.status !== "LEFT" && (
            <Button kind="ghost" size="sm" onClick={() => setStatus(p.row.accountId, "LEFT")}>
              Remove
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <CarbonScope>
      <Stack gap={5}>
        <div>
          <Button onClick={() => setOpen(true)}>New organization</Button>
        </div>

        <DataGrid
          rows={orgs}
          columns={orgColumns}
          getRowId={(r) => r.id}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />

        <Modal
          open={open}
          size="sm"
          modalHeading="New organization"
          primaryButtonText="Create"
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!name}
          onRequestClose={() => setOpen(false)}
          onRequestSubmit={create}
        >
          <Stack gap={5}>
            <TextInput id="org-name" labelText="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <TextInput id="org-slug" labelText="Slug (optional — derived from name)" value={slug} onChange={(e) => setSlug(e.target.value)} />
            <TextInput id="org-email" labelText="Billing email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextInput
              id="org-login-domain"
              labelText="Login domain (optional)"
              placeholder="acme.in"
              helperText="Lets members sign in by typing this domain at Step 1."
              value={loginDomain}
              onChange={(e) => setLoginDomain(e.target.value)}
            />
            {error && <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={error} />}
          </Stack>
        </Modal>

        <Modal
          open={manage !== null}
          size="lg"
          passiveModal
          modalHeading={`Members — ${manage?.name ?? ""}`}
          onRequestClose={() => setManage(null)}
        >
          <Stack gap={5}>
            <DataGrid
              rows={members}
              columns={memberColumns}
              getRowId={(r) => r.accountId}
              density="compact"
              disableRowSelectionOnClick
              hideFooter
              autoHeight
            />

            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
              <div style={{ flex: 1 }}>
                <TextInput
                  id="invite-email"
                  labelText="Invite an existing account by email"
                  placeholder="person@firm.in"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <Button kind="secondary" disabled={!inviteEmail} onClick={invite}>
                Invite
              </Button>
            </div>
            {memberError && (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Couldn't invite"
                subtitle={memberError === "account_not_found"
                  ? "No account with that email — they must sign up first."
                  : memberError}
              />
            )}

            <Stack gap={3}>
              <h3 className="cds--type-heading-compact-01" style={{ margin: 0 }}>Issue a certification</h3>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <Select id="cert-who" labelText="To member" value={certWho} onChange={(e) => setCertWho(e.target.value)}>
                    <SelectItem value="" text="Select a member…" />
                    {certifiable.map((m) => (
                      <SelectItem key={m.accountId} value={m.publicId ?? ""} text={m.email} />
                    ))}
                  </Select>
                </div>
                <div style={{ flex: 1 }}>
                  <TextInput id="cert-title" labelText="Title" placeholder="Registered Architect" value={certTitle} onChange={(e) => setCertTitle(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <TextInput id="cert-issuer" labelText="Issuer (optional)" placeholder="Council of Architecture" value={certIssuer} onChange={(e) => setCertIssuer(e.target.value)} />
                </div>
                <Button kind="secondary" disabled={!certWho || !certTitle} onClick={issueCert}>
                  Issue
                </Button>
              </div>
              {certNote && <InlineNotification kind="info" lowContrast hideCloseButton title="Certification" subtitle={certNote} />}
            </Stack>
          </Stack>
        </Modal>

        <Modal
          open={deleteTarget !== null}
          size="sm"
          danger
          modalHeading="Delete organization"
          primaryButtonText="Delete workspace"
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!deleteTarget || deleteSlug !== deleteTarget.slug}
          onRequestClose={() => setDeleteTarget(null)}
          onRequestSubmit={removeOrg}
        >
          <Stack gap={5}>
            <p className="cds--type-body-01" style={{ margin: 0 }}>
              Permanently delete <strong>{deleteTarget?.name}</strong> and revoke all licences,
              members, and API keys for this workspace. This cannot be undone.
            </p>
            <TextInput
              id="delete-slug"
              labelText={`Type slug to confirm: ${deleteTarget?.slug ?? ""}`}
              value={deleteSlug}
              onChange={(e) => setDeleteSlug(e.target.value)}
            />
            {deleteError && <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={deleteError} />}
          </Stack>
        </Modal>
      </Stack>
    </CarbonScope>
  );
}
