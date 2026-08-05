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
import { licensingPlanLabel } from "@esti/contracts";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { DataGrid, StatusDot, type GridColDef } from "../../carbon/adapters/index.js";
import { RowActionsMenu } from "../../components/RowActionsMenu.js";
import { trpc } from "../lib/trpc";

type Licenses = Awaited<ReturnType<typeof trpc.admin.licenses.list.query>>;
type Orgs = Awaited<ReturnType<typeof trpc.admin.orgs.list.query>>;
type Products = Awaited<ReturnType<typeof trpc.admin.products.list.query>>;
type Detail = Awaited<ReturnType<typeof trpc.admin.licenses.get.query>>;

const STATUS_TAG: Record<string, string> = {
  ACTIVE: "green",
  TRIAL: "teal",
  SUSPENDED: "cool-gray",
  REVOKED: "red",
  EXPIRED: "gray",
};
const fmtDate = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString() : "—");
const toIso = (yyyymmdd: string) =>
  yyyymmdd ? new Date(`${yyyymmdd}T00:00:00.000Z`).toISOString() : null;

export default function LicensesTab() {
  const [licenses, setLicenses] = useState<Licenses>([]);
  const [orgs, setOrgs] = useState<Orgs>([]);
  const [products, setProducts] = useState<Products>([]);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [productId, setProductId] = useState("");
  const [planId, setPlanId] = useState("");
  const [expires, setExpires] = useState("");

  const [extendId, setExtendId] = useState<string | null>(null);
  const [extendDate, setExtendDate] = useState("");

  const [detail, setDetail] = useState<Detail | null>(null);

  async function load() {
    setLicenses(await trpc.admin.licenses.list.query());
  }
  useEffect(() => {
    void load();
    void trpc.admin.orgs.list.query().then((o) => {
      setOrgs(o);
      if (o[0]) setOrgId(o[0].id);
    });
    void trpc.admin.products.list.query().then((p) => {
      setProducts(p);
      if (p[0]) {
        setProductId(p[0].id);
        if (p[0].plans[0]) setPlanId(p[0].plans[0].id);
      }
    });
  }, []);

  const selectedProduct = products.find((p) => p.id === productId);
  const plansForProduct = selectedProduct?.plans ?? [];
  const singlePlan = selectedProduct?.code === "AORMS" || plansForProduct.length <= 1;

  useEffect(() => {
    const p = products.find((x) => x.id === productId);
    if (p?.plans[0]) setPlanId(p.plans[0].id);
  }, [productId, products]);

  async function create() {
    setError(null);
    try {
      const lic = await trpc.admin.licenses.create.mutate({
        orgId,
        productId,
        planId,
        expiresAt: toIso(expires),
      });
      setCreateOpen(false);
      setExpires("");
      setNewKey(lic.key);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function setStatus(licenseId: string, status: "ACTIVE" | "SUSPENDED" | "REVOKED") {
    await trpc.admin.licenses.setStatus.mutate({ licenseId, status });
    await load();
  }

  async function doExtend() {
    if (!extendId) return;
    await trpc.admin.licenses.extend.mutate({ licenseId: extendId, expiresAt: toIso(extendDate) });
    setExtendId(null);
    setExtendDate("");
    await load();
  }

  async function openDetail(licenseId: string) {
    setDetail(await trpc.admin.licenses.get.query({ licenseId }));
  }

  async function deactivateDevice(deviceRowId: string, licenseId: string) {
    await trpc.admin.licenses.deactivateDevice.mutate({ deviceRowId });
    setDetail(await trpc.admin.licenses.get.query({ licenseId }));
  }

  const columns: GridColDef<Licenses[number]>[] = [
    { field: "key", headerName: "Key", flex: 1.4, minWidth: 200 },
    { field: "orgName", headerName: "Organization", flex: 1.2, minWidth: 160 },
    { field: "productCode", headerName: "Product", flex: 1, minWidth: 120 },
    {
      field: "planCode",
      headerName: "Plan",
      flex: 1,
      minWidth: 140,
      valueGetter: () => licensingPlanLabel(),
      renderCell: () => licensingPlanLabel(),
    },
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
      field: "expiresAt",
      headerName: "Expires",
      flex: 1,
      minWidth: 120,
      renderCell: (p) => fmtDate(p.row.expiresAt),
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
            { label: "Details", onClick: () => void openDetail(p.row.id) },
            {
              label: "Extend / set expiry…",
              onClick: () => {
                setExtendId(p.row.id);
                setExtendDate("");
              },
            },
            { label: "Reinstate (Active)", onClick: () => void setStatus(p.row.id, "ACTIVE") },
            { label: "Suspend", onClick: () => void setStatus(p.row.id, "SUSPENDED") },
            { label: "Revoke", onClick: () => void setStatus(p.row.id, "REVOKED"), danger: true },
          ]}
        />
      ),
    },
  ];

  const deviceColumns: GridColDef<Detail["devices"][number]>[] = [
    { field: "deviceId", headerName: "Device", flex: 1.2, minWidth: 160 },
    { field: "name", headerName: "Name", flex: 1, minWidth: 120, valueGetter: (v) => v ?? "—" },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      minWidth: 110,
      renderCell: (p) => (
        <StatusDot color={p.row.status === "ACTIVE" ? "green" : "red"} label={p.row.status} />
      ),
    },
    {
      field: "lastSeenAt",
      headerName: "Last seen",
      flex: 1.2,
      minWidth: 160,
      renderCell: (p) => (p.row.lastSeenAt ? new Date(p.row.lastSeenAt).toLocaleString() : "—"),
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 130,
      renderCell: (p) =>
        p.row.status === "ACTIVE" && detail ? (
          <Button
            kind="danger--ghost"
            size="sm"
            onClick={() => deactivateDevice(p.row.id, detail.license.id)}
          >
            Deactivate
          </Button>
        ) : null,
    },
  ];

  const eventColumns: GridColDef<Detail["events"][number]>[] = [
    {
      field: "at",
      headerName: "When",
      flex: 1.2,
      minWidth: 180,
      renderCell: (p) => new Date(p.row.at).toLocaleString(),
    },
    { field: "type", headerName: "Event", flex: 1, minWidth: 140 },
    { field: "actor", headerName: "Actor", flex: 1, minWidth: 140, valueGetter: (v) => v ?? "—" },
  ];

  return (
    <CarbonScope>
      <Stack gap={5}>
        <div>
          <Button
            onClick={() => {
              setNewKey(null);
              setError(null);
              setCreateOpen(true);
            }}
          >
            New license
          </Button>
        </div>

        {newKey && (
          <InlineNotification kind="success" lowContrast title="License created" subtitle={`Key: ${newKey}`} onCloseButtonClick={() => setNewKey(null)} />
        )}

        <DataGrid
          rows={licenses}
          columns={columns}
          getRowId={(r) => r.id}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />

        <Modal
          open={createOpen}
          size="sm"
          modalHeading="New license"
          primaryButtonText="Create"
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!orgId || !productId || !planId}
          onRequestClose={() => setCreateOpen(false)}
          onRequestSubmit={create}
        >
          <Stack gap={5}>
            <Select id="lic-org" labelText="Organization" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              {orgs.map((o) => (
                <SelectItem key={o.id} value={o.id} text={o.name} />
              ))}
            </Select>
            <Select id="lic-product" labelText="Product" value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id} text={p.name} />
              ))}
            </Select>
            {singlePlan ? (
              <p className="cds--type-body-01" style={{ margin: 0, color: "var(--cds-text-secondary)" }}>
                Plan: {licensingPlanLabel()}
              </p>
            ) : (
              <Select id="lic-plan" labelText="Plan" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                {plansForProduct.map((pl) => (
                  <SelectItem key={pl.id} value={pl.id} text={pl.name} />
                ))}
              </Select>
            )}
            <TextInput
              id="lic-expires"
              type="date"
              labelText="Expires (optional — blank = perpetual)"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
            {error && <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={error} />}
          </Stack>
        </Modal>

        <Modal
          open={extendId !== null}
          size="sm"
          modalHeading="Extend / set expiry"
          primaryButtonText="Save"
          secondaryButtonText="Cancel"
          onRequestClose={() => setExtendId(null)}
          onRequestSubmit={doExtend}
        >
          <TextInput
            id="ext-date"
            type="date"
            labelText="New expiry (blank = perpetual)"
            value={extendDate}
            onChange={(e) => setExtendDate(e.target.value)}
          />
        </Modal>

        <Modal
          open={detail !== null}
          size="lg"
          passiveModal
          modalHeading={detail ? `License ${detail.license.key}` : ""}
          onRequestClose={() => setDetail(null)}
        >
          {detail && (
            <Stack gap={6}>
              <Stack gap={3}>
                <h4 className="cds--type-heading-03" style={{ margin: 0 }}>Devices</h4>
                <DataGrid
                  rows={detail.devices}
                  columns={deviceColumns}
                  getRowId={(r) => r.id}
                  density="compact"
                  disableRowSelectionOnClick
                  hideFooter
                  autoHeight
                />
              </Stack>

              <Stack gap={3}>
                <h4 className="cds--type-heading-03" style={{ margin: 0 }}>Event log</h4>
                <DataGrid
                  rows={detail.events}
                  columns={eventColumns}
                  getRowId={(r) => r.id}
                  density="compact"
                  disableRowSelectionOnClick
                  hideFooter
                  autoHeight
                />
              </Stack>
            </Stack>
          )}
        </Modal>
      </Stack>
    </CarbonScope>
  );
}
