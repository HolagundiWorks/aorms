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

type Keys = Awaited<ReturnType<typeof trpc.admin.apiKeys.list.query>>;
type Products = Awaited<ReturnType<typeof trpc.admin.products.list.query>>;
type Orgs = Awaited<ReturnType<typeof trpc.admin.orgs.list.query>>;

export default function ApiKeysTab() {
  const [keys, setKeys] = useState<Keys>([]);
  const [products, setProducts] = useState<Products>([]);
  const [orgs, setOrgs] = useState<Orgs>([]);
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [orgId, setOrgId] = useState("");
  const [label, setLabel] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setKeys(await trpc.admin.apiKeys.list.query());
  }
  useEffect(() => {
    void load();
    void trpc.admin.products.list.query().then((p) => {
      setProducts(p);
      if (p[0]) setProductId(p[0].id);
    });
    void trpc.admin.orgs.list.query().then(setOrgs);
  }, []);

  async function generate() {
    setError(null);
    try {
      const r = await trpc.admin.apiKeys.generate.mutate({
        productId,
        label,
        orgId: orgId || null,
      });
      setGenerated(r.apiKey);
      setLabel("");
      setOrgId("");
      setOpen(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function revoke(id: string) {
    await trpc.admin.apiKeys.revoke.mutate({ id });
    await load();
  }

  const columns: GridColDef<Keys[number]>[] = [
    { field: "productCode", headerName: "Product", flex: 1, minWidth: 140 },
    {
      field: "orgName",
      headerName: "Org",
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: (p) =>
        p.row.orgName ? (
          <StatusDot color="blue" label={p.row.orgName} />
        ) : (
          <StatusDot color="gray" label="Product-wide" />
        ),
    },
    { field: "label", headerName: "Label", flex: 1.2, minWidth: 160 },
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
      field: "lastUsedAt",
      headerName: "Last used",
      flex: 1.2,
      minWidth: 180,
      renderCell: (p) =>
        p.row.lastUsedAt ? new Date(p.row.lastUsedAt).toLocaleString() : "—",
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 110,
      renderCell: (p) =>
        p.row.status === "ACTIVE" ? (
          <Button kind="danger--ghost" size="sm" onClick={() => revoke(p.row.id)}>
            Revoke
          </Button>
        ) : null,
    },
  ];

  return (
    <CarbonScope>
      <Stack gap={5}>
        <div>
          <Button
            onClick={() => {
              setGenerated(null);
              setError(null);
              setOpen(true);
            }}
          >
            Generate API key
          </Button>
        </div>

        {generated && (
          <InlineNotification
            kind="success"
            lowContrast
            title="API key created"
            subtitle={`Copy it now (shown once): ${generated}`}
            onCloseButtonClick={() => setGenerated(null)}
          />
        )}

        <DataGrid
          rows={keys}
          columns={columns}
          getRowId={(r) => r.id}
          density="compact"
          disableRowSelectionOnClick
          hideFooter
          autoHeight
        />

        <Modal
          open={open}
          size="sm"
          modalHeading="Generate API key"
          primaryButtonText="Generate"
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!productId || !label}
          onRequestClose={() => setOpen(false)}
          onRequestSubmit={generate}
        >
          <Stack gap={5}>
            <Select id="ak-product" labelText="Product" value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id} text={p.name} />
              ))}
            </Select>
            <Select
              id="ak-org"
              labelText="Bind to organization"
              helperText="Recommended for a per-install key — it can then only act for this customer. Leave as product-wide only for a shared/legacy key."
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            >
              <SelectItem value="" text="Product-wide (no org binding)" />
              {orgs.map((o) => (
                <SelectItem key={o.id} value={o.id} text={o.name} />
              ))}
            </Select>
            <TextInput id="ak-label" labelText="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
            {error && <InlineNotification kind="error" lowContrast hideCloseButton title="Error" subtitle={error} />}
          </Stack>
        </Modal>
      </Stack>
    </CarbonScope>
  );
}
